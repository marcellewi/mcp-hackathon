from typing import List

from app.database import get_db
from app.database.models import LogFile
from app.services.log_service import LogService
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

router = APIRouter()


@router.post("/upload-logs/", response_model=List[str])
async def upload_logs(zip_file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Endpoint to upload a zip file containing log files (.txt)
    Returns a list of processed file names
    """

    print(f"Received zip file: {zip_file.filename}")
    # Check if the uploaded file is a zip
    if not zip_file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="File must be a ZIP archive")

    # Read the file content
    content = await zip_file.read()

    print(f"Processing zip file content")

    # Process the zip file and save logs to the database
    try:
        print(f"Processing zip file content")
        saved_files = LogService.process_zip_file(content, db)
        return saved_files
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing zip file: {str(e)}"
        )


@router.get("/", response_model=List[dict])
async def get_all_logs(db: Session = Depends(get_db)):
    """
    Endpoint to retrieve all log files from the database
    Returns a list of log files with their id, filename, and content
    """
    try:
        logs = db.query(LogFile).all()
        return [
            {"id": log.id, "filename": log.filename, "content": log.content}
            for log in logs
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving logs: {str(e)}")


@router.get("/{id}", response_model=dict)
async def get_log_by_id(id: int, db: Session = Depends(get_db)):
    """
    Endpoint to retrieve a log file by its id
    Returns a log file with its id, filename, and content
    """
    try:
        log = db.query(LogFile).filter(LogFile.id == id).first()
        if log is None:
            raise HTTPException(status_code=404, detail=f"Log with id {id} not found")
        return {"id": log.id, "name": log.filename, "content": log.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving log: {str(e)}")


@router.delete("/all", response_model=dict)
async def delete_all_logs(db: Session = Depends(get_db)):
    """
    Endpoint to delete all log files from the database
    """
    try:
        db.query(LogFile).delete()
        db.commit()
        return {"message": "All log files deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error deleting all log files: {str(e)}"
        )
