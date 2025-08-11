# Shiksha Ingestion Pipeline

The Shiksha Ingestion Pipeline is a comprehensive data processing system designed to extract, clean, and structure educational content from PDF textbooks. This pipeline processes PDF files through multiple stages to generate structured learning outcomes, topic hierarchies, and metadata suitable for educational AI applications.

## Overview

The ingestion pipeline consists of 8 distinct steps that transform raw PDF textbooks into structured educational data:

1. **Table of Contents (TOC) Extraction** - Extracts the table of contents from PDF files
2. **PDF Splitting** - Splits PDFs into individual chapters based on TOC
3. **Text Extraction** - Converts PDF content to markdown using multiple extraction methods
4. **Text Cleaning** - Cleans and formats extracted markdown content
5. **Chapter-Level Learning Outcomes Extraction** - Extracts topics and learning outcomes at chapter level
6. **Subtopic Rule-Based Cleaning** - Filters and cleans extracted subtopics using rules
7. **Subtopic-Wise Learning Outcomes Extraction** - Generates learning outcomes for individual subtopics
8. **Create Index** - Creates searchable indexes for chapter content to enable efficient retrieval

**Additional Knowledge Graph Module:** The pipeline also includes a specialized knowledge graph module that can construct educational knowledge graphs from textbook content, identifying entities, their relationships, and learning pathways. This module consists of 4 additional steps for entity extraction, content mapping, relationship identification, and graph construction.

## Project Structure

```
shiksha-ingestion/
├── pipeline_runner.py              # Sample pipeline execution script
├── pyproject.toml                  # Project dependencies and configuration
├── pipeline_steps/                 # Individual pipeline step implementations
│   ├── __init__.py
│   ├── step_1_toc_extraction.py
│   ├── step_2_pdf_splitting.py
│   ├── step_3_text_extraction_llm.py
│   ├── step_3_text_extraction_mineru.py
│   ├── step_3_text_extraction_olmocr.py
│   ├── step_4_clean_extracted_text.py
│   ├── step_5_subtopic_chapter_level_los_extraction.py
│   ├── step_6_subtopic_extraction_rule_based_cleaning.py
│   ├── step_7_subtopic_wise_lo_extraction.py
│   ├── step_8_create_indexes.py
│   └── knowledge_graph/            # Knowledge graph pipeline steps
│       ├── __init__.py
│       ├── models.py               # Data models for entities and relationships
│       ├── step_1_extract_entities.py      # Entity extraction from chapters
│       ├── step_2_extract_entity_content.py # Content extraction for entities
│       ├── step_3_extract_entity_relationships.py # Relationship identification
│       ├── step_4_construct_knowledge_graph.py    # Graph construction
│       ├── graph_visualizer.py     # Graph visualization utilities
│       └── karnataka_lba/          # Karnataka Learning-Based Assessment module
│           ├── __init__.py
│           ├── step_1_karnataka_lba_text_extraction_llm.py     # LBA text extraction
│           ├── step_2_karnataka_lba_chapter_wise_page_range.py # Chapter page ranges
│           └── step_3_karnataka_lba_question_graph_entity_extraction.py # Question entities
└── README.md                       # This file
```

## Installation

### Prerequisites

- Python 3.11+
- Poetry (for dependency management)
- Azure OpenAI API access (for LLM-based steps)

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Shiksha-Copilot/shiksha-ingestion
   ```

2. **Install dependencies using Poetry:**
   ```bash
   poetry install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory with the following variables:
   ```env
   AZURE_OPENAI_API_KEY=your_azure_openai_api_key
   AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
   AZURE_OPENAI_API_VERSION=your_api_version
   AZURE_OPENAI_MODEL=your_deployment_name
   ```

4. **Activate the Poetry environment:**
   ```bash
   poetry shell
   ```

## Pipeline Steps Detailed Description

### Step 1: Table of Contents (TOC) Extraction
**File:** `step_1_toc_extraction.py`
**Class:** `TOCExtractionStep`

- **Purpose:** Extracts the table of contents structure from PDF files using Azure OpenAI
- **Input:** PDF file
- **Output:** JSON file containing structured TOC with page ranges
- **Features:**
  - Uses LLM to identify chapter boundaries and page numbers
  - Handles complex TOC structures with nested sections
  - Validates extracted page ranges

### Step 2: PDF Splitting
**File:** `step_2_pdf_splitting.py`
**Class:** `PDFSplittingStep`

- **Purpose:** Splits PDF documents into individual chapter files based on extracted TOC
- **Input:** Original PDF file + TOC JSON
- **Output:** Multiple PDF files (one per chapter)
- **Features:**
  - Configurable page offset handling
  - Preserves document quality during splitting
  - Generates individual chapter PDFs with proper naming

### Step 3: Text Extraction (Multiple Methods)

#### 3a: LLM-Based Text Extraction
**File:** `step_3_text_extraction_llm.py`
**Class:** `TextExtractionLLMStep`

- **Purpose:** Extracts text from PDF using Azure OpenAI vision capabilities
- **Input:** PDF file
- **Output:** Markdown file with structured content
- **Features:**
  - Handles complex layouts and mathematical expressions
  - Preserves formatting and structure
  - Supports multi-modal content extraction

#### 3b: MinerU Text Extraction
**File:** `step_3_text_extraction_mineru.py`
**Class:** `TextExtractionMineruStep`

- **Purpose:** Uses MinerU library for text extraction
- **Input:** PDF file
- **Output:** Markdown file + extracted images directory
- **Features:**
  - Specialized for academic content
  - Extracts and preserves images separately
  - Optimized for mathematical and scientific content

#### 3c: OlmoCR Text Extraction
**File:** `step_3_text_extraction_olmocr.py`
**Class:** `TextExtractionOLMOcrStep`

- **Purpose:** Uses OlmoCR for optical character recognition
- **Input:** PDF file
- **Output:** Markdown file
- **Features:**
  - OCR-based text extraction
  - Good for scanned documents
  - Handles various text layouts

### Step 4: Text Cleaning
**File:** `step_4_clean_extracted_text.py`
**Class:** `TextCleaningStep`

- **Purpose:** Cleans and formats extracted markdown content
- **Input:** Raw markdown file
- **Output:** Cleaned markdown file
- **Features:**
  - Removes extraction artifacts
  - Standardizes formatting
  - Fixes common OCR errors
  - Improves text structure and readability

### Step 5: Chapter-Level Learning Outcomes Extraction
**File:** `step_5_subtopic_chapter_level_los_extraction.py`
**Class:** `SubtopicChapterLOsExtractionStep`

- **Purpose:** Extracts topics and learning outcomes at the chapter level
- **Input:** Cleaned markdown file
- **Output:** JSON file with structured metadata
- **Features:**
  - Uses Bloom's taxonomy action verbs specific to grade and subject
  - Extracts primary topics (max 2-level numbering: X.Y)
  - Excludes non-content sections (exercises, activities, etc.)
  - Generates measurable learning outcomes
  - Validates against prohibited action verbs

### Step 6: Subtopic Rule-Based Cleaning
**File:** `step_6_subtopic_extraction_rule_based_cleaning.py`
**Class:** `SubtopicCleaningStep`

- **Purpose:** Filters and cleans extracted subtopics using predefined rules
- **Input:** Chapter metadata JSON
- **Output:** Cleaned chapter metadata JSON
- **Features:**
  - Removes deeply nested topics (more than 2 levels)
  - Filters out non-educational content
  - Applies rule-based validation
  - Maintains topic hierarchy integrity

### Step 7: Subtopic-Wise Learning Outcomes Extraction
**File:** `step_7_subtopic_wise_lo_extraction.py`
**Class:** `SubtopicWiseLOExtractionStep`

- **Purpose:** Generates specific learning outcomes for individual subtopics
- **Input:** Cleaned chapter metadata + original markdown
- **Output:** JSON with subtopic-specific learning outcomes
- **Features:**
  - Creates targeted learning outcomes for each subtopic
  - Uses grade and subject-specific action verbs
  - Ensures outcomes span multiple cognitive levels
  - Validates against Bloom's taxonomy requirements

### Step 8: Create Index
**File:** `step_8_create_indexes.py`
**Class:** `CreateIndexStep`

- **Purpose:** Creates searchable indexes from chapter content for efficient retrieval
- **Input:** Cleaned markdown file
- **Output:** Vector index directory structure
- **Features:**
  - Splits content into page-wise chunks for granular retrieval
  - Uses Azure OpenAI embeddings to vectorize content
  - Creates persistent vector index with metadata
  - Supports efficient semantic search and retrieval
  - Integrates with RAG wrapper for question answering

## Knowledge Graph Module

The knowledge graph module (`pipeline_steps/knowledge_graph/`) provides specialized steps for constructing educational knowledge graphs from textbook content. These steps create structured representations of concepts, their relationships, and learning pathways.

### Knowledge Graph Pipeline Steps

#### Step 1: Entity Extraction
**File:** `step_1_extract_entities.py`
**Class:** `ExtractChapterEntitiesStep`

- **Purpose:** Extracts structural entities (headings, sections, activities) from textbook chapters
- **Input:** Cleaned markdown file
- **Output:** JSON file with extracted entities
- **Features:**
  - Identifies all headings and subheadings (excluding main chapter title)
  - Extracts content blocks without formal headings (introductions, transitions)
  - Categorizes entities by type (section, subsection, activity, assessment, introduction, content_block)
  - Creates unique identifiers and summaries for each entity
  - Maintains complete chapter coverage - no content is left unmapped

#### Step 2: Entity Content Extraction
**File:** `step_2_extract_entity_content.py`
**Class:** `ExtractEntityContentStep`

- **Purpose:** Extracts complete content for each identified entity
- **Input:** Cleaned markdown file + entity list from Step 1
- **Output:** JSON file with entity content mappings
- **Features:**
  - Extracts all content under each entity heading
  - Preserves original markdown formatting
  - Includes tables, figures, lists, and supplementary content
  - Maintains content boundaries between entities
  - Ensures completeness - no content is omitted

#### Step 3: Entity Relationship Extraction
**File:** `step_3_extract_entity_relationships.py`
**Class:** `ExtractEntityRelationshipsStep`

- **Purpose:** Identifies semantic and structural relationships between entities
- **Input:** Entities with content from Step 2
- **Output:** JSON file with relationship mappings
- **Features:**
  - Supports multiple relationship types:
    - `prerequisite`: Entity A must be understood before Entity B
    - `builds_upon`: Entity B extends concepts from Entity A
    - `demonstrates`: Entity A provides examples of Entity B
    - `tests`: Entity A (assessment) tests knowledge of Entity B
    - `explains`: Entity A provides theory for Entity B
    - `applies`: Entity A shows practical application of Entity B
    - `related`: General semantic relationship
  - Provides confidence scores for each relationship
  - Uses Azure OpenAI for intelligent relationship detection

#### Step 4: Knowledge Graph Construction
**File:** `step_4_construct_knowledge_graph.py`
**Class:** `ConstructKnowledgeGraphStep`

- **Purpose:** Builds final knowledge graph structure from entities and relationships
- **Input:** Entities from Step 1 + Relationships from Step 3
- **Output:** Complete knowledge graph with metrics and insights
- **Features:**
  - Creates NetworkX-based graph structure
  - Generates graph metrics (node count, edge count, connectivity statistics)
  - Validates graph integrity and completeness
  - Produces exportable graph formats
  - Provides educational pathway analysis

### Graph Visualization (`graph_visualizer.py`)

**GraphVisualizer Class:**
- **Interactive HTML Visualizations:** D3.js-based interactive graphs
- **Static Export Formats:** PNG, SVG, PDF visualizations
- **Educational Dashboards:** Learning pathway visualizations
- **Customizable Styling:** Node colors, relationship types, layouts
- **Export Capabilities:** Multiple output formats for different use cases

### Knowledge Graph Output Structure

After successful knowledge graph construction:

```
knowledge_graph_output/
├── entities.json                    # Extracted entities with content
├── relationships.json               # Entity relationships with confidence scores
├── knowledge_graph.json            # Complete graph structure
├── graph_metrics.json              # Graph analysis and metrics
└── visualizations/
    ├── interactive_graph.html       # Interactive D3.js visualization
    ├── static_graph.png            # Static graph image
    └── learning_pathways.html       # Educational pathway visualization
```

### Integration with Main Pipeline

The knowledge graph module can be integrated into the main pipeline by adding the knowledge graph steps to the pipeline configuration:

```python
"steps": [
    # ... existing steps
    {
        "name": "extract_chapter_entities",
        "enabled": True,
    },
    {
        "name": "extract_entity_content", 
        "enabled": True,
    },
    {
        "name": "extract_entity_relationships",
        "enabled": True,
    },
    {
        "name": "construct_knowledge_graph",
        "enabled": True,
    },
]
```

### Karnataka LBA (Learning-Based Assessment) Module

The Karnataka LBA module (`pipeline_steps/knowledge_graph/karnataka_lba/`) provides specialized steps for processing Karnataka state Learning-Based Assessment textbooks and question papers. This module focuses on extracting assessment questions and creating knowledge graphs specific to the Karnataka education system.

#### Karnataka LBA Pipeline Steps

##### Step 1: Karnataka LBA Text Extraction
**File:** `step_1_karnataka_lba_text_extraction_llm.py`
**Class:** `KarnatakaLBATextExtractionLLMStep`

- **Purpose:** Extracts text from Karnataka LBA PDF files using Azure OpenAI LLM
- **Input:** PDF file containing Karnataka LBA content
- **Output:** Markdown file with extracted text
- **Features:**
  - Specialized for Karnataka LBA document format
  - Uses Azure OpenAI vision capabilities for accurate text extraction
  - Optimized for assessment question extraction
  - Preserves question structure and formatting

##### Step 2: Karnataka LBA Chapter Page Range Extraction
**File:** `step_2_karnataka_lba_chapter_wise_page_range.py`
**Class:** `KarnatakaLBAPageRangeExtractionStep`

- **Purpose:** Identifies page ranges for each chapter's assessment questions
- **Input:** Markdown file from Step 1
- **Output:** JSON file with chapter page ranges
- **Features:**
  - Extracts chapter numbers and titles
  - Identifies page ranges containing actual assessment questions
  - Excludes non-question content (learning outcomes, distributions)
  - Uses intelligent page boundary detection
  - Validates page range consistency

##### Step 3: Karnataka LBA Question Entity Extraction
**File:** `step_3_karnataka_lba_question_graph_entity_extraction.py`
**Class:** `KarnatakaLBAQuestionExtractionStep`

- **Purpose:** Extracts individual assessment questions as graph entities
- **Input:** Markdown content + chapter page ranges
- **Output:** JSON file with question entities
- **Features:**
  - Extracts individual questions with common instructions
  - Preserves question groupings for related questions
  - Creates graph entities for each question or question group
  - Maintains question context and formatting
  - Supports various question types (MCQ, descriptive, match-the-following)

#### Karnataka LBA Output Structure

After successful Karnataka LBA processing:

```
karnataka_lba_output/
├── lba_text_extraction/
│   └── lba_textbook.md             # Extracted markdown content
├── chapter_page_ranges/
│   └── chapter_ranges.json         # Chapter page range mappings
├── question_entities/
│   └── question_graph_entities.json # Assessment question entities
└── lba_knowledge_graph/
    ├── lba_entities.json           # Complete LBA entity graph
    ├── lba_relationships.json      # Question-concept relationships
    └── lba_visualizations/
        └── assessment_graph.html   # Assessment knowledge graph
```

#### Integration with Knowledge Graph Pipeline

The Karnataka LBA module can be integrated with the main knowledge graph pipeline to create comprehensive educational knowledge graphs that include both content entities and assessment entities:

```python
"steps": [
    # Main content processing
    {
        "name": "extract_chapter_entities",
        "enabled": True,
    },
    # Karnataka LBA processing
    {
        "name": "karnataka_lba_text_extraction_llm",
        "enabled": True,
    },
    {
        "name": "karnataka_lba_chapter_page_range_extraction",
        "enabled": True,
    },
    {
        "name": "karnataka_lba_question_graph_entity_extraction",
        "enabled": True,
    },
    # Combined graph construction
    {
        "name": "construct_knowledge_graph",
        "enabled": True,
    },
]
```

This integration allows for creating unified knowledge graphs that connect textbook content with assessment questions, enabling more comprehensive educational analysis and question-answering capabilities.

## Pipeline Runner

### Description

The `pipeline_runner.py` file is the main orchestrator for the entire ingestion pipeline. It coordinates the execution of all pipeline steps in sequence, manages data flow between steps, and provides comprehensive logging and error handling.

### Key Features

- **Modular Architecture:** Uses a registry pattern to register and manage pipeline steps
- **Sequential Execution:** Runs pipeline steps in the correct order with dependency validation
- **Output Management:** Creates timestamped output directories for each pipeline run
- **Error Handling:** Provides detailed error reporting and status tracking
- **Flexible Configuration:** Supports step-level configuration and enabling/disabling
- **Result Tracking:** Maintains comprehensive execution logs and output file tracking

### Configuration

The pipeline runner uses a configuration dictionary that specifies:

```python
PIPELINE_CONFIG = {
    "grade": "6",                    # Target grade level
    "subject": "math",               # Subject area
    "chapter_number": "1",           # Chapter identifier
    "chapter_title": "Knowing Our Numbers",  # Chapter title
    "steps": [                       # Pipeline steps configuration
        {
            "name": "text_extraction_llm",
            "enabled": True,
        },
        {
            "name": "text_cleaning", 
            "enabled": True,
        },
        # ... additional steps
    ],
}
```

## Usage

### Basic Pipeline Execution

1. **Prepare your input:**
   - Ensure you have a PDF file ready for processing
   - Update the `initial_inputs` dictionary in `pipeline_runner.py` with your PDF path

2. **Configure the pipeline:**
   ```python
   # Edit pipeline_runner.py
   initial_inputs = {
       "pdf": "/path/to/your/textbook.pdf"
   }
   ```

3. **Run the pipeline:**
   ```bash
   poetry shell
   python pipeline_runner.py
   ```

### Advanced Usage

#### Running Specific Steps

You can enable/disable specific steps by modifying the `PIPELINE_CONFIG`:

```python
"steps": [
    {
        "name": "text_extraction_llm",
        "enabled": False,  # Skip this step
    },
    {
        "name": "text_extraction_mineru",
        "enabled": True,   # Use MinerU instead
    },
    # ... other steps
]
```

#### Custom Output Directory

The pipeline automatically creates timestamped output directories:
```
pipeline_output/
├── 20231201_143022/  # Timestamp: YYYYMMDD_HHMMSS
│   ├── step_1_output/
│   ├── step_2_output/
│   └── ...
```

#### Monitoring Pipeline Execution

The pipeline provides detailed logging:
- **INFO level:** General progress and step completion
- **DEBUG level:** Detailed processing information
- **ERROR level:** Error details and stack traces

### Example Output Structure

After successful execution, you'll find:

```
pipeline_output/20231201_143022/
├── toc_extraction/
│   └── textbook_toc.json
├── pdf_splitting/
│   ├── chapter_1.pdf
│   ├── chapter_2.pdf
│   └── ...
├── text_extraction_llm/
│   └── chapter_1.md
├── text_cleaning/
│   └── chapter_1_cleaned.md
├── subtopic_chapter_los_extraction/
│   └── chapter_1_metadata.json
├── subtopic_cleaning/
│   └── chapter_1_cleaned_metadata.json
├── subtopic_wise_lo_extraction/
│   └── chapter_1_subtopic_los.json
├── create_index/
│   └── grade/
│       └── subject/
│           └── chapter_number/
│               └── [index files]
└── knowledge_graph/                # Knowledge graph outputs (if enabled)
    ├── entities.json
    ├── relationships.json
    ├── knowledge_graph.json
    ├── graph_metrics.json
    ├── visualizations/
    │   ├── interactive_graph.html
    │   ├── static_graph.png
    │   └── learning_pathways.html
    └── karnataka_lba/              # Karnataka LBA outputs (if enabled)
        ├── lba_text_extraction/
        ├── chapter_page_ranges/
        ├── question_entities/
        └── lba_knowledge_graph/
```

## Dependencies

Key dependencies include:

- **Core Framework:** `ingestion-pipeline` components
- **Text Extraction:** `mineru-extractor`, `olmocr-extractor`
- **AI/ML:** Azure OpenAI API integration
- **Data Processing:** `pydantic` for data validation
- **Utilities:** `python-dotenv` for environment management

## Troubleshooting

### Common Issues

1. **Azure OpenAI Authentication Errors:**
   - Verify your `.env` file contains correct API credentials
   - Check API key validity and quota limits

2. **PDF Processing Errors:**
   - Ensure PDF files are not corrupted
   - Check file permissions and accessibility

3. **Memory Issues:**
   - Large PDF files may require increased memory allocation
   - Consider processing chapters individually for very large textbooks

4. **Missing Dependencies:**
   - Run `poetry install` to ensure all dependencies are installed
   - Check for platform-specific dependency issues

### Logging and Debugging

- Enable DEBUG logging by modifying the logging configuration in individual step files
- Check pipeline output directories for intermediate results
- Review error messages in the console output for specific failure points

## Contributing

When contributing to the pipeline:

1. Follow the existing step pattern for new pipeline steps
2. Ensure proper error handling and logging
3. Add appropriate input/output type validation
4. Update this README with any new steps or features
5. Test thoroughly with various PDF types and content structures