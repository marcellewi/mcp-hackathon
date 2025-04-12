from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.log_service import LogService

router = APIRouter()


@router.post("/upload-logs/", response_model=List[str])
async def upload_logs(zip_file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Endpoint to upload a zip file containing log files (.txt)
    Returns a list of processed file names
    """
    # Check if the uploaded file is a zip
    if not zip_file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="File must be a ZIP archive")

    # Read the file content
    content = await zip_file.read()

    # Process the zip file and save logs to the database
    try:
        saved_files = LogService.process_zip_file(content, db)
        return saved_files
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing zip file: {str(e)}"
        )
