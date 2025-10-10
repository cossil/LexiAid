# backend/utils/logging_utils.py
import logging
import sys

# Configure a basic logger
# You can customize the format, level, and handlers as needed
logging.basicConfig(
    level=logging.INFO, # Set to logging.DEBUG for more verbose output
    format='%(asctime)s - %(name)s - %(levelname)s - %(module)s - %(funcName)s - %(lineno)d - %(message)s',
    stream=sys.stdout # Log to standard output, can also log to a file
)

logger = logging.getLogger("ai_tutor_app") # Or a more specific name

# Example of how to use the logger in other modules:
# from backend.utils.logging_utils import logger
# logger.info("This is an info message.")
# logger.debug("This is a debug message.")
# logger.warning("This is a warning message.")
# logger.error("This is an error message.")
