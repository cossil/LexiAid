# backend/graphs/document_understanding_agent/utils/doc_ai_parsers.py
import uuid
from typing import Dict, Any, Optional, List

def get_text_from_text_anchor(doc_ai_text: str, text_anchor: Dict) -> str:
    """Extracts text segments from the Document AI 'text' field based on a textAnchor."""
    if not doc_ai_text or not text_anchor or not text_anchor.get('textSegments'):
        return ""
    
    content = ""
    for text_segment in text_anchor['textSegments']:
        # Ensure start and end indices are integers
        start_index = int(text_segment.get('startIndex', 0))
        end_index = int(text_segment.get('endIndex', 0))
        content += doc_ai_text[start_index:end_index]
    return content

def get_normalized_bounding_box(entity: Dict) -> Optional[Dict]:
    """Extracts normalized bounding box from a Document AI entity."""
    if entity.get('layout') and entity['layout'].get('boundingPoly') and entity['layout']['boundingPoly'].get('normalizedVertices'):
        page_ref = entity['layout'].get('pageAnchor', {}).get('pageRefs', [{}])[0]
        page_number = int(page_ref.get('page', 0)) # Document AI pages are 0-indexed
        return {
            "page_number": page_number, 
            "vertices": entity['layout']['boundingPoly']['normalizedVertices']
        }
    return None

def calculate_union_bbox(bboxes: List[Dict]) -> Optional[Dict]:
    """Calculates the union of a list of normalized bounding boxes.
       Assumes bboxes are dicts with 'x_min', 'y_min', 'x_max', 'y_max'.
       This helper was previously _calculate_union_bbox and used for block-aggregated tables.
       The input bboxes for this specific function would need to be pre-calculated min/max values if 
       coming directly from Document AI's normalizedVertices.
       Or, adapt to take list of Document AI style bboxes directly.
       For now, keeping structure similar to original if it was fed pre-processed bboxes.
       Let's assume it receives bboxes already converted to x_min, y_min, x_max, y_max.
       If using normalizedVertices directly, this function would need adaptation.
       However, the current `graph.py` uses it with `block_bbox` which are already in the correct format.
    """
    if not bboxes:
        return None

    valid_bboxes = [b for b in bboxes if b and all(k in b for k in ['vertices'])]
    if not valid_bboxes: # Or if vertices aren't in expected format
        print("Warning: calculate_union_bbox received no valid bboxes with 'vertices'.")
        return None

    # Assuming vertices are lists of {"x": float, "y": float}
    all_x = [v['x'] for bbox in valid_bboxes for v in bbox['vertices'] if 'x' in v]
    all_y = [v['y'] for bbox in valid_bboxes for v in bbox['vertices'] if 'y' in v]

    if not all_x or not all_y:
        return None

    min_x = min(all_x)
    min_y = min(all_y)
    max_x = max(all_x)
    max_y = max(all_y)
    
    # Reconstruct vertices for the union box (optional, could also return min/max)
    # For consistency with get_normalized_bounding_box, let's return vertices
    union_vertices = [
        {"x": min_x, "y": min_y},
        {"x": max_x, "y": min_y},
        {"x": max_x, "y": max_y},
        {"x": min_x, "y": max_y},
    ]

    # Attempt to get page_number from the first valid bbox
    page_num = valid_bboxes[0].get('page_number') if valid_bboxes else 0 # Default to page 0 if not found

    return {
        'page_number': page_num,
        'vertices': union_vertices
    }

def parse_doc_ai_table_direct(doc_ai_table_layout: Dict, doc_ai_text_content: str, page_idx: int) -> tuple[Optional[Dict], set]:
    """
    Directly parses a Document AI table structure from page.tables.
    Returns a structured table element and a set of consumed block IDs.
    """
    table_bbox_from_docai = get_normalized_bounding_box(doc_ai_table_layout)
    parsed_header_rows = []
    parsed_body_rows = []
    consumed_block_ids = set()
    
    docai_table_block_id_ref = doc_ai_table_layout.get('layout',{}).get('block_id_ref') # block_id_ref for the table itself
    log_table_id_for_debug = docai_table_block_id_ref if docai_table_block_id_ref else str(uuid.uuid4())


    def _process_doc_ai_table_rows_internal(doc_ai_rows: List[Dict], is_header_row_type_flag: bool) -> List[Dict]:
        output_rows = []
        if not doc_ai_rows:
            return output_rows

        for r_idx, doc_ai_row_data in enumerate(doc_ai_rows):
            row_id = str(uuid.uuid4())
            cells_in_row = []
            
            row_layout = doc_ai_row_data.get('layout', {})
            row_block_id_ref = row_layout.get('block_id_ref')
            if row_block_id_ref:
                consumed_block_ids.add(row_block_id_ref)
            
            doc_ai_cells = doc_ai_row_data.get('cells', [])
            for c_idx, cell_data in enumerate(doc_ai_cells):
                cell_id = str(uuid.uuid4())
                cell_layout = cell_data.get('layout', {})
                cell_text_anchor = cell_layout.get('textAnchor')
                cell_text = get_text_from_text_anchor(doc_ai_text_content, cell_text_anchor)
                
                cell_block_id_ref = cell_layout.get('block_id_ref')
                if cell_block_id_ref:
                    consumed_block_ids.add(cell_block_id_ref)
                
                # Document AI schema for v1 sometimes has 'blockId' directly on cell layout.
                cell_direct_block_id = cell_layout.get('blockId')
                if cell_direct_block_id:
                    consumed_block_ids.add(cell_direct_block_id)

                row_span = cell_data.get('rowSpan', 1) or 1
                col_span = cell_data.get('colSpan', 1) or 1
                
                cells_in_row.append({
                    "id": cell_id,
                    "text": cell_text.strip() if cell_text else "",
                    "row_span": row_span,
                    "col_span": col_span,
                    "is_header": is_header_row_type_flag
                })
            output_rows.append({
                "id": row_id,
                "cells": cells_in_row
            })
        return output_rows

    try:
        parsed_header_rows = _process_doc_ai_table_rows_internal(doc_ai_table_layout.get('headerRows', []), is_header_row_type_flag=True)
        parsed_body_rows = _process_doc_ai_table_rows_internal(doc_ai_table_layout.get('bodyRows', []), is_header_row_type_flag=False)

        table_element_direct = {
            "id": str(uuid.uuid4()),
            "type": "table",
            "title": None, 
            "header_rows": parsed_header_rows,
            "body_rows": parsed_body_rows,
            "footer_rows": [], 
            "summary": None,   
            "bounding_box_norm": table_bbox_from_docai,
            "annotations": []
        }
        
        # Add the table's own block_id_ref (if it exists)
        if docai_table_block_id_ref:
            consumed_block_ids.add(docai_table_block_id_ref)
        
        return table_element_direct, consumed_block_ids
    
    except Exception as e:
        print(f"    ERROR: Unexpected error directly parsing DocAI table (Log ID for debug: {log_table_id_for_debug}, Page: {page_idx +1}): {e}")
        import traceback
        print(traceback.format_exc())
        return None, consumed_block_ids


def assemble_llm_classified_rows_into_table(collected_rows_data: List[Dict], page_number: int) -> Optional[Dict]:
    """Assembles collected table row data (from LLM-classified blocks) into a single table element."""
    if not collected_rows_data:
        return None

    table_id = str(uuid.uuid4())
    header_rows = []
    body_rows = []
    all_row_bboxes_for_union = []

    for row_data in collected_rows_data:
        cells_for_schema = []
        for llm_cell in row_data.get('cells', []): # 'cells' from LLM classification
            cells_for_schema.append({
                "id": llm_cell.get('id', str(uuid.uuid4())), 
                "text": llm_cell.get('text', ''),
                "row_span": llm_cell.get('row_span', 1),
                "col_span": llm_cell.get('col_span', 1),
                "is_header": row_data.get('is_header', False)
            })
        
        row_element_for_schema = {
            "id": str(uuid.uuid4()), 
            "cells": cells_for_schema
        }

        if row_data.get('is_header'):
            header_rows.append(row_element_for_schema)
        else:
            body_rows.append(row_element_for_schema)
        
        if row_data.get('bbox'): # This 'bbox' is the block_bbox
            all_row_bboxes_for_union.append(row_data['bbox'])

    # The calculate_union_bbox function needs to handle bboxes with 'vertices'
    # The 'bbox' stored in row_data (which is `block_bbox`) is already in the correct format 
    # with 'page_number' and 'vertices'.
    union_bbox = calculate_union_bbox(all_row_bboxes_for_union)
    # Original _assemble_rows_into_table used 'page_idx', but `block_bbox` should contain `page_number`.
    # The `calculate_union_bbox` now attempts to use the page_number from the first bbox.

    return {
        "id": table_id,
        "type": "table",
        "title": None, 
        "header_rows": header_rows,
        "body_rows": body_rows,
        "footer_rows": [],
        "bounding_box_norm": union_bbox,
        "annotations": []
    }