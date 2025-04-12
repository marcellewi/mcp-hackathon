import os
import zipfile

from app.config import TEMP_DIR
from app.database.models import LogFile
from sqlalchemy.orm import Session


class LogService:
    @staticmethod
    def process_zip_file(zip_file, db: Session):
        """
        Extract txt files from the zip and save their contents to the database
        """
        # Create a temporary file to save the uploaded zip
        temp_zip_path = os.path.join(TEMP_DIR, "temp.zip")

        print(f"Creating temporary zip file at: {temp_zip_path}")
        with open(temp_zip_path, "wb") as f:
            f.write(zip_file)

        saved_files = []

        print(f"Opening zip file for extraction")
        # Extract all txt files
        with zipfile.ZipFile(temp_zip_path, "r") as zip_ref:
            file_list = zip_ref.infolist()
            print(f"Found {len(file_list)} files in zip archive")

            for file_info in file_list:
                if file_info.filename.endswith(".txt"):
                    print(f"Processing text file: {file_info.filename}")
                    with zip_ref.open(file_info.filename) as file:
                        content = file.read().decode("utf-8", errors="ignore")

                    log_file = LogFile(
                        filename=os.path.basename(file_info.filename), content=content
                    )

                    print(f"Adding log file to database: {log_file.filename}")
                    db.add(log_file)
                    saved_files.append(file_info.filename)
                else:
                    print(f"Skipping non-text file: {file_info.filename}")

        print(f"Committing {len(saved_files)} log files to database")
        db.commit()

        os.remove(temp_zip_path)

        return saved_files

    @staticmethod
    def get_all_logs(db: Session):
        """
        Retrieve all log files from the database
        """
        return db.query(LogFile).all()
