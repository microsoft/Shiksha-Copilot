import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional

from ingestion_pipeline.base.pipeline import Pipeline, PipelineRegistry
from pipeline_steps import (
    TextExtractionLLMStep,
    TextCleaningStep,
    SubtopicChapterLOsExtractionStep,
    SubtopicCleaningStep,
    SubtopicWiseLOExtractionStep,
    CreateIndexStep
)

# Setup logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("pipeline_runner")

PIPELINE_CONFIG = {
    "grade": "6",
    "subject": "math",
    "chapter_number": "1",
    "chapter_title": "Knowing Our Numbers",
    "steps": [
        {
            "name": "text_extraction_llm",
            "enabled": True,
        },
        {
            "name": "text_cleaning",
            "enabled": True,
        },
        {
            "name": "subtopic_chapter_los_extraction",
            "enabled": True,
        },
        {"name": "subtopic_chapter_los_extraction", "enabled": True},
        {"name": "subtopic_cleaning", "enabled": True},
        {"name": "subtopic_wise_lo_extraction", "enabled": True},
        {"name": "create_index", "enabled": True},
    ],
}


def setup_registry() -> PipelineRegistry:
    """Set up and return the pipeline registry with all available steps."""
    registry = PipelineRegistry()

    # Register all steps
    registry.register_step(TextExtractionLLMStep)
    registry.register_step(TextCleaningStep)
    registry.register_step(SubtopicChapterLOsExtractionStep)
    registry.register_step(SubtopicCleaningStep)
    registry.register_step(SubtopicWiseLOExtractionStep)

    return registry


def get_chapter_identifier(pdf_path: str) -> str:
    """Extract a chapter identifier from a PDF path."""
    return Path(pdf_path).stem


def main():
    # Set up working directory
    initial_inputs = {
        "pdf": "/home/kchourasia/ShikshaOSS/TelanganaBoardBooks/split_pdfs/grade6/math/1.pdf"
    }
    # RUN ID: current datetime, in string format using datetime module
    from datetime import datetime

    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Create and run pipeline
    pipeline = Pipeline(
        config=PIPELINE_CONFIG,
        registry=setup_registry(),
        workdir=f"{os.getcwd()}/pipeline_output/{run_id}",
        initial_inputs=initial_inputs,
    )

    results = pipeline.run_from_step()

    # Print summary
    print("\nPipeline execution summary:")
    for step_name, result in results.items():
        status = result.status.name
        if result.error:
            print(f"- {step_name}: {status} - {result.error}")
        else:
            print(f"- {step_name}: {status}")
            if result.output_paths:
                for output_type, path in result.output_paths.items():
                    print(f"  - {output_type}: {path}")


if __name__ == "__main__":
    main()
