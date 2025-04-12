import os
from pathlib import Path

# Base directory of the application
BASE_DIR = Path(__file__).resolve().parent.parent

# Database configuration
DATABASE_URL = f"sqlite:///{BASE_DIR}/logs.db"

# Temporary directory for zip extraction
TEMP_DIR = os.path.join(BASE_DIR, "temp")
os.makedirs(TEMP_DIR, exist_ok=True)
