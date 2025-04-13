import httpx
import base64
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Query, Body, Path
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
import dotenv

from app.database import get_db
from app.database.models import GitHubSelection
from sqlalchemy.orm import Session

router = APIRouter()
dotenv.load_dotenv()

GITHUB_API_URL = "https://api.github.com"
# Get GitHub token from environment variables
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")

headers = {
    "Accept": "application/vnd.github.v3+json",
    "X-GitHub-Api-Version": "2022-11-28"
}
if GITHUB_TOKEN:
    headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
else:
    print("Warning: GITHUB_TOKEN not found in environment variables. API rate limits will be restricted.")

print(f"GitHub token: {GITHUB_TOKEN}")
class GitHubTreeNode(BaseModel):
    path: str
    mode: str
    type: str  # "blob" for file, "tree" for directory
    sha: str
    size: Optional[int] = None
    url: str

class GitHubTreeResponse(BaseModel):
    sha: str
    url: str
    tree: List[GitHubTreeNode]
    truncated: bool

class AddRepoPayload(BaseModel):
    url: HttpUrl

class UpdateSelectionPayload(BaseModel):
    selected_files: List[str]

class GitHubSelectionDetailResponse(BaseModel):
    id: str
    name: str
    url: str
    selected_files: Optional[List[str]] = None
    created_at: Optional[datetime] = None # Keep as datetime for internal use

class GitHubSelectionListResponse(BaseModel):
    id: str
    name: str
    url: str
    created_at: Optional[datetime] = None

async def get_repo_info(repo_url: str):
    """Helper to extract owner and repo name from URL."""
    try:
        parts = repo_url.strip('/').split('/')
        if "github.com" not in parts[-3]:
            raise ValueError("Invalid GitHub URL")
        owner = parts[-2]
        repo = parts[-1].replace('.git', '')
        return owner, repo
    except Exception as e:
        print(f"Error parsing repo URL {repo_url}: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid GitHub repository URL: {repo_url}")

@router.get("/tree", response_model=GitHubTreeResponse)
async def get_github_repo_tree(repo_url: str = Query(..., description="Full URL of the GitHub repository (e.g., https://github.com/owner/repo)")):
    """Fetches the file tree structure of a GitHub repository recursively."""
    owner, repo = await get_repo_info(repo_url)
    api_url = f"{GITHUB_API_URL}/repos/{owner}/{repo}/git/trees/main?recursive=1" # Assumes main branch

    async with httpx.AsyncClient() as client:
        try:
            print(f"Fetching tree for {owner}/{repo} from {api_url}")
            response = await client.get(api_url, headers=headers)
            response.raise_for_status()  # Raise HTTP errors
            data = response.json()
            print(f"Successfully fetched tree, truncated: {data.get('truncated')}")
            return data
        except httpx.HTTPStatusError as e:
            print(f"GitHub API error: {e.response.status_code} - {e.response.text}")
            detail = f"Error fetching repository tree from GitHub: {e.response.status_code}"
            if e.response.status_code == 404:
                detail = "Repository not found or main branch does not exist."
            elif e.response.status_code == 403:
                detail = "GitHub API rate limit exceeded or insufficient permissions."
            raise HTTPException(status_code=e.response.status_code, detail=detail)
        except Exception as e:
            print(f"Unexpected error fetching GitHub tree: {e}")
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@router.get("/selections", response_model=List[GitHubSelectionListResponse])
async def list_github_selections(db: Session = Depends(get_db)):
    """Lists all saved GitHub repository selections."""
    try:
        selections = db.query(GitHubSelection).order_by(GitHubSelection.created_at.desc()).all()
        print(f"Returning {len(selections)} saved GitHub selections.")
        return selections # Pydantic will handle conversion including datetime
    except Exception as e:
        print(f"Error listing GitHub selections: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve GitHub selections")

@router.post("/add-repo", response_model=GitHubSelectionDetailResponse, status_code=201)
async def add_github_repo(
    payload: AddRepoPayload,
    db: Session = Depends(get_db)
):
    """Adds a GitHub repository URL to the database immediately."""
    try:
        owner, repo = await get_repo_info(str(payload.url))
        repo_name = f"{owner}/{repo}"

        # Check if repo already exists
        existing_repo = db.query(GitHubSelection).filter(GitHubSelection.url == str(payload.url)).first()
        if existing_repo:
             print(f"Repository {repo_name} already exists with ID: {existing_repo.id}")
             return existing_repo # Return existing one

        print(f"Adding new repository: {repo_name}")

        new_selection = GitHubSelection(
            name=repo_name,
            url=str(payload.url),
            selected_files=None # Initially null
        )

        db.add(new_selection)
        db.commit()
        db.refresh(new_selection)

        print(f"Successfully added repository with ID: {new_selection.id}")
        return new_selection

    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        print(f"Error adding GitHub repo: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add repository: {str(e)}")

@router.get("/{selection_id}", response_model=GitHubSelectionDetailResponse)
async def get_github_selection_details(
    selection_id: str = Path(..., description="The ID of the GitHub selection"),
    db: Session = Depends(get_db)
):
    """Gets the details of a specific GitHub selection, including selected files."""
    try:
        selection = db.query(GitHubSelection).filter(GitHubSelection.id == selection_id).first()
        if not selection:
            raise HTTPException(status_code=404, detail="GitHub selection not found")
        print(f"Returning details for selection ID: {selection_id}")
        return selection
    except Exception as e:
        print(f"Error getting GitHub selection details: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve selection details")

@router.put("/{selection_id}/update-selection", response_model=GitHubSelectionDetailResponse)
async def update_github_file_selection(
    payload: UpdateSelectionPayload,
    selection_id: str = Path(..., description="The ID of the GitHub selection to update"),
    db: Session = Depends(get_db)
):
    """Updates the selected files for a specific GitHub repository selection."""
    try:
        selection = db.query(GitHubSelection).filter(GitHubSelection.id == selection_id).first()
        if not selection:
            raise HTTPException(status_code=404, detail="GitHub selection not found")

        print(f"Updating selection for ID: {selection_id}")
        print(f"New selected files: {len(payload.selected_files)}")

        selection.selected_files = payload.selected_files
        db.commit()
        db.refresh(selection)

        print(f"Successfully updated selection for ID: {selection_id}")
        return selection

    except Exception as e:
        db.rollback()
        print(f"Error updating GitHub selection: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update selection: {str(e)}")
