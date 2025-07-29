from typing import Dict, List, Optional, Union
from pydantic import BaseModel, Field


class PageRange(BaseModel):
    """Model representing a range of pages in a document."""

    start_page: int = Field(..., description="The starting page number of the range")
    end_page: int = Field(..., description="The ending page number of the range")


class Section(BaseModel):
    """Model representing a section in a table of contents."""

    serial_number: int = Field(
        0, description="The serial number or chapter number of the section"
    )
    name: str = Field(..., description="The name of the section")
    page_range: PageRange = Field(..., description="The page range of the section")


class TableOfContent(BaseModel):
    """
    Model representing a table of contents for a document, containing section names
    and their associated page ranges.
    """

    sections: List[Section] = Field(
        default_factory=list, description="A list of sections with their page ranges"
    )
