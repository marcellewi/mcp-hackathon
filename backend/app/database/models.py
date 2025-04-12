from sqlalchemy import Column, DateTime, Integer, String, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()


class LogFile(Base):
    __tablename__ = "log_files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    content = Column(Text)
    created_at = Column(DateTime, default=func.now())


class GitHubSelection(Base):
    __tablename__ = "github_selections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True) # Can be derived from URL or set manually
    url = Column(String, nullable=False)
    selected_files = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
