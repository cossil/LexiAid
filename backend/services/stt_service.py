"""
Speech-to-Text Service module for AI Tutor Application

This module handles interactions with Google Cloud Speech-to-Text API,
providing transcription capabilities for the AI Tutor application.
"""

import os
import time
from typing import Dict, Any, Optional, Tuple, List, Iterator, Generator
from google.cloud import speech
from google.oauth2 import service_account
from dotenv import load_dotenv
import logging
import traceback
import datetime
from simple_websocket import ConnectionClosed
import json

# Load environment variables
load_dotenv()

class STTService:
    """Service class for Google Cloud Speech-to-Text operations"""
    
    _instance = None
    
    def __new__(cls):
        """Singleton pattern to ensure only one Speech-to-Text connection"""
        if cls._instance is None:
            cls._instance = super(STTService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Initialize Google Cloud Speech-to-Text client with credentials from environment variables"""
        self.client = None
        self.logger = logging.getLogger(self.__class__.__name__)  # Correctly initialize logger
        
        try:
            # Get required environment variables
            service_account_key_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY_PATH')
            
            if not service_account_key_path:
                raise ValueError("FIREBASE_SERVICE_ACCOUNT_KEY_PATH not found in environment variables")
                
            # Check if service account file exists
            if not os.path.exists(service_account_key_path):
                raise ValueError(f"Service account file not found at {service_account_key_path}")
            
            # Create credentials from service account file
            credentials = service_account.Credentials.from_service_account_file(
                service_account_key_path
            )
            
            # Initialize Speech-to-Text client
            self.client = speech.SpeechClient(credentials=credentials)
            print("Speech-to-Text client initialized successfully.")
            
        except Exception as e:
            print(f"ERROR initializing Speech-to-Text client: {e}")
            # Don't raise the exception - log it and continue, but service will be unavailable
    
    def _check_client(self) -> bool:
        """Check if the Speech-to-Text client is initialized
        
        Returns:
            bool: True if client is initialized, False otherwise
        """
        if not self.client:
            print("ERROR: Speech-to-Text client not initialized.")
            return False
        return True
    
    def transcribe_audio_bytes(
        self, 
        audio_bytes: bytes, 
        encoding: Optional[speech.RecognitionConfig.AudioEncoding] = None, 
        sample_rate_hertz: Optional[int] = None, 
        language_code: Optional[str] = None, # Changed default to None
        audio_channel_count: Optional[int] = 1, # Default to 1 for mono
        enable_automatic_punctuation: bool = True,
        model: Optional[str] = None # Changed default to None
    ) -> Tuple[bool, Dict[str, Any]]: # Return type changed to match actual return with metadata
        """Transcribe audio provided as bytes using non-streaming recognition"""
        
        if not audio_bytes:
            print("[STTService] Error: No audio bytes received for transcription.")
            if self.logger: self.logger.error("[STTService] No audio bytes received for transcription.")
            return False, {"error": "No audio data provided."}

        try:
            # Determine defaults from environment variables if parameters are not provided
            transcript_text: Optional[str] = None # Initialize transcript_text
            final_language_code = language_code if language_code is not None else os.getenv('STT_DEFAULT_LANGUAGE_CODE', "en-US")
            final_model = model if model is not None else os.getenv('STT_DEFAULT_MODEL', "latest_short")

            # Base config arguments
            config_args = {
                "language_code": final_language_code,
            }

            # Add optional parameters if they are set (not None or False for booleans)
            if final_model: # Only add if model is not None or empty string
                config_args["model"] = final_model
            
            # enable_automatic_punctuation is True by default in signature,
            # so it's always passed unless explicitly set to False by caller.
            config_args["enable_automatic_punctuation"] = enable_automatic_punctuation
            
            if encoding is not None:
                config_args["encoding"] = encoding
                if encoding == speech.RecognitionConfig.AudioEncoding.FLAC:
                    # For FLAC, sample_rate_hertz and audio_channel_count are typically derived from the header.
                    # As per latest strategy, we omit them from config unless explicitly requested for diagnostics.
                    # If sample_rate_hertz or audio_channel_count are *explicitly* passed to this method
                    # for FLAC (e.g., for the specialist's diagnostic step 7), then include them.
                    if sample_rate_hertz is not None:
                         config_args["sample_rate_hertz"] = sample_rate_hertz
                    if audio_channel_count is not None:
                         config_args["audio_channel_count"] = audio_channel_count
                else: 
                    # For LINEAR16 (WAV) and others:
                    if sample_rate_hertz is not None:
                        config_args["sample_rate_hertz"] = sample_rate_hertz
                    if audio_channel_count is not None:
                        config_args["audio_channel_count"] = audio_channel_count
            else:
                print("[STTService] Warning: Audio encoding is None. Transcription may fail or be inaccurate.")
                if self.logger: self.logger.warning("[STTService] Audio encoding is None.")
                # Potentially set a default like LINEAR16 if appropriate, or raise error
                # For now, we expect stt_tool to always provide an encoding.


            config = speech.RecognitionConfig(**config_args)

            log_msg_config = f"[STTService] Sending RecognitionConfig: {config}"
            print(log_msg_config)
            if self.logger: self.logger.info(log_msg_config)
            
            log_msg_bytes = f"[STTService] Audio bytes length: {len(audio_bytes)}"
            print(log_msg_bytes)
            if self.logger: self.logger.info(log_msg_bytes)

            # For debugging: Save the audio bytes being sent to the API
            timestamp = time.strftime("%Y%m%d-%H%M%S")
            debug_audio_filename = f"debug_audio_sent_to_api_{timestamp}.{'flac' if encoding == speech.RecognitionConfig.AudioEncoding.FLAC else 'wav' if encoding == speech.RecognitionConfig.AudioEncoding.LINEAR16 else 'raw'}"
            
            # Try to save in a 'debug_audio' subdirectory of the backend.
            # Create it if it doesn't exist.
            # Correctly get backend_dir assuming stt_service.py is in backend/services/
            current_file_dir = os.path.dirname(os.path.abspath(__file__))
            services_dir = current_file_dir 
            backend_dir = os.path.dirname(services_dir) 
            debug_dir = os.path.join(backend_dir, "debug_audio")
            os.makedirs(debug_dir, exist_ok=True)
            debug_audio_filepath = os.path.join(debug_dir, debug_audio_filename)
            
            try:
                with open(debug_audio_filepath, "wb") as f:
                    f.write(audio_bytes)
                save_log_msg = f"[STTService] Saved audio bytes sent to API for inspection at: {debug_audio_filepath}"
                print(save_log_msg)
                if self.logger: self.logger.info(save_log_msg)
            except Exception as e_save:
                save_err_msg = f"[STTService] Error saving debug audio file: {e_save}"
                print(save_err_msg)
                if self.logger: self.logger.error(save_err_msg)


            audio_proto = speech.RecognitionAudio(content=audio_bytes)
            
            api_call_start_time = time.time()
            response = self.client.recognize(config=config, audio=audio_proto)
            api_call_duration = time.time() - api_call_start_time
            
            duration_log_msg = f"[STTService] STT API call duration: {api_call_duration:.2f}s"
            print(duration_log_msg)
            if self.logger: self.logger.info(duration_log_msg)

            billed_time_msg = "[STTService] total_billed_time: N/A (field not present or not recognized)"
            billed_time_value_for_check = None # Used to check if time is zero

            if hasattr(response, 'total_billed_time') and response.total_billed_time:
                billed_time_obj = response.total_billed_time
                if isinstance(billed_time_obj, datetime.timedelta):
                    billed_time_msg = f"[STTService] Audio processed, total_billed_time (datetime.timedelta): {billed_time_obj.total_seconds()}s"
                    billed_time_value_for_check = billed_time_obj.total_seconds()
                elif hasattr(billed_time_obj, 'seconds') and hasattr(billed_time_obj, 'nanos'): # Check for protobuf Duration
                    billed_time_msg = f"[STTService] Audio processed, total_billed_time (protobuf.Duration): {billed_time_obj.seconds}s {billed_time_obj.nanos}ns"
                    billed_time_value_for_check = billed_time_obj.seconds + (billed_time_obj.nanos / 1e9)
                else:
                    billed_time_msg = f"[STTService] Audio processed, total_billed_time (unknown type: {type(billed_time_obj)}): {str(billed_time_obj)}"
                    # Cannot reliably check for zero if type is unknown and it's not None / 0
                    if billed_time_obj: # if it's truthy, assume non-zero for the check
                         billed_time_value_for_check = -1 # Placeholder for non-zero unknown type
            
            print(billed_time_msg)
            if self.logger: self.logger.info(billed_time_msg)

            if billed_time_value_for_check is None or billed_time_value_for_check == 0:
                warn_billed_time_msg = "[STTService] Warning: total_billed_time is zero or not determined as non-zero. Audio might not have been fully processed or recognized as speech."
                print(warn_billed_time_msg)
                if self.logger: self.logger.warning(warn_billed_time_msg)


            if response.results and response.results[0].alternatives:
                transcript = response.results[0].alternatives[0].transcript
                confidence = response.results[0].alternatives[0].confidence
                success_log_msg = f"[STTService] Transcription successful: '{transcript}' (Confidence: {confidence:.4f})"
                print(success_log_msg)
                if self.logger: self.logger.info(success_log_msg)
                transcript_text = transcript
                if not self.logger: # Ensure logger is available before using
                    print(f"[STTService] Transcription result: {transcript_text}")
                else:
                    self.logger.info(f"[STTService] Transcription successful: {transcript_text[:100]}...")
            
            # Return detailed result including metadata
            result_details = {
                "transcript": transcript_text,
                "language_code": final_language_code, # The actual language code used
                "model_used": final_model, # The actual model used
                "confidence": confidence,
                "audio_size_bytes": len(audio_bytes),
                "processing_time_ms": (api_call_duration) * 1000
            }
            return True, result_details
        except Exception as e:
            error_msg = f"[STTService] Error during STT API call: {e}"
            print(error_msg)
            if self.logger: self.logger.error(error_msg)
            # Log the full exception traceback
            traceback.print_exc()
            return False, None
    
    def transcribe_audio_file(
        self,
        file_path: str,
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz: int = 16000,
        language_code: str = "en-US",
        audio_channel_count: int = 1,
        enable_automatic_punctuation: bool = True
    ) -> Tuple[bool, Optional[str]]:
        """Transcribe audio from a file using non-streaming recognition
        
        This method is suitable for short audio files (up to 60 seconds).
        
        Args:
            file_path: Path to the audio file
            encoding: Audio encoding format (from speech.RecognitionConfig.AudioEncoding)
            sample_rate_hertz: Sample rate of the audio in hertz
            language_code: Language code (e.g., "en-US", "es-ES")
            audio_channel_count: Number of audio channels (1 for mono, 2 for stereo)
            enable_automatic_punctuation: Whether to add punctuation to the transcript
            
        Returns:
            Tuple of (success: bool, transcript: Optional[str])
        """
        if not self._check_client() or not file_path:
            return False, None
        
        try:
            # Check if file exists
            if not os.path.exists(file_path):
                print(f"Audio file not found at {file_path}")
                return False, None
            
            # Read the audio file
            with open(file_path, "rb") as audio_file:
                audio_bytes = audio_file.read()
                
            # Use the transcribe_audio_bytes method to process the audio
            return self.transcribe_audio_bytes(
                audio_bytes=audio_bytes,
                encoding=encoding,
                sample_rate_hertz=sample_rate_hertz,
                language_code=language_code,
                audio_channel_count=audio_channel_count,
                enable_automatic_punctuation=enable_automatic_punctuation
            )
            
        except Exception as e:
            print(f"Error reading audio file: {e}")
            return False, None
    
    async def transcribe_audio_batch(self, audio_reference: str) -> dict:
        """Transcribes audio from a GCS URI using long-running recognition.

        Args:
            audio_reference (str): The GCS URI of the audio file (e.g., "gs://bucket_name/audio_file.wav").

        Returns:
            dict: A dictionary containing the 'transcript' or an 'error'.
        """
        if not self._check_client():
            return {"error": "Speech-to-Text client not initialized."}

        if not audio_reference.startswith("gs://"):
            return {"error": "Invalid GCS URI. Must start with 'gs://'.", "audio_reference": audio_reference}

        self.logger.info(f"Attempting batch transcription for GCS URI: {audio_reference}")
        try:
            config = speech.RecognitionConfig(
                # Configure appropriately for your audio. Examples:
                # encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16, # Or FLAC, MP3 etc.
                # sample_rate_hertz=16000, # Or auto-detect if possible with your files
                language_code="en-US",
                enable_automatic_punctuation=True,
                # model="long" # For batch, consider specific models if available and beneficial
            )
            audio = speech.RecognitionAudio(uri=audio_reference)

            # Perform long-running recognition
            operation = self.client.long_running_recognize(config=config, audio=audio)
            self.logger.info(f"Waiting for batch transcription operation to complete for {audio_reference}...")
            response = operation.result(timeout=300)  # Timeout in seconds (e.g., 5 minutes)

            transcript_parts = [result.alternatives[0].transcript for result in response.results if result.alternatives]
            full_transcript = " ".join(transcript_parts).strip()
            
            if not full_transcript and not response.results:
                 self.logger.warning(f"Batch transcription for {audio_reference} resulted in no transcript and no results.")
                 # Check for total_billed_time to see if it was processed
                 if response.total_billed_time:
                    self.logger.info(f"Total billed time for {audio_reference}: {response.total_billed_time.total_seconds()}s. Perhaps empty audio?")
                    return {"transcript": "", "message": "Audio processed but no speech detected or empty audio.", "audio_reference": audio_reference, "billed_duration_seconds": response.total_billed_time.total_seconds()}
                 else:
                    return {"error": "Batch transcription failed to produce results and no billed time.", "audio_reference": audio_reference}

            self.logger.info(f"Batch transcription successful for {audio_reference}. Transcript length: {len(full_transcript)}")
            return {"transcript": full_transcript, "audio_reference": audio_reference, "billed_duration_seconds": response.total_billed_time.total_seconds() if response.total_billed_time else 0}

        except google.api_core.exceptions.GoogleAPICallError as e:
            self.logger.error(f"Google API call error during batch transcription for {audio_reference}: {e}")
            # More specific error handling based on e.code() or e.message might be useful
            return {"error": f"API call error during batch transcription: {e.message}", "audio_reference": audio_reference}
        except TimeoutError:
            self.logger.error(f"Timeout waiting for batch transcription operation for {audio_reference}.")
            return {"error": "Timeout waiting for batch transcription to complete.", "audio_reference": audio_reference}
        except Exception as e:
            self.logger.exception(f"Unexpected error during batch transcription for {audio_reference}: {e}")
            return {"error": f"An unexpected error occurred: {str(e)}", "audio_reference": audio_reference}

    def streaming_recognize(
        self,
        config: speech.RecognitionConfig,
        requests_iterator: Iterator[speech.StreamingRecognizeRequest]
    ) -> Iterator[speech.StreamingRecognizeResponse]:
        """Perform streaming speech recognition
        
        Args:
            config: Recognition config for the stream
            requests_iterator: Iterator yielding StreamingRecognizeRequest objects
            
        Returns:
            Iterator of StreamingRecognizeResponse objects or empty iterator on failure
        """
        if not self._check_client():
            print("Cannot start stream, STT client not initialized.")
            return iter([])  # Return an empty iterator if client failed
        
        # Configure the streaming request
        streaming_config = speech.StreamingRecognitionConfig(
            config=config,
            interim_results=True  # Set to True to get intermediate results
        )
        
        try:
            # Start the streaming recognition
            print("Starting STT streaming request...")
            responses = self.client.streaming_recognize(
                config=streaming_config,
                requests=requests_iterator
            )
            # Return the response iterator
            return responses
            
        except Exception as e:
            print(f"Error starting STT stream: {e}")
            return iter([])  # Return empty iterator on error
    
    def create_streaming_config(
        self,
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz: int = 16000,
        language_code: str = "en-US",
        audio_channel_count: int = 1,
        enable_automatic_punctuation: bool = True,
        interim_results: bool = True
    ) -> Tuple[bool, Optional[speech.StreamingRecognitionConfig]]:
        """Create a streaming recognition config
        
        Args:
            encoding: Audio encoding format (from speech.RecognitionConfig.AudioEncoding)
            sample_rate_hertz: Sample rate of the audio in hertz
            language_code: Language code (e.g., "en-US", "es-ES")
            audio_channel_count: Number of audio channels (1 for mono, 2 for stereo)
            enable_automatic_punctuation: Whether to add punctuation to the transcript
            interim_results: Whether to return interim results
            
        Returns:
            Tuple of (success: bool, config: Optional[StreamingRecognitionConfig])
        """
        if not self._check_client():
            return False, None
        
        try:
            # Configure the recognition settings
            config = speech.RecognitionConfig(
                encoding=encoding,
                sample_rate_hertz=sample_rate_hertz,
                language_code=language_code,
                audio_channel_count=audio_channel_count,
                enable_automatic_punctuation=enable_automatic_punctuation,
            )
            
            # Create the streaming config
            streaming_config = speech.StreamingRecognitionConfig(
                config=config,
                interim_results=interim_results
            )
            
            return True, streaming_config
            
        except Exception as e:
            print(f"Error creating streaming config: {e}")
            return False, None
    
    def get_supported_languages(self) -> Tuple[bool, Optional[List[Dict[str, str]]]]:
        """Get the list of supported languages
        
        Returns:
            Tuple of (success: bool, languages: Optional[List])
        """
        if not self._check_client():
            return False, None
        
        try:
            # This is a placeholder implementation since the Speech-to-Text API
            # doesn't have a direct method to get supported languages.
            # In a real implementation, you would maintain a list of supported languages
            # or use a different GCP API to get this information.
            
            # Common languages supported by Cloud Speech-to-Text
            supported_languages = [
                {"language_code": "en-US", "name": "English (United States)"},
                {"language_code": "en-GB", "name": "English (United Kingdom)"},
                {"language_code": "es-ES", "name": "Spanish (Spain)"},
                {"language_code": "es-US", "name": "Spanish (United States)"},
                {"language_code": "fr-FR", "name": "French (France)"},
                {"language_code": "de-DE", "name": "German (Germany)"},
                {"language_code": "it-IT", "name": "Italian (Italy)"},
                {"language_code": "ja-JP", "name": "Japanese (Japan)"},
                {"language_code": "ko-KR", "name": "Korean (South Korea)"},
                {"language_code": "pt-BR", "name": "Portuguese (Brazil)"},
                {"language_code": "zh-CN", "name": "Chinese (Simplified, China)"},
                {"language_code": "zh-TW", "name": "Chinese (Traditional, Taiwan)"},
            ]
            
            return True, supported_languages
            
        except Exception as e:
            print(f"Error getting supported languages: {e}")
            return False, None

    def handle_stt_stream(self, ws):
        """
        Handle a WebSocket connection for streaming Speech-to-Text.
        
        Args:
            ws: The WebSocket connection object from flask-sock.
        """
        # Create a logger if it doesn't exist on the instance (though _initialize usually does it)
        logger = self.logger if hasattr(self, 'logger') and self.logger else logging.getLogger("STTService")
        
        logger.info("Handling STT stream in STTService.")
        
        if not self._check_client():
            logger.error("STT Client not available, closing WebSocket.")
            ws.close(reason=1011, message='STT service is not configured on the server.')
            return

        # 1. Set up the recognition config
        # We use WEBM_OPUS as it's common for web-based audio streaming (e.g. from browsers)
        # Adjust sample rate if necessary, but 16000 or 48000 is typical. 
        # Ideally, we might want to let the client negotiate this, but fixed for now based on app.py logic.
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=16000,
            language_code="en-US",
            enable_automatic_punctuation=True,
        )
        streaming_config = speech.StreamingRecognitionConfig(
            config=config, interim_results=True
        )

        # 2. Define the generator for the streaming request
        def request_generator():
            while True:
                try:
                    # Receive data from the WebSocket
                    # timeout=10 was in app.py, keeping it.
                    message = ws.receive(timeout=10)
                    
                    if message is None:
                        # None usually means connection closed cleanly or no data
                        continue
                    
                    if isinstance(message, str):
                        # Control messages or text data (unexpected for pure audio stream but possible)
                        logger.info(f"Received string message: {message}")
                        if message == 'CLOSE': # Example control
                             break
                        continue
                    
                    # Yield audio content
                    yield speech.StreamingRecognizeRequest(audio_content=message)
                    
                except ConnectionClosed:
                    logger.info("Client connection closed in generator.")
                    break
                except Exception as e:
                    logger.error(f"Error receiving from websocket: {e}")
                    break

        try:
            # Start streaming recognition
            responses = self.client.streaming_recognize(
                config=streaming_config,
                requests=request_generator(),
            )

            # 3. Process responses and send back to client
            for response in responses:
                if not response.results:
                    continue
                
                result = response.results[0]
                if not result.alternatives:
                    continue
                
                transcript = result.alternatives[0].transcript
                
                response_data = {
                    'is_final': result.is_final,
                    'transcript': transcript,
                    'stability': result.stability
                }
                
                try:
                    ws.send(json.dumps(response_data))
                except ConnectionClosed:
                    logger.info("Client connection closed while sending response.")
                    break
                except Exception as e:
                    logger.error(f"Error sending response to websocket: {e}")
                    break

        except Exception as e:
            logger.error(f"Error during STT stream processing: {e}")
            # Optional: send error message to client if possible
        finally:
            # Ensure connection is closed
            try:
                ws.close()
            except:
                pass
            logger.info("WebSocket connection closed in STTService.")
