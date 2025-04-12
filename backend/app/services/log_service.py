import os
import zipfile

from sqlalchemy.orm import Session

from app.config import TEMP_DIR
from app.database.models import LogFile


class LogService:
    @staticmethod
    def process_zip_file(zip_file, db: Session):
        """
        Extract txt files from the zip and save their contents to the database
        """
        # Create a temporary file to save the uploaded zip
        temp_zip_path = os.path.join(TEMP_DIR, "temp.zip")

        with open(temp_zip_path, "wb") as f:
            f.write(zip_file)

        saved_files = []

        # Extract all txt files
        with zipfile.ZipFile(temp_zip_path, "r") as zip_ref:
            for file_info in zip_ref.infolist():
                if file_info.filename.endswith(".txt"):
                    # Extract the file content
                    with zip_ref.open(file_info.filename) as file:
                        content = file.read().decode("utf-8", errors="ignore")

                    # Create a new log file record
                    log_file = LogFile(
                        filename=os.path.basename(file_info.filename), content=content
                    )

                    # Add to the session
                    db.add(log_file)
                    saved_files.append(file_info.filename)

        # Commit the changes
        db.commit()

        # Clean up
        os.remove(temp_zip_path)

        return saved_files
