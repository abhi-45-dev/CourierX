import os
import sys

# Add root directory to sys.path so backend modules can be imported
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.app import app

# Vercel Serverless Function entry point
app = app
