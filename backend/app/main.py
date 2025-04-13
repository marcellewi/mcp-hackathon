import os
from pathlib import Path

from app.controllers.github_controller import router as github_router
from app.controllers.log_controller import router as log_router
from app.database import init_db
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables from .env file
env_file = Path(__file__).resolve().parent.parent / ".env"
if env_file.exists():
    load_dotenv(env_file)
    print(f"Loaded environment variables from {env_file}")
else:
    print(f"Warning: .env file not found at {env_file}")

# Check for required environment variables
sentry_token = os.getenv("SENTRY_AUTH_TOKEN")
if sentry_token:
    print("Sentry configuration: SENTRY_AUTH_TOKEN found")
else:
    print("Warning: SENTRY_AUTH_TOKEN not found in environment variables")

app = FastAPI(title="Context Processing API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(log_router, prefix="/api/logs", tags=["logs"])
app.include_router(github_router, prefix="/api/github", tags=["github"])


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
async def root():
    return {"message": "Log Processing API is running"}
