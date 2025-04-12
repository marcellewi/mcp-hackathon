from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.controllers.log_controller import router as log_router
from app.database import init_db

app = FastAPI(title="Log Processing API")

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


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
async def root():
    return {"message": "Log Processing API is running"}
