import sys
import os

# Add the project root to the Python path
# This ensures that modules in 'backend' and other top-level directories can be found
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__)))
sys.path.insert(0, PROJECT_ROOT)

# You can also define project-wide fixtures here if needed in the future
