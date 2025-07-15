import json
from typing import Annotated, Literal, List
import aiohttp
from pydantic import BaseModel
import logging

from app.config import settings

logger = logging.getLogger(__name__)

VideoLengths = Literal["short", "medium", "long", "all"]


class VideoSearchResult(BaseModel):
    name: str = ""
    description: str = ""
    datePublished: str = ""
    publisher: list = ""
    creator: dict = ""
    contentUrl: str = ""


class WebSearchResult(BaseModel):
    name: str = ""
    url: str = ""
    datePublished: str = ""
    snippet: str = ""
    language: str = ""


class BingSearchService:
    """Service for performing Bing Video and Web searches."""

    # Constants for Bing API
    VIDEO_SEARCH_URL = "https://api.bing.microsoft.com/v7.0/videos/search"
    WEB_SEARCH_URL = "https://api.bing.microsoft.com/v7.0/search"

    def __init__(self):
        self.subscription_key = settings.bing_api_key
        if not self.subscription_key:
            logger.warning("Bing API key not configured")
        self.headers = (
            {"Ocp-Apim-Subscription-Key": self.subscription_key}
            if self.subscription_key
            else {}
        )

    async def _make_request(self, url: str, params: dict) -> dict:
        """Make HTTP request to Bing API."""
        if not self.subscription_key:
            raise ValueError("Bing API key is required but not configured")

        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(
                    url, headers=self.headers, params=params, timeout=60
                ) as response:
                    if response.status != 200:
                        logger.error(
                            f"Bing API error: {response.status} - {response.reason}"
                        )
                        raise Exception(
                            f"HTTP error: {response.status} - {response.reason}"
                        )
                    return await response.json()
            except aiohttp.ClientTimeout:
                logger.error("Bing API request timed out")
                raise TimeoutError("The request timed out. Please try again later.")
            except aiohttp.ClientError as e:
                logger.error(f"Bing API client error: {e}")
                raise Exception(f"An error occurred: {e}")

    async def search_videos(
        self,
        search_term: str,
        count: int = 10,
        video_length: Annotated[VideoLengths, "video_length"] = "all",
    ) -> List[VideoSearchResult]:
        """
        Search for videos using Bing Video Search API.

        Args:
            search_term: The search query
            count: Number of results to return
            video_length: Length filter for videos

        Returns:
            List of VideoSearchResult objects
        """
        params = {
            "q": search_term,
            "count": count,
            "pricing": "free",
            "videoLength": video_length,
        }

        try:
            search_results = await self._make_request(self.VIDEO_SEARCH_URL, params)
            results = [
                VideoSearchResult(**result)
                for result in search_results.get("value", [])
            ]
            logger.info(f"Found {len(results)} video results for query: {search_term}")
            return results
        except Exception as e:
            logger.error(f"Video search failed for query '{search_term}': {e}")
            return []

    async def search_web(
        self, search_term: str, count: int = 10
    ) -> List[WebSearchResult]:
        """
        Search for web pages using Bing Web Search API.

        Args:
            search_term: The search query
            count: Number of results to return

        Returns:
            List of WebSearchResult objects
        """
        params = {"q": search_term, "responseFilter": "webPages", "count": count}

        try:
            search_results = await self._make_request(self.WEB_SEARCH_URL, params)
            results = [
                WebSearchResult(**result)
                for result in search_results.get("webPages", {}).get("value", [])
            ]
            logger.info(f"Found {len(results)} web results for query: {search_term}")
            return results
        except Exception as e:
            logger.error(f"Web search failed for query '{search_term}': {e}")
            return []


# Global instance
bing_search_service = BingSearchService()
