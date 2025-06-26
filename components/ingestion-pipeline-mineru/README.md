# MinerU Text Extractor

A PDF text extraction component that uses [MinerU's magic-pdf library](https://github.com/opendatalab/MinerU) to extract structured text from PDF documents with advanced document layout analysis and OCR capabilities.

## Features

- **Advanced Document Analysis**: Uses state-of-the-art models for layout detection, table recognition, and formula extraction
- **OCR Support**: Handles both digital and scanned PDFs with configurable OCR modes
- **Structured Output**: Returns well-formatted Markdown with preserved document structure
- **Flexible Extraction**: Supports both full-document and page-by-page extraction modes
- **Model Management**: Automated downloading and configuration of required ML models

## Installation

1. **Install dependencies**:
   ```bash
   poetry install
   ```

2. **Download required models**:
   ```bash
   poetry run python src/mineru_extractor/download_models_hf.py
   ```
   
   This downloads the following models:
   - Layout detection models (LayoutLMv3, YOLO)
   - Mathematical formula detection (MFD)
   - Mathematical formula recognition (MFR) 
   - Table recognition models (TableMaster, StructEqTable)
   - Layout reading models

## Usage

```python
from mineru_extractor import MinerUTextExtractor

# Initialize the extractor
extractor = MinerUTextExtractor()

# Extract text with default settings (OCR enabled)
text = extractor.extract_text("document.pdf")

# Extract with custom options
text = extractor.extract_text(
    "document.pdf",
    ocr=True,                    # Enable/disable OCR
    extract_per_page=False,      # Full document vs page-by-page
    image_dir="output/images",   # Directory for processed images
    dpi=200                      # Image resolution for page extraction
)
```

## Configuration Options

| Parameter | Default | Description |
|-----------|---------|-------------|
| `ocr` | `True` | Enable OCR for scanned documents |
| `extract_per_page` | `False` | Extract page-by-page vs full document |
| `image_dir` | `"mineru-output/images"` | Directory for storing processed images |
| `dpi` | `200` | Resolution for page image extraction |

## Model Information

The extractor automatically downloads models from Hugging Face:
- **PDF-Extract-Kit-1.0**: Core document analysis models
- **layoutreader**: Advanced layout understanding model

Models are configured in `~/magic-pdf.json` after running the download script.

## Dependencies

- `magic-pdf`: Core MinerU library with full OCR capabilities
- `pdf2image`: PDF to image conversion
- `huggingface-hub`: Model downloading and management
- `ingestion-pipeline`: Base text extraction interface

For detailed model information, see: https://github.com/opendatalab/MinerU/blob/master/docs/how_to_download_models_en.md