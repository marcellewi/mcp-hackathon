import os
import zipfile
import shutil

from app.config import TEMP_DIR
from app.database.models import LogFile
from sqlalchemy.orm import Session


class LogService:
    @staticmethod
    def process_file(file_content, filename, db: Session):
        """
        Process a single file and save its content to the database
        """
        print(f"Processing single file: {filename}")

        # Check if file is a zip
        if filename.endswith(".zip"):
            return LogService.process_zip_file(file_content, filename, db)

        # Process as a regular file
        try:
            # Decode content assuming it's text
            content = file_content.decode("utf-8", errors="ignore")

            # Create log file entry
            log_file = LogFile(filename=filename, content=content)

            print(f"Adding log file to database: {log_file.filename}")
            db.add(log_file)
            db.commit()

            return [filename]
        except Exception as e:
            print(f"Error processing file {filename}: {str(e)}")
            raise e

    @staticmethod
    def process_zip_file(zip_file, zip_filename=None, db: Session=None):
        """
        Extract txt files from the zip and save their contents to the database
        """
        # Create a temporary file to save the uploaded zip
        temp_zip_path = os.path.join(TEMP_DIR, "temp.zip")

        print(f"Creating temporary zip file at: {temp_zip_path}")
        with open(temp_zip_path, "wb") as f:
            f.write(zip_file)

        saved_files = []

        # Get the zip name without extension for prefixing files
        zip_name = ""
        if zip_filename:
            # Extract just the filename without path and extension
            zip_name = os.path.splitext(os.path.basename(zip_filename))[0]
            print(f"Using zip name as folder prefix: {zip_name}")
        else:
            print("Warning: No zip filename provided, files will be stored without folder prefix")

        print("Opening zip file for extraction")
        # Extract all txt files
        with zipfile.ZipFile(temp_zip_path, "r") as zip_ref:
            file_list = zip_ref.infolist()
            print(f"Found {len(file_list)} files in zip archive")

            for file_info in file_list:
                # Skip files with no name or that start with .
                original_filename = file_info.filename
                basename = os.path.basename(original_filename)
                if not basename or basename.startswith('.'):
                    print(f"Skipping file: {original_filename} (no name or starts with .)")
                    continue

                # Check if the file already has a folder structure
                # Don't add additional prefix if it does
                if '/' in original_filename and zip_name:
                    parts = original_filename.split('/')
                    if parts[0] == zip_name:
                        # This file is already prefixed with the same zip name
                        prefixed_filename = original_filename
                        print(f"File already has correct prefix: {prefixed_filename}")
                    else:
                        # File has some other structure, preserve it under this zip name
                        prefixed_filename = f"{zip_name}/{original_filename}"
                        print(f"Adding prefix to existing structure: {prefixed_filename}")
                else:
                    # Create a prefixed filename with the zip name if needed
                    prefixed_filename = original_filename
                    if zip_name:
                        prefixed_filename = f"{zip_name}/{basename}"
                        print(f"Adding prefix to file: {prefixed_filename}")

                # Process all valid files
                print(f"Processing file: {prefixed_filename}")
                with zip_ref.open(original_filename) as file:
                    content = file.read().decode("utf-8", errors="ignore")

                log_file = LogFile(
                    filename=prefixed_filename, content=content
                )

                print(f"Adding log file to database: {log_file.filename}")
                db.add(log_file)
                saved_files.append(prefixed_filename)

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
