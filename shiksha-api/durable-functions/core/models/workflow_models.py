from enum import Enum
from typing import Dict, List, Optional, Union, Any
from pydantic import BaseModel, Field


class Mode(str, Enum):
    """Mode of generating a section"""

    RAG = "rag"  # Using RAG for the section
    GPT = "gpt"  # Using GPT directly for the section


class Dependency(BaseModel):
    """Represents a dependency on another section"""

    section_id: str = Field(
        ..., description="ID of the section that this section depends on"
    )


class SectionDefinition(BaseModel):
    """Definition of a section in a lesson plan"""

    id: str = Field(..., description="Unique identifier for the section")
    title: str = Field(..., description="Title of the section")
    description: str = Field(..., description="Description of the section")
    mode: Mode = Field(..., description="Mode of generating the section - RAG or GPT")
    dependencies: List[Dependency] = Field(
        default_factory=list, description="List of dependencies on other sections"
    )
    output_format: Optional[Dict[str, Any]] = Field(
        None, description="JSON schema for output format if required"
    )


class WorkflowDefinition(BaseModel):
    """Definition of a lesson plan workflow"""

    id: str = Field(..., description="Unique identifier for the workflow", alias="_id")
    name: str = Field(..., description="Name of the workflow")
    description: str = Field(..., description="Description of the workflow")
    sections: List[SectionDefinition] = Field(
        ..., description="List of sections in the workflow"
    )


class RAGInput(BaseModel):
    """Input for RAG-based section generation"""

    index_path: str = Field(..., description="Path to the index for content retrieval")
    response_synthesis_query: str = Field(
        ..., description="Query to synthesize the response"
    )


class GPTInput(BaseModel):
    """Input for GPT-based section generation"""

    prompt: str = Field(..., description="Prompt for GPT to generate content")


class SectionOutput(BaseModel):
    """Output of a section generation"""

    section_id: str = Field(..., description="ID of the section")
    section_title: str = Field(..., description="Title of the section")
    content: Union[str, Dict[str, Any]] = Field(
        ..., description="Content of the section, string or structured JSON"
    )


class ValidationResult(BaseModel):
    """Validation result for a lesson plan"""

    is_valid: bool = Field(..., description="Whether the lesson plan is valid")
    errors: List[str] = Field(
        default_factory=list, description="List of errors in the lesson plan"
    )
    warnings: List[str] = Field(
        default_factory=list, description="List of warnings in the lesson plan"
    )
