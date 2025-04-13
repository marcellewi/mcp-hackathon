# backend/app/services/sentry_service.py
import os
from typing import Any, Dict, List

import httpx


class SentryService:
    @staticmethod
    def get_credentials():
        """Get Sentry credentials from environment variables"""
        token = os.getenv("SENTRY_AUTH_TOKEN", "")
        org = os.getenv("SENTRY_ORG", "franco-galeano")
        project = os.getenv("SENTRY_PROJECT", "metria-back")

        if not token:
            # Fall back to hardcoded token if env var not set
            token = "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"

        return token, org, project

    @staticmethod
    def get_sentry_issues(limit: int = 100) -> List[Dict[Any, Any]]:
        """
        Fetch issues from Sentry API
        """
        token, org, project = SentryService.get_credentials()
        url = f"https://us.sentry.io/api/0/projects/{org}/{project}/issues/"

        headers = {
            "Authorization": f"Bearer {token}",
        }

        params = {
            "limit": limit,
            "statsPeriod": "14d",  # Last 14 days
        }

        try:
            response = httpx.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            # Log the error but return empty list to avoid breaking the application
            print(f"Error fetching Sentry issues: {str(e)}")
            return []

    @staticmethod
    def get_issue_events(issue_id: str, limit: int = 100) -> List[Dict[Any, Any]]:
        """
        Fetch events for a specific issue
        """
        token, _, _ = SentryService.get_credentials()
        url = f"https://us.sentry.io/api/0/issues/{issue_id}/events/"

        headers = {
            "Authorization": f"Bearer {token}",
        }

        params = {"limit": limit}

        try:
            response = httpx.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            # Log the error but return empty list to avoid breaking the application
            print(f"Error fetching Sentry events: {str(e)}")
            return []
