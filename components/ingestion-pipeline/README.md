# Ingestion Pipeline

A comprehensive Python library for textbook digitization and metadata extraction. This pipeline provides modular components for extracting text from PDFs using various methods (OCR, Azure Form Recognizer, LLMs), post-processing extracted text, and extracting structured metadata.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Base Classes](#base-classes)
- [Text Extractors](#text-extractors)
- [Text Post-processors](#text-post-processors)
- [Metadata Extractors](#metadata-extractors)
- [Utilities](#utilities)
- [Pipeline Framework](#pipeline-framework)
- [Examples](#examples)
- [API Reference](#api-reference)
- [Contributing](#contributing)

## Features

- **Multiple Text Extraction Methods**: Support for Tesseract OCR, Azure Form Recognizer, and LLM-based extraction
- **Intelligent Text Post-processing**: Clean and restructure extracted text using LLMs
- **Metadata Extraction**: Extract structured metadata from textbook content
- **PDF Processing**: Split PDFs by page ranges or table of contents
- **Table of Contents Extraction**: Automatically extract TOC using LLMs
- **Modular Architecture**: Extensible base classes for custom implementations
- **Pipeline Framework**: Orchestrate complex processing workflows

## Installation

```bash
# Install using Poetry (recommended)
poetry install

# Or using pip
pip install -e .
```

### Dependencies

- Python 3.10+
- pytesseract (for OCR)
- azure-ai-formrecognizer (for Azure Form Recognizer)
- pdf2image (for PDF to image conversion)
- litellm (for LLM integration)
- PyPDF2 (for PDF manipulation)
- Pillow (for image processing)
- pydantic (for data models)

## Quick Start

```python
from ingestion_pipeline.text_extractors.azure_form_recognizer import AzureFormRecognizerTextExtractor
from ingestion_pipeline.text_postprocessors.clean_markdown_post_processor import CleanMarkdownPostProcessor

# Initialize components
extractor = AzureFormRecognizerTextExtractor(
    endpoint="your-endpoint",
    key="your-key"
)
postprocessor = CleanMarkdownPostProcessor()

# Extract and process text
raw_text = extractor.extract_text("path/to/document.md")
result = postprocessor.post_process(
    raw_text,
    deployment_name="gpt-4",
    api_base="your-endpoint",
    api_key="your-key"
)
print(result)
```

## Architecture Overview

The ingestion pipeline follows a modular architecture with clear separation of concerns:

```
ingestion_pipeline/
├── base/                    # Abstract base classes and interfaces
├── text_extractors/         # Text extraction implementations
├── text_postprocessors/     # Text cleaning and processing
├── metadata_extractors/     # Structured metadata extraction
└── utils/                   # Utility functions and helpers
```

## Text Extractors

### AzureFormRecognizerTextExtractor

Extracts text using Azure Form Recognizer service.

```python
from ingestion_pipeline.text_extractors.azure_form_recognizer import AzureFormRecognizerTextExtractor

extractor = AzureFormRecognizerTextExtractor(
    endpoint="https://your-resource.cognitiveservices.azure.com/",
    key="your-api-key"
)

text = extractor.extract_text("document.pdf", model="prebuilt-document")
```

**Features:**
- High-quality text extraction
- Support for multiple document formats
- Custom model support
- Page-by-page processing

### TesseractTextExtractor

OCR-based text extraction using Tesseract.

```python
from ingestion_pipeline.text_extractors.tesseract_ocr import TesseractTextExtractor

extractor = TesseractTextExtractor()
text = extractor.extract_text("document.pdf", two_columns=True)
```

**Features:**
- Free and open-source
- Two-column layout support
- Configurable OCR settings
- Supports multiple languages

### LLMTextExtractor

Advanced text extraction using Large Language Models with vision capabilities.

```python
from ingestion_pipeline.text_extractors.llm_extractor import LLMTextExtractor

extractor = LLMTextExtractor(
    api_key="your-openai-key",
    api_base="https://your-openai-endpoint",
    deployment_name="gpt-4-vision",
    api_version="2024-02-15-preview"
)

text = extractor.extract_text(
    "document.pdf",
    batch_size=3,
    document_structure_hint="Two-column academic paper with equations"
)
```

**Features:**
- Intelligent text extraction with context understanding
- Markdown format output
- Batch processing with context retention
- Mathematical equation recognition
- Table and diagram description
- Multi-column layout handling

## Text Post-processors

### CleanMarkdownPostProcessor

Cleans and restructures extracted markdown text using LLMs.

```python
from ingestion_pipeline.text_postprocessors.clean_markdown_post_processor import CleanMarkdownPostProcessor

processor = CleanMarkdownPostProcessor()
cleaned_text = processor.post_process(
    raw_markdown,
    deployment_name="gpt-4",
    api_base="your-endpoint",
    api_key="your-key"
)
```

**Features:**
- OCR error correction
- Heading structure normalization
- Mathematical notation formatting
- Repetition removal
- Content reorganization
- Segment-based processing for large documents

## Metadata Extractors

### SimpleMetadataExtractor

Extracts structured metadata from textbook content using LLMs.

Note: Descriptions of Pydantic model attributes are used as part of LLM prompts. 

```python
from ingestion_pipeline.metadata_extractors.simple_metadata_extractor import SimpleMetadataExtractor
from pydantic import BaseModel, Field
from typing import List

class ChapterMetadata(BaseModel):
    title: str = Field(..., description="Chapter title")
    topics: List[str] = Field(default_factory=list, description="Main topics covered")
    learning_objectives: List[str] = Field(default_factory=list, description="Learning objectives")

extractor = SimpleMetadataExtractor()
metadata = extractor.extract(
    chapter_text,
    ChapterMetadata,
    deployment_name="gpt-4",
    api_base="your-endpoint",
    api_key="your-key"
)
```

**Features:**
- Flexible schema support via Pydantic models
- Chunk-based processing for large documents
- Automatic data merging and cleanup
- JSON schema validation
- Customizable field descriptions

## Utilities

### PDFSplitter

Split PDF files by page ranges or table of contents.

```python
from ingestion_pipeline.utils.pdf_splitter import PDFSplitter

splitter = PDFSplitter("textbook.pdf")

# Split by page ranges
output_files = splitter.split([
    (1, 10),    # Pages 1-10
    (11, 25),   # Pages 11-25
    (26, 50)    # Pages 26-50
], output_dir="chapters/")

# Split by table of contents
from ingestion_pipeline.base.data_model import TableOfContent

output_files = splitter.split_by_toc(toc_object, output_dir="sections/")
```

**Features:**
- Page range validation
- Automatic output directory creation
- Table of contents-based splitting
- Page offset support
- Safe filename generation

### TableOfContentsExtractor

Extract table of contents using LLM vision capabilities.

```python
from ingestion_pipeline.utils.toc_extractor import TableOfContentsExtractor

toc_extractor = TableOfContentsExtractor(
    api_key="your-key",
    api_base="your-endpoint",
    deployment_name="gpt-4-vision",
    api_version="2024-02-15-preview"
)

toc = toc_extractor.extract_table_of_contents(
    "textbook.pdf",
    page_range=(1, 5),  # Look for TOC in first 5 pages
    document_specific_hint="Academic textbook with numbered chapters"
)
```

**Features:**
- Automatic TOC page detection
- Structured output with page ranges
- Document context awareness
- Multi-page TOC support
- Flexible page range specification

## Pipeline Framework

The pipeline framework provides orchestration capabilities for complex workflows.

### BasePipelineStep

The pipeline framework provides a base class for creating custom processing steps. Each step defines its input and output types, has a unique name and description, and implements a `process` method that performs the actual work. Steps can validate their inputs, handle errors gracefully, and report their status and outputs in a standardized way.

### Pipeline Execution

The pipeline execution system allows you to register custom steps, configure which steps to run, and execute them in sequence. The pipeline maintains state between steps, handles step failures gracefully, and can resume from any point. Each step's outputs become available as inputs for subsequent steps.

## Real-World Examples

For comprehensive, real-world examples of how to use the ingestion pipeline components, refer to the `shiksha-ingestion/` folder in the repository root. This folder contains:

- **`pipeline_runner.py`**: Complete end-to-end pipeline implementation demonstrating how to orchestrate multiple processing steps
- **`pipeline_steps/`**: Individual step implementations showing practical usage of:
  - Table of contents extraction (`step_1_toc_extraction.py`)
  - PDF splitting by chapters (`step_2_pdf_splitting.py`) 
  - Text extraction using different methods (`step_3_text_extraction_*.py`)
  - Text cleaning and post-processing (`step_4_clean_extracted_text.py`)
  - Metadata extraction workflows (`step_5_subtopic_chapter_level_los_extraction.py`, `step_7_subtopic_wise_lo_extraction.py`)
  - Rule-based text processing (`step_6_subtopic_extraction_rule_based_cleaning.py`)

These examples demonstrate production-ready implementations that combine multiple components from this library to process educational textbooks and extract structured learning content.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes following the base class interfaces
4. Add tests for your implementation
5. Submit a pull request

### Adding Custom Components

To extend the pipeline with custom components, inherit from the appropriate base class and implement the required methods. For text extractors, implement the `extract_text` method. For post-processors, implement `post_process`. For metadata extractors, implement the `extract` method. The base classes ensure your components integrate seamlessly with the rest of the pipeline.
