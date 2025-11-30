"""
Text-to-Speech Service for AI Tutor Application

This module provides a wrapper around Google Cloud Text-to-Speech
for converting text to speech audio.
"""
# START DIAGNOSTIC CODE
import sys
print("--- DIAGNOSTIC: START ---")
print("Python Executable:", sys.executable)
print("System Path:")
for path in sys.path:
    print(f"  - {path}")

try:
    import google.cloud.texttospeech as tts
    print("Successfully imported google.cloud.texttospeech")
    print("Module location:", tts.__file__)
except ImportError as e:
    print("Failed to import google.cloud.texttospeech:", e)
except Exception as e:
    print("An unexpected error occurred during import:", e)

print("--- DIAGNOSTIC: END ---")
# END DIAGNOSTIC CODE


import io
import os
import re
import logging
from google.cloud import texttospeech_v1beta1 as texttospeech
from google.oauth2 import service_account
from dotenv import load_dotenv
from pydub import AudioSegment
from backend.utils.text_utils import sanitize_text_for_tts

# Load environment variables
load_dotenv()

class TTSServiceError(Exception):
    """Custom exception for TTSService errors."""
    pass

class TTSService:
    """Service for converting text to speech using Google Cloud Text-to-Speech API"""
    
    _instance = None
    
    def __new__(cls):
        """Singleton pattern to ensure only one TTS connection"""
        if cls._instance is None:
            cls._instance = super(TTSService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def is_functional(self) -> bool:
        """Check if the TTS client is initialized and functional."""
        return self.client is not None
    
    def _initialize(self):
        """Initialize Text-to-Speech client and configuration"""
        self.client = None
        self.project_id = os.getenv('GCP_PROJECT_ID')
        
        # Get Firebase service account key path
        self.service_account_key_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY_PATH')
        
        if not self.project_id or not self.service_account_key_path:
            msg = "WARNING: Missing required environment variables (GCP_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT_KEY_PATH) for Text-to-Speech"
            print(msg)
            # self.client will remain None
            raise TTSServiceError(msg)
            
        if not os.path.exists(self.service_account_key_path):
            msg = f"WARNING: Service account file not found at: {self.service_account_key_path}"
            print(msg)
            # self.client will remain None
            raise TTSServiceError(msg)
        
        try:
            # Create credentials from service account file
            credentials = service_account.Credentials.from_service_account_file(
                self.service_account_key_path
            )
            
            # Initialize Text-to-Speech client with explicit credentials
            self.client = texttospeech.TextToSpeechClient(credentials=credentials)
            print("Text-to-Speech client initialized successfully.")
        except Exception as e:
            msg = f"ERROR: Failed to initialize Text-to-Speech client: {e}"
            print(msg)
            # self.client will remain None
            raise TTSServiceError(msg)
    
    def _check_client(self):
        """Helper to check if the client is initialized."""
        if not self.client:
            print("ERROR: Text-to-Speech client not initialized.")
            return False
        return True
    
    def _chunk_text(self, text: str) -> list[str]:
        """
        Splits the input text into manageable chunks to avoid hitting Google Cloud TTS API limits.
        Preserves paragraph boundaries for better TTS output.
        
        Args:
            text: The text to be chunked
            
        Returns:
            A list of text chunks, each below the maximum chunk size
        """
        # Log detailed information about the input text
        # Correctly split by double newlines to count actual paragraphs
        paragraphs_in = re.split(r'\n{2,}', text)
        logging.debug(f"TTS_TRACE: CHUNKER INPUT - Total length: {len(text)}, Paragraph count: {len(paragraphs_in)}")
        chunker_input_first_100 = text[:100].replace('\n', '[NEWLINE]')
        logging.debug(f"TTS_TRACE: CHUNKER INPUT - First 100 chars: {chunker_input_first_100}")
        chunker_input_last_100 = text[-100:].replace('\n', '[NEWLINE]')
        logging.debug(f"TTS_TRACE: CHUNKER INPUT - Last 100 chars: {chunker_input_last_100}")
        
        # Maximum size for any chunk (leaving room for SSML tag overhead)
        max_chunk_size = 2500
        
        # If the text is already small enough, return it as a single chunk
        if len(text) <= max_chunk_size:
            logging.debug(f"TTS_TRACE: CHUNKER - Text fits in single chunk of {len(text)} characters")
            return [text]
        
        chunks = []
        # Split by paragraph breaks properly
        paragraphs = re.split(r'\n{2,}', text)
        current_chunk = ""
        paragraph_separator = "\n\n"  # Use double newline to preserve paragraph breaks
        chunk_paragraph_count = 0  # Initialize paragraph counter for current chunk
        
        for i, paragraph in enumerate(paragraphs):
            paragraph = paragraph.strip()
            if not paragraph:
                continue  # Skip empty paragraphs
                
            # If adding this paragraph would exceed the chunk size, start a new chunk
            if current_chunk and (len(current_chunk) + len(paragraph_separator) + len(paragraph) > max_chunk_size):
                # Finalize the current chunk.
                chunks.append(current_chunk)
                logging.debug(f"TTS_TRACE: CHUNKER OUTPUT - Chunk {len(chunks)}/{len(paragraphs)} has {chunk_paragraph_count} paragraphs, length: {len(current_chunk)}")
                
                # Start the new chunk with the current paragraph.
                current_chunk = paragraph
                chunk_paragraph_count = 1
                continue
                
            # If the paragraph itself is too large, we need to split it by sentences
            if len(paragraph) > max_chunk_size:
                # If we have content in the current chunk, finalize it first
                if current_chunk:
                    chunks.append(current_chunk)
                    logging.debug(f"TTS_TRACE: CHUNKER OUTPUT - Chunk {len(chunks)}/{len(paragraphs)} has {chunk_paragraph_count} paragraphs, length: {len(current_chunk)}")
                    
                    # Reset for new chunk
                    current_chunk = ""
                    chunk_paragraph_count = 0
                    
                # Split the large paragraph by sentence boundaries
                sentences = re.split(r'([.!?]\s+)', paragraph)
                sentence_groups = []
                
                # Reassemble the split parts to keep punctuation with sentences
                for j in range(0, len(sentences)-1, 2):
                    if j+1 < len(sentences):
                        sentence_groups.append(sentences[j] + sentences[j+1])
                    else:
                        sentence_groups.append(sentences[j])
                        
                # If there's an odd number, add the last element
                if len(sentences) % 2 == 1:
                    sentence_groups.append(sentences[-1])
                    
                # Create chunks from sentence groups
                current_sentence_chunk = ""
                for sentence in sentence_groups:
                    # If adding this sentence would exceed chunk size, start a new chunk
                    if len(current_sentence_chunk) + len(sentence) > max_chunk_size:
                        if current_sentence_chunk:
                            chunks.append(current_sentence_chunk)
                            current_sentence_chunk = sentence
                        else:  # If the sentence itself is too long, we need to break it up
                            for k in range(0, len(sentence), max_chunk_size):
                                sub_part = sentence[k:k + max_chunk_size]
                                chunks.append(sub_part)
                    else:
                        if current_sentence_chunk:
                            current_sentence_chunk += sentence
                        else:
                            current_sentence_chunk = sentence
                            
                # Add any remaining sentence chunk
                if current_sentence_chunk:
                    chunks.append(current_sentence_chunk)
                    
                # Start a new paragraph chunk
                current_chunk = ""
                chunk_paragraph_count = 0
            else:
                # Otherwise, add the paragraph to the current chunk.
                if current_chunk:
                    # Join with the separator if the chunk isn't empty.
                    current_chunk += paragraph_separator + paragraph
                else:
                    # This handles the very first paragraph of the first chunk.
                    current_chunk = paragraph
                chunk_paragraph_count += 1
        
        # Add the last chunk if it has content
        if current_chunk:
            chunks.append(current_chunk)
            
        # Log detailed information about the output chunks
        logging.debug(f"TTS_TRACE: CHUNKER OUTPUT - Split into {len(chunks)} chunks")
        for i, chunk in enumerate(chunks):
            chunk_paragraphs = re.split(r'\n{2,}', chunk)
            logging.debug(f"TTS_TRACE: CHUNKER OUTPUT - Chunk {i+1}/{len(chunks)} has {len(chunk_paragraphs)} paragraphs, length: {len(chunk)}")
        
        return chunks

    def synthesize_text(self, text, voice_name=None, speaking_rate=None, pitch=None,
                     audio_encoding=texttospeech.AudioEncoding.LINEAR16,
                     sample_rate_hertz=None):
        """
        Converts text to speech using Google Cloud TTS API, with support for chunking
        large texts and preserving paragraph structure.
        
        Args:
            text: The text to be synthesized
            voice_name: Optional voice name to use
            speaking_rate: Optional speaking rate (default: 1.0)
            pitch: Optional pitch adjustment (default: 0.0)
            audio_encoding: Optional audio encoding format
            sample_rate_hertz: Optional sample rate in hertz
            
        Returns:
            Dict with audio_content (bytes) and timepoints (list) or None if failed
        """
        logging.debug(f"TTS_TRACE: Entering synthesize_text. Initial text length: {len(text) if text else 0}")
        
        if not self._check_client() or not text:
            return None

        import re

        # Determine defaults from environment variables
        final_voice_name = voice_name if voice_name is not None else os.getenv('TTS_DEFAULT_VOICE_NAME', "en-US-Journey-F")
        try:
            final_speaking_rate = float(speaking_rate) if speaking_rate is not None else float(os.getenv('TTS_DEFAULT_SPEAKING_RATE', 1.0))
            final_pitch = float(pitch) if pitch is not None else float(os.getenv('TTS_DEFAULT_PITCH', 0.0))
        except (ValueError, TypeError):
            print("WARNING: Invalid speaking rate or pitch, using defaults.")
            final_speaking_rate = 1.0
            final_pitch = 0.0
        
        # Define a helper function to build SSML and map mark names to text
        def _build_ssml_and_map(plain_text: str):
            ssml_body = []
            marks_map = {}  # Map mark names to actual text
            part_counter = 0
            p_index = 0
            
            # Split the text into paragraphs based on double newlines
            # This matches how sanitize_text_for_tts joins paragraphs with '\n\n'
            paragraphs = re.split(r'\n{2,}', plain_text)
            logging.debug(f"TTS_TRACE: SSML_BUILDER - Processing text with {len(paragraphs)} paragraphs, total length: {len(plain_text)}")
            ssml_input_first_100 = plain_text[:100].replace('\n', '[NEWLINE]')
            logging.debug(f"TTS_TRACE: SSML_BUILDER - First 100 chars: {ssml_input_first_100}")
            ssml_input_last_100 = plain_text[-100:].replace('\n', '[NEWLINE]')
            logging.debug(f"TTS_TRACE: SSML_BUILDER - Last 100 chars: {ssml_input_last_100}")
            
            # Log paragraph details
            for i, para in enumerate(paragraphs):
                if i < 3 or i >= len(paragraphs) - 3:  # Log first 3 and last 3 paragraphs
                    logging.debug(f"TTS_TRACE: SSML_BUILDER - Paragraph {i}/{len(paragraphs)}: '{para[:50]}...' (length: {len(para)})")
            
            for p_num, paragraph in enumerate(paragraphs):
                logging.debug(f"TTS_TRACE: SSML_BUILDER - Processing paragraph {p_num+1}/{len(paragraphs)} - length: {len(paragraph)}")
                
                if not paragraph.strip():
                    # Add a mark for the paragraph break
                    mark_name = f"part_{part_counter}"
                    part_counter += 1
                    marks_map[mark_name] = '\n'
                    ssml_body.append(f'<mark name="{mark_name}"/>')
                    logging.debug(f"TTS_TRACE: SSML_BUILDER - Added empty paragraph marker at counter {part_counter-1}")
                    continue
                
                # Start a new paragraph in SSML
                ssml_body.append('<p>')
                logging.debug(f"TTS_TRACE: SSML_BUILDER - Started SSML paragraph {p_index+1}")
                
                # Split paragraph into words and spaces
                parts = re.split(r'(\s+)', paragraph)
                word_count = len([p for p in parts if p.strip()])
                logging.debug(f"TTS_TRACE: SSML_BUILDER - Split paragraph into {len(parts)} parts ({word_count} words)")
                
                for part in parts:
                    if not part: 
                        continue
                    
                    # Create a mark for each text part (word or space)
                    mark_name = f"part_{part_counter}"
                    part_counter += 1
                    ssml_body.append(f'<mark name="{mark_name}"/>{part}')
                    marks_map[mark_name] = part
                
                # Add a special paragraph break marker to the marks map
                p_break_mark = f"p_break_{p_index}"
                marks_map[p_break_mark] = "PARAGRAPH_BREAK"
                logging.debug(f"TTS_TRACE: SSML_BUILDER - Adding PARAGRAPH_BREAK marker {p_break_mark}")
                
                # Close the paragraph tag and add a timed break to ensure a timepoint is generated
                ssml_body.append(f'</p><mark name="{p_break_mark}"/><break time="750ms"/>')
                logging.debug(f"TTS_TRACE: SSML_BUILDER - Closed SSML paragraph {p_index+1} with marker {p_break_mark} and timed break")
                p_index += 1
            
            ssml_string = f"<speak>{''.join(ssml_body)}</speak>"
            logging.debug(f"TTS_TRACE: SSML_BUILDER - Generated SSML with {p_index} paragraphs, {part_counter} word/space markers")
            
            # Count paragraph breaks in the map
            paragraph_breaks = sum(1 for k, v in marks_map.items() if v == "PARAGRAPH_BREAK")
            logging.debug(f"TTS_TRACE: SSML_BUILDER - Final marks_map has {len(marks_map)} entries, including {paragraph_breaks} paragraph breaks")
            
            return ssml_string, marks_map

        # Sanitize text and then chunk it
        sanitized_text = sanitize_text_for_tts(text)
        logging.debug(f"TTS_TRACE: Text after sanitization. Length: {len(sanitized_text)}. Content: {sanitized_text[:500]}")
        
        # Explicitly remove any remaining paragraph marker strings that might have survived the sanitizer
        # This is critical to prevent the marker from being spoken by the TTS engine
        paragraph_marker = "__PARAGRAPH_BREAK_MARKER_XYZ123__"
        if paragraph_marker in sanitized_text:
            logging.debug(f"TTS_TRACE: Found {sanitized_text.count(paragraph_marker)} instances of paragraph marker in sanitized text, removing them")
            sanitized_text = sanitized_text.replace(paragraph_marker, '\n\n')
        
        # Check for the marker without underscores (which might be how it appears in logs)
        plain_marker = "PARAGRAPHBREAKMARKERXYZ123"
        if plain_marker in sanitized_text:
            logging.debug(f"TTS_TRACE: Found {sanitized_text.count(plain_marker)} instances of plain paragraph marker in sanitized text, removing them")
            sanitized_text = sanitized_text.replace(plain_marker, '\n\n')
        
        # Log the text after sanitization
        logging.debug(f"TTS_TRACE: Text after sanitization. Length: {len(sanitized_text)}. Content: {sanitized_text[:500]}")
        
        chunks = self._chunk_text(sanitized_text)
        logging.debug(f"TTS_TRACE: Text chunking complete. Number of chunks: {len(chunks)}. Chunk lengths: {[len(c) for c in chunks]}")
        
        
        # Process each chunk and aggregate results
        combined_audio_segment = AudioSegment.empty()
        timepoint_chunks = []
        
        language_code = "-".join(final_voice_name.split('-')[0:2])
        voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            name=final_voice_name
        )
        
        # Force LINEAR16 for precise PCM chunk measurement regardless of caller input
        audio_config_params = {
            "audio_encoding": texttospeech.AudioEncoding.LINEAR16,
            "speaking_rate": final_speaking_rate,
            "pitch": final_pitch
        }
        if sample_rate_hertz is not None:
            audio_config_params["sample_rate_hertz"] = sample_rate_hertz
            
        audio_config = texttospeech.AudioConfig(**audio_config_params)
        
        try:
            for chunk_index, chunk in enumerate(chunks):
                print(f"Processing chunk {chunk_index+1}/{len(chunks)} ({len(chunk)} characters)")
                logging.debug(f"TTS_TRACE: [Chunk {chunk_index+1}/{len(chunks)}] Processing chunk with {len(chunk)} characters")
                
                # Build SSML and mark map for this chunk
                ssml_text, marks_to_text_map = _build_ssml_and_map(chunk)
                logging.debug(f"TTS_TRACE: [Chunk {chunk_index+1}/{len(chunks)}] Generated SSML: {ssml_text[:500]}...")
                
                input_text = texttospeech.SynthesisInput(ssml=ssml_text)
                
                # Create request for this chunk
                request = texttospeech.SynthesizeSpeechRequest(
                    input=input_text,
                    voice=voice,
                    audio_config=audio_config,
                    enable_time_pointing=[texttospeech.SynthesizeSpeechRequest.TimepointType.SSML_MARK]
                )

                # Send request to Google TTS API
                response = self.client.synthesize_speech(request=request)
                logging.debug(f"TTS_TRACE: [Chunk {chunk_index+1}/{len(chunks)}] API call successful. Received {len(response.audio_content)} bytes of audio.")
                
                # Decode LINEAR16 (WAV) chunk to maintain exact PCM timing
                chunk_audio = AudioSegment.from_wav(io.BytesIO(response.audio_content))
                real_duration_ms = len(chunk_audio)

                # Process timepoints for this chunk
                chunk_timepoints = []
                paragraph_markers_found = 0
                regular_markers_found = 0
                
                # Log timepoints from response
                logging.debug(f"TTS_TRACE: [Chunk {chunk_index+1}/{len(chunks)}] Processing {len(response.timepoints)} timepoints")
                
                # Determine the current offset from the already stitched audio
                current_offset_ms = len(combined_audio_segment)

                for tp_index, tp in enumerate(response.timepoints):
                    # Log every 100th timepoint and first/last few
                    if tp_index % 100 == 0 or tp_index < 5 or tp_index >= len(response.timepoints) - 5:
                        logging.debug(f"TTS_TRACE: [Chunk {chunk_index+1}/{len(chunks)}] Timepoint {tp_index}: name={tp.mark_name}, time={tp.time_seconds:.3f}s")
                    
                    text_part = marks_to_text_map.get(tp.mark_name, '')
                    # Adjust timepoint by adding the total duration so far
                    adjusted_time = tp.time_seconds + (current_offset_ms / 1000.0)
                    
                    # Check if this is a paragraph break marker
                    if text_part == "PARAGRAPH_BREAK":
                        # Add a special paragraph break object to the timepoints
                        chunk_timepoints.append({
                            "mark_name": "PARAGRAPH_BREAK", 
                            "time_seconds": adjusted_time
                        })
                        paragraph_markers_found += 1
                        logging.debug(f"TTS_TRACE: [Chunk {chunk_index+1}/{len(chunks)}] Added PARAGRAPH_BREAK marker at {adjusted_time} seconds for mark {tp.mark_name}")
                    else:
                        # Regular word timepoint
                        chunk_timepoints.append({
                            "mark_name": text_part,
                            "time_seconds": adjusted_time
                        })
                        regular_markers_found += 1
                        
                        # Log some sample words for debugging
                        if regular_markers_found % 100 == 0 or regular_markers_found < 5 or len(text_part) > 20:
                            logging.debug(f"TTS_TRACE: [Chunk {chunk_index+1}/{len(chunks)}] Word marker: '{text_part}' at {adjusted_time:.3f}s")
                
                last_chunk_timepoint_ms = 0
                if response.timepoints:
                    last_chunk_timepoint_ms = response.timepoints[-1].time_seconds * 1000
                logging.debug(
                    f"TTS_TRACE: [Chunk {chunk_index+1}/{len(chunks)}] Processed {paragraph_markers_found} paragraph breaks and {regular_markers_found} regular markers"
                )
                logging.debug(
                    f"TTS_TRACE: [Chunk {chunk_index+1}/{len(chunks)}] Offset={current_offset_ms}ms, MeasuredDuration={real_duration_ms}ms, LastTimepoint={last_chunk_timepoint_ms:.1f}ms"
                )
                if real_duration_ms - last_chunk_timepoint_ms > 150:
                    logging.warning(
                        f"TTS_TRACE: [Chunk {chunk_index+1}/{len(chunks)}] Detected {real_duration_ms - last_chunk_timepoint_ms:.1f}ms of trailing silence/padding; consider trimming."
                    )
                
                # Add this chunk's results to our aggregated results
                combined_audio_segment += chunk_audio
                timepoint_chunks.extend(chunk_timepoints)
            
            # Export the stitched audio to a clean MP3 byte stream
            buffer = io.BytesIO()
            combined_audio_segment.export(buffer, format="mp3")
            buffer.seek(0)
            final_audio_bytes = buffer.getvalue()
            
            print(f"TTS successfully synthesized {len(final_audio_bytes)} bytes with {len(timepoint_chunks)} timepoints across {len(chunks)} chunks.")
            logging.debug(
                f"TTS_TRACE: Exiting synthesize_text. Processed {len(chunks)} chunks. Total audio size: {len(final_audio_bytes)} bytes. "
                f"Total timepoints: {len(timepoint_chunks)}"
            )
            
            return {
                "audio_content": final_audio_bytes,
                "timepoints": timepoint_chunks
            }
        except Exception as e:
            print(f"Error synthesizing speech: {e}")
            return None

    def get_available_voices(self, language_code=None):
        """
        Retrieves a list of available voices, optionally filtering by language code.
        
        Args:
            language_code (str, optional): Language code to filter by (e.g., "en-US")
            
        Returns:
            list or None: List of voice details, or None if retrieval fails
        """
        if not self._check_client():
            return None
        
        try:
            # List all available voices
            response = self.client.list_voices(language_code=language_code)
            
            # Process the response
            voices = []
            for voice in response.voices:
                voice_info = {
                    "name": voice.name,
                    "gender": texttospeech.SsmlVoiceGender(voice.ssml_gender).name,
                    "natural_sample_rate_hertz": voice.natural_sample_rate_hertz,
                    "language_codes": list(voice.language_codes)
                }
                voices.append(voice_info)
            
            return voices
        except Exception as e:
            print(f"Error retrieving available voices: {e}")
            return None
