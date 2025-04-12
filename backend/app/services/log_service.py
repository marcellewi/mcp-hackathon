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

        print("Opening zip file for extraction")
        # Extract all txt files
        with zipfile.ZipFile(temp_zip_path, "r") as zip_ref:
            file_list = zip_ref.infolist()
            print(f"Found {len(file_list)} files in zip archive")

            for file_info in file_list:
                # Skip files with no name or that start with .
                filename = file_info.filename
                basename = os.path.basename(filename)
                if not basename or basename.startswith('.'):
                    print(f"Skipping file: {filename} (no name or starts with .)")
                    continue

                # Process all valid files
                print(f"Processing file: {filename}")
                with zip_ref.open(filename) as file:
                    content = file.read().decode("utf-8", errors="ignore")

                log_file = LogFile(
                    filename=basename, content=content
                )

                print(f"Adding log file to database: {log_file.filename}")
                db.add(log_file)
                saved_files.append(filename)

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
