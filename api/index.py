"""
Vercel serverless entry point.
Mangum wraps FastAPI/ASGI for AWS Lambda-style handlers (which Vercel uses).
"""
import sys
import os

# Make sure our backend modules are importable
sys.path.insert(0, os.path.dirname(__file__))

from mangum import Mangum
from app import create_app

app = create_app()

# Vercel calls this handler
handler = Mangum(app, lifespan="off")
