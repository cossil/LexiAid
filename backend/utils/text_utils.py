"""
Text processing utilities for the AI Tutor application.
"""
import re
import logging
from typing import Optional

def sanitize_text_for_tts(text: str) -> str:
    """
    Sanitizes text by removing Markdown formatting characters and other non-speech elements
    that shouldn't be read aloud by TTS. Preserves paragraph structure by independently
    processing each paragraph, then rejoining with proper paragraph breaks.
    
    Args:
        text: The input text that may contain Markdown formatting
        
    Returns:
        The sanitized text with Markdown formatting removed and paragraph structure preserved
    """
    if not text:
        return text

    # Step 1: Split the text into paragraphs immediately (identified by 2+ consecutive newlines)
    paragraphs = re.split(r'\n{2,}', text)
    
    # Log input information
    real_paragraph_count = len([p for p in paragraphs if p.strip()])
    logging.debug(f"TTS_TRACE: SANITIZER INPUT - Total length: {len(text)}, Paragraph count: {real_paragraph_count}")
    logging.debug(f"TTS_TRACE: SANITIZER INPUT - First 100 chars: {text[:100].replace('\n', '[NEWLINE]')}")
    logging.debug(f"TTS_TRACE: SANITIZER INPUT - Last 100 chars: {text[-100:].replace('\n', '[NEWLINE]')}")
    
    # Step 2: Initialize the list for sanitized paragraphs
    sanitized_paragraphs = []
    
    # Step 3: Process each paragraph independently
    for i, paragraph in enumerate(paragraphs):
        # Skip empty paragraphs
        if not paragraph.strip():
            continue
            
        # Sanitize this individual paragraph
        clean_paragraph = paragraph
        
        # Remove code blocks (triple backticks and content between them)
        clean_paragraph = re.sub(r'```[\s\S]*?```', '', clean_paragraph)
        
        # Remove inline code (single backticks)
        clean_paragraph = re.sub(r'`([^`]+)`', r'\1', clean_paragraph)
        
        # Remove headers (starting with #, ##, etc.)
        clean_paragraph = re.sub(r'^#+\s*', '', clean_paragraph, flags=re.MULTILINE)
        
        # Remove emphasis (bold, italic, strikethrough)
        clean_paragraph = re.sub(r'[*_~]{1,3}([^*_~]+)[*_~]{1,3}', r'\1', clean_paragraph)
        
        # Remove links but keep the link text: [text](url) -> text
        clean_paragraph = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', clean_paragraph)
        
        # Remove images and other media: ![alt](url)
        clean_paragraph = re.sub(r'!\[[^\]]*\]\([^)]+\)', '', clean_paragraph)
        
        # Remove blockquotes (lines starting with >)
        clean_paragraph = re.sub(r'^>\s*', '', clean_paragraph, flags=re.MULTILINE)
        
        # Remove HTML tags if any
        clean_paragraph = re.sub(r'<[^>]+>', '', clean_paragraph)
        
        # Remove footnotes and reference-style links: [^1], [1], etc.
        clean_paragraph = re.sub(r'\[\^?[0-9]+\]', '', clean_paragraph)
        
        # Remove horizontal rules (---, ***, ___)
        clean_paragraph = re.sub(r'^[-*_]{3,}\s*$', '', clean_paragraph, flags=re.MULTILINE)
        
        # Replace single newlines with spaces (within the paragraph)
        clean_paragraph = clean_paragraph.replace('\n', ' ')
        
        # Normalize all whitespace (multiple spaces to single space)
        clean_paragraph = re.sub(r'\s+', ' ', clean_paragraph)
        
        # Final trim to remove any leading/trailing whitespace
        clean_paragraph = clean_paragraph.strip()
        
        # Only add non-empty paragraphs
        if clean_paragraph:
            sanitized_paragraphs.append(clean_paragraph)
            
            # Log sample paragraphs for debugging
            if i < 3 or i > len(paragraphs) - 4 or len(paragraphs) < 10:
                preview = clean_paragraph[:50] + '...' if len(clean_paragraph) > 50 else clean_paragraph
                logging.debug(f"TTS_TRACE: SANITIZER PARAGRAPH [{i}/{len(paragraphs)}]: {preview}")
    
    # Step 4: Join the sanitized paragraphs with double newlines
    result = '\n\n'.join(sanitized_paragraphs)
    
    # Log detailed output information
    result_paragraphs = re.split(r'\n{2,}', result)
    real_paragraph_count = len([p for p in result_paragraphs if p.strip()])
    logging.debug(f"TTS_TRACE: SANITIZER OUTPUT - Total length: {len(result)}, Paragraph count: {real_paragraph_count}")
    logging.debug(f"TTS_TRACE: SANITIZER OUTPUT - First 100 chars: {result[:100].replace('\n', '[NEWLINE]')}")
    logging.debug(f"TTS_TRACE: SANITIZER OUTPUT - Last 100 chars: {result[-100:].replace('\n', '[NEWLINE]')}")
    
    # Log truncated full content for debugging
    max_log_length = min(5000, len(result))
    logging.debug(f"TTS_TRACE: Sanitizer returning text. Length: {len(result)}. Content: {result[:max_log_length]}")
    
    return result
