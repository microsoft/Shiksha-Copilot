# Translation Component

This directory contains a complete end-to-end translation pipeline for building machine learning models that can translate between languages (primarily designed for English/Kannada translation). It provides three main sub-components: data collection, model training, and inference.

## Overview

The translation component consists of three main stages:

1. **Data Collection** - Scripts to extract and prepare parallel translation data from educational materials
2. **Training** - Fine-tuning scripts for training translation models using LoRA (Low-Rank Adaptation)
3. **Inference** - Production-ready inference scripts for performing translations

## Directory Structure

```
os_code/
├── data_collection/    # Scripts for collecting and processing translation data
├── training/           # Model training and fine-tuning scripts
├── inference/          # Inference and translation scripts
└── README.md           # This file
```

## Quick Start

### Prerequisites

- Python 3.9 or higher
- CUDA-compatible GPU (recommended for training)
- Required Python packages (see individual component requirements)

### Installation

1. Navigate to the desired component directory
2. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```

### Usage

Please refer to the individual README files in the respective directories of the three stages for detailed usage instructions.

## Components

### Data Collection
Located in `data_collection/`, this provides tools for:
- **PDF Processing**: Convert educational PDFs to images
- **OCR Extraction**: Extract text from images using OCR
- **Sentence Alignment**: Match sentences between source and target languages
- **Data Cleaning**: Clean and filter translation pairs
- **Synthetic Data Generation**: Generate additional training data

**Key Features:**
- Supports NCERT textbook processing
- Handles mathematical content with specialized filters
- Uses GPT-based sentence matching for high-quality pairs
- Generates synthetic data from glossaries

### Training
Located in `training/`, this component provides:
- **LoRA Fine-tuning**: Efficient fine-tuning using Low-Rank Adaptation
- **SFT Format Support**: Structured Fine-Tuning data format
- **Configurable Parameters**: Customizable training parameters
- **Model Evaluation**: Built-in evaluation metrics

**Key Features:**
- Memory-efficient training with LoRA
- Support for various base models
- Wandb integration for experiment tracking
- BLEU score evaluation

### Inference
Located in `inference/`, this component provides:
- **Inference Scripts**: Scripts for performing translations using the trained models
- **Post-processing**: Clean and format translation outputs
- **Multiple Output Formats**: Support for JSON and Word document outputs
- **Helper Scripts**: Additional utilities for document conversion

**Key Features:**
- GPU-accelerated inference
- Configurable input/output formats
- Built-in post-processing pipeline
- Support for custom resource filtering

## Data Format

The pipeline expects data in SFT (Structured Fine-Tuning) format:

```json
[
    {
        "messages": [
            {
                "role": "user",
                "content": "Translate from English to Telugu: The green color in leaves is due to chlorophyll."
            },
            {
                "role": "assistant",
                "content": "ఆకులలో పచ్చని రంగు క్లోరోఫిల్ వల్ల వస్తుంది."
            }
        ]
    }
]
```

## Configuration

Each sub-component has its own configuration requirements:

- **Data Collection**: Modify paths and language settings in individual scripts
- **Training**: Adjust `TrainingArguments` in `ft.py`
- **Inference**: Configure resource filtering and the path of trained model in `inference.py`

## Troubleshooting

### Common Issues

1. **CUDA Out of Memory**: Reduce batch size in training configuration
2. **OCR Quality**: Ensure high-quality input images for better text extraction
3. **Translation Quality**: Use more training data or adjust hyperparameters

### Getting Help

For issues specific to individual components, refer to the README files in each subdirectory:
- `data_collection/Readme.md`
- `training/Readme.md`
- `inference/Readme.md`
