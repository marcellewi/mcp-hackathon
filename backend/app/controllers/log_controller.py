import json
from typing import List

from app.database import get_db
from app.database.models import LogFile
from app.services.log_service import LogService
from app.services.sentry_service import SentryService
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session


class LogInput(BaseModel):
    filename: str
    content: str


router = APIRouter()


@router.post("/upload-logs/", response_model=List[str])
async def upload_logs(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Endpoint to upload a file (any type) or a zip containing multiple files
    Returns a list of processed file names
    """

    print(f"Received file: {file.filename}")

    # Read the file content
    content = await file.read()

    # Process the file and save to the database
    try:
        print(f"Processing file content for {file.filename}")
        saved_files = LogService.process_file(content, file.filename, db)
        return saved_files
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


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


@router.get("/latest", response_model=List[dict])
async def get_latest_log(db: Session = Depends(get_db)):
    """
    Endpoint to retrieve the latest log file from the database
    Returns a list containing the latest log file with its id, filename, and content
    """
    try:
        log = db.query(LogFile).order_by(LogFile.id.desc()).first()
        if log is None:
            raise HTTPException(status_code=404, detail="No log files found")
        return [{"id": log.id, "filename": log.filename, "content": log.content}]
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error retrieving latest log: {str(e)}"
        )


@router.delete("/{id}", response_model=dict)
async def delete_log_by_id(id: int, db: Session = Depends(get_db)):
    """
    Endpoint to delete a log file by its id
    """
    try:
        db.query(LogFile).filter(LogFile.id == id).delete()
        db.commit()
        return {"message": f"Log file with id {id} deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error deleting log file: {str(e)}"
        )


@router.post("/upload-json-logs/", response_model=dict)
async def upload_json_logs(logs: List[LogInput], db: Session = Depends(get_db)):
    """
    Endpoint to upload multiple logs via JSON (filename + content).
    """
    try:
        for log in logs:
            new_log = LogFile(filename=log.filename, content=log.content)
            db.add(new_log)
        db.commit()
        return {"message": f"{len(logs)} logs uploaded successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error uploading logs: {str(e)}")


@router.get("/sentry/issues", response_model=List[dict])
async def get_sentry_issues(limit: int = 100):
    """
    Endpoint to retrieve issues from Sentry
    """
    try:
        issues = SentryService.get_sentry_issues(limit)
        return issues
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error retrieving Sentry issues: {str(e)}"
        )


@router.post("/sentry/sync", response_model=dict)
async def sync_sentry_logs(db: Session = Depends(get_db)):
    """
    Endpoint to sync Sentry logs to the database
    """
    try:
        # Get issues from Sentry
        issues = SentryService.get_sentry_issues(limit=100)
        saved_files = []

        # For each issue, get events and save them as log files
        for issue in issues:
            issue_id = issue.get("id")
            if not issue_id:
                continue

            events = SentryService.get_issue_events(issue_id)

            for event in events:
                # Create a structured log file name
                event_id = event.get("eventID", "unknown")
                title = issue.get("title", "unknown").replace(" ", "_")[:30]
                filename = f"sentry/{title}/{event_id}.json"

                # Convert event to string
                content = json.dumps(event, indent=2)

                # Save to database
                log_file = LogFile(filename=filename, content=content)
                db.add(log_file)
                saved_files.append(filename)

        db.commit()
        return {
            "message": f"Synced {len(saved_files)} Sentry logs",
            "files": saved_files,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error syncing Sentry logs: {str(e)}"
        )
