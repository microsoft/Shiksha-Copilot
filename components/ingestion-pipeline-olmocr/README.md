# OLMOCR Text Extractor

A high-quality text extraction component using AllenAI's OLMOCR model for PDF document processing. This extractor converts PDF pages to images and uses a vision-language model to extract natural language text with better understanding of document structure and layout.

## Features

- **Advanced OCR**: Uses OLMOCR-7B model for superior text extraction quality
- **Layout Understanding**: Maintains document structure and formatting context
- **GPU Accelerated**: Optimized for NVIDIA GPUs with CUDA support
- **Single/Multi-page Processing**: Extract from individual pages or entire documents
- **Anchor Text Integration**: Uses PDF metadata to improve extraction accuracy

## Requirements

- **Hardware**: NVIDIA GPU with at least 20GB VRAM (tested on RTX 4090, L40S, A100, H100)
- **Software**: 
  - Python 3.11+
  - CUDA-compatible PyTorch
  - 30GB free disk space

## Installation

### 1. Install System Dependencies

```bash
sudo apt-get update
sudo apt-get install poppler-utils
```

### 2. Install Python Dependencies

```bash
# Navigate to the component directory
cd components/ingestion-pipeline-olmocr

# Install using Poetry
poetry install

# Or install using pip (in a virtual environment)
pip install -e .
```

## Usage

### Basic Text Extraction

```python
from olmocr_extractor import OlmocrTextExtractor

# Initialize the extractor
extractor = OlmocrTextExtractor()

# Extract text from a single page (default: page 1)
text = extractor.extract_text("document.pdf")

# Extract text from a specific page
text = extractor.extract_text("document.pdf", page_number=3)

# Extract text from all pages
text = extractor.extract_text("document.pdf", all_pages=True)
```

## Configuration

The extractor uses the following default settings:
- **Model**: `allenai/olmOCR-7B-0225-preview`
- **Image Resolution**: 1024px (longest dimension)
- **Temperature**: 0.8
- **Max Tokens**: 8192
- **Precision**: bfloat16

## Performance

- **Processing Speed**: ~2-5 seconds per page (depending on GPU)
- **Memory Usage**: ~20GB GPU VRAM
- **Quality**: High accuracy for structured documents, equations, and multi-column layouts

## Troubleshooting

### Common Issues

1. **CUDA Out of Memory**: Reduce batch size or use a GPU with more VRAM
2. **Model Download Fails**: Check internet connection and available disk space
3. **Poor Quality Output**: Ensure PDF resolution is adequate and pages are not corrupted

### Debug Mode

Enable debug logging to inspect intermediate outputs:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```