# SmolDocling Text Extractor

A textbook data extraction module using SmolDocling AI model for converting PDF documents to structured markdown format.

## Overview

This module provides a text extraction pipeline that:
- Converts PDF pages to images
- Uses the SmolDocling vision-language model to extract structured content
- Outputs clean markdown format preserving document structure

## Features

- ✅ PDF to markdown conversion
- ✅ GPU/CPU support with automatic device detection
- ✅ Page-by-page processing for large documents
- ✅ Preserves document structure and formatting
- ✅ Handles multi-column layouts and mathematical equations

## Quick Start

### Prerequisites

- Python 3.10+
- CUDA-compatible GPU (optional, for faster processing)

### Installation

1. **Install dependencies:**
   ```bash
   poetry install
   ```

2. **For GPU support (recommended):**
   ```bash
   pip install flash-attn --no-build-isolation
   ```

### Usage

```python
from smoldocling_extractor import SmolDoclingTextExtractor

# Initialize the extractor
extractor = SmolDoclingTextExtractor()

# Extract text from PDF
markdown_text = extractor.extract_text("path/to/your/document.pdf")
print(markdown_text)
```

## Try It Locally

1. **Clone and navigate to the module:**
   ```bash
   cd ingestion-pipeline-smoldocling
   ```

2. **Install dependencies:**
   ```bash
   poetry install
   ```

3. **Run tests:**
   ```bash
   poetry run pytest tests/ -v
   ```

4. **Test with sample files:**
   ```bash
   poetry run pytest tests/test_basic.py::test_math_english -s
   ```

The extracted markdown will be saved in `tests/files/smoldocling/` directory.

## Configuration

- **Model**: Uses `ds4sd/SmolDocling-256M-preview` by default
- **Device**: Automatically detects CUDA/CPU
- **DPI**: PDF conversion at 200 DPI for optimal quality

## Dependencies

- `docling-core`: Document processing framework
- `transformers`: Hugging Face model support
- `torch`: PyTorch for model inference
- `pdf2image`: PDF to image conversion