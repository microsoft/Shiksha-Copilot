# Shiksha Copilot API

A FastAPI-based educational chat API for the Shiksha platform.

## Project Structure

```
app-service/
├── app/
│   ├── main.py          # Main FastAPI application
│   ├── config.py        # Configuration settings
│   ├── models/          # Pydantic models
│   │   ├── chat.py      # Chat-related models
│   │   └── question_paper.py  # Question paper models
│   ├── routers/         # API route handlers
│   │   ├── chat.py      # Chat endpoints
│   │   └── question_paper.py  # Question paper generation endpoints
│   ├── services/        # Business logic services
│   │   ├── bing_search.py        # Bing search integration
│   │   ├── general_chat_service.py   # General chat logic
│   │   ├── lesson_chat_service.py    # Lesson-specific chat logic
│   │   ├── question_paper_service.py # Question paper generation service
│   │   ├── rag_adapters.py       # RAG adapter implementations
│   │   └── rag_adapter_cache.py  # LRU cache for RAG adapters
│   └── utils/           # Utility functions
│       ├── blob_store.py    # Azure Blob Storage utilities
│       ├── logger.py        # Logging utilities
│       └── prompt_template.py   # Prompt template handling
├── prompts/             # Prompt templates
│   ├── chat_prompts.yaml       # Chat prompt configurations
│   ├── question_paper_prompts.yaml  # Question generation prompts
│   ├── blooms_taxonomy.yaml    # Bloom's taxonomy definitions
│   └── english_grammar_topics.yaml  # Grammar topic mappings
├── pyproject.toml       # Poetry configuration and dependencies
├── poetry.lock         # Locked dependency versions
└── README.md           # This file
```

## Setup

### Prerequisites

- Python 3.8+
- Poetry (for dependency management)

### Installation

1. Install Poetry (if not already installed):

```bash
curl -sSL https://install.python-poetry.org | python3 -
```

2. Install dependencies:

```bash
poetry install
```

3. Activate the virtual environment:

```bash
poetry shell
```

### Configuration

Create a `.env` file in the project root with the following configuration:

```bash
# Application Configuration
APP_NAME="Shiksha Copilot API"
VERSION="1.0.0"
DEBUG=false
HOST="0.0.0.0"
PORT=8000
LOG_LEVEL="INFO"

# Azure OpenAI Configuration (Required)
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_NAME=your_completion_model_deployment
AZURE_OPENAI_EMBED_MODEL=your_embedding_model_deployment

# Azure AI Project Configuration (Required for Chat)
AZURE_PROJECT_ENDPOINT=https://your-project.eastus2.ai.azure.com
AZURE_BING_GROUNDING_CONNECTION_ID=your_bing_connection_id

# Azure Blob Storage Configuration (Required for RAG)
BLOB_STORE_CONNECTION_STRING=your_azure_storage_connection_string
BLOB_STORE_URL=https://yourstorageaccount.blob.core.windows.net/

# Qdrant Configuration (Optional - for QdrantRagOpsAdapter)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key
```

**Required Environment Variables:**

- `AZURE_OPENAI_API_KEY`: Azure OpenAI service API key
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI service endpoint URL
- `AZURE_OPENAI_DEPLOYMENT_NAME`: Completion model deployment name
- `AZURE_OPENAI_EMBED_MODEL`: Embedding model deployment name
- `AZURE_PROJECT_ENDPOINT`: Azure AI Foundry project endpoint URL
- `BLOB_STORE_CONNECTION_STRING`: Azure Storage connection string (for RAG index files)

**Optional Environment Variables:**

- `AZURE_BING_GROUNDING_CONNECTION_ID`: Azure AI Foundry Bing connection ID (for web search capabilities)
- `QDRANT_URL`: Qdrant vector database URL (if using QdrantRagOpsAdapter)
- `QDRANT_API_KEY`: Qdrant API key (if authentication required)

### Running the Application

1. Development mode with Poetry:

```bash
poetry run python -m app.main
```

2. Alternative - activate shell first, then run:

```bash
poetry shell
python -m app.main
```

3. Using uvicorn directly:

```bash
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

4. Production deployment:

```bash
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at:

- Main API: http://localhost:8000
- Swagger Documentation: http://localhost:8000/docs
- ReDoc Documentation: http://localhost:8000/redoc

## API Endpoints

### Chat Endpoints

#### General Chat API - `POST /chat/`

The general chat endpoint handles educational queries with AI assistance and web search capabilities.

**Request Body:**

```json
{
  "user_id": "string",
  "messages": [
    {
      "role": "user|assistant|system",
      "message": "string"
    }
  ]
}
```

**Response:**

```json
{
  "user_id": "string",
  "response": "string"
}
```

**Features:**

- Processes general educational queries using Azure AI Project agents
- Supports conversational context with message history
- Integrates with Bing Grounding tool for real-time web search capabilities
- Uses Azure AI Foundry project endpoint for enhanced AI capabilities
- Handles user, assistant, and system message roles
- Automatic agent lifecycle management (creation and cleanup)
- Thread-based conversation management
- Comprehensive error handling with detailed error responses

**Error Responses:**

- `400 Bad Request` - Empty messages list or invalid input
- `500 Internal Server Error` - Configuration errors or processing failures

**Example Usage:**

```bash
curl -X POST "http://localhost:8000/chat/" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "messages": [
      {
        "role": "user",
        "message": "Explain photosynthesis in simple terms"
      }
    ]
  }'
```

#### Lesson Chat API - `POST /chat/lesson`

Lesson-specific chat endpoint for contextual educational content queries with RAG (Retrieval-Augmented Generation) capabilities.

**Request Body:**

```json
{
  "user_id": "string",
  "chapter_id": "string",
  "index_path": "string",
  "messages": [
    {
      "role": "user|assistant|system",
      "message": "string"
    }
  ]
}
```

**Response:**

```json
{
  "user_id": "string",
  "response": "string"
}
```

**Parameters:**

- `user_id`: Unique identifier for the user
- `chapter_id`: Formatted string containing chapter metadata in the format: `Board=<board>,Medium=<medium>,Grade=<grade>,Subject=<subject>,Number=<number>,Title=<title>`
- `index_path`: Path to the RAG index files in blob storage
- `messages`: Array of conversation messages with role and content

**Features:**

- **RAG-powered responses**: Uses Retrieval-Augmented Generation with lesson-specific content
- **Contextual understanding**: Processes queries with full chapter context and metadata
- **LRU caching**: Implements efficient caching of RAG operations instances (max 32 items)
- **Azure OpenAI integration**: Leverages Azure OpenAI for both completion and embedding models
- **Automatic index management**: Downloads and manages RAG index files from blob storage
- **Conversation history**: Maintains chat history with system prompts and user interactions
- **Resource cleanup**: Automatically cleans up index files when cache items are evicted

**Chapter ID Format:**

The `chapter_id` must follow this specific format:

```
Board=CBSE,Medium=English,Grade=10,Subject=Science,Number=1,Title=Light - Reflection and Refraction
```

**Error Responses:**

- `400 Bad Request` - Invalid chapter_id format or missing required fields
- `500 Internal Server Error` - Configuration errors, index download failures, or processing errors

**Example Usage:**

```bash
curl -X POST "http://localhost:8000/chat/lesson" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "student123",
    "chapter_id": "Board=CBSE,Medium=English,Grade=10,Subject=Science,Number=1,Title=Light - Reflection and Refraction",
    "index_path": "indexes/science/grade10/chapter1",
    "messages": [
      {
        "role": "user",
        "message": "What is the difference between reflection and refraction?"
      }
    ]
  }'
```

**Technical Implementation:**

- Uses `InMemRagOps` for RAG operations with local persistence
- Implements LRU cache for RAG instances to optimize performance
- Downloads index files from Azure Blob Storage when needed
- Extracts chapter metadata to customize system prompts
- Supports conversational context with message history

### Question Paper Generation Endpoints

The API provides comprehensive question paper generation capabilities with AI-powered content creation, multiple question types, and curriculum alignment.

#### Generate Question Paper by Parts - `POST /question-paper/by-parts`

Generate a complete question paper with multiple question types and structured sections.

**Request Body:**

```json
{
  "user_id": "string",
  "board": "string",
  "medium": "string",
  "grade": 10,
  "subject": "string",
  "chapters": [
    {
      "title": "string",
      "index_path": "string",
      "learning_outcomes": ["string"],
      "subtopics": [
        {
          "title": "string",
          "learning_outcomes": ["string"]
        }
      ]
    }
  ],
  "total_marks": 100,
  "template": [
    {
      "type": "MCQ",
      "number_of_questions": 10,
      "marks_per_question": 1,
      "question_distribution": [
        {
          "unit_name": "string",
          "objective": "string"
        }
      ]
    }
  ],
  "existing_questions": []
}
```

**Response:**

```json
{
  "metadata": {
    "user_id": "string",
    "subject": "string",
    "grade": "string",
    "unit_names": ["string"],
    "school_name": "string",
    "examination_name": "string"
  },
  "questions": [
    {
      "type": "MCQ",
      "number_of_questions": 10,
      "marks_per_question": 1,
      "questions": [
        {
          "question": "string",
          "options": ["option1", "option2", "option3", "option4"],
          "answer": "correct_option"
        }
      ]
    }
  ]
}
```

**Supported Question Types:**

- **MCQ**: Multiple Choice Questions with 4 options
- **FILL_BLANKS**: Fill in the blanks questions
- **ANSWER_WORD**: Single word/phrase answers
- **ANSWER_SHORT**: Short answer questions (2-3 sentences)
- **ANSWER_GENERAL**: General answer questions
- **ANSWER_LONG**: Long answer questions (4-5 sentences)
- **MATCH_LIST**: Matching type questions

**Features:**

- AI-powered question generation using Azure OpenAI
- RAG integration for content-specific questions
- Learning outcome alignment
- Multiple question type support
- Bloom's taxonomy integration
- Curriculum-specific content generation

#### Generate Question Distribution Templates - `POST /question-paper/questiondistribution`

Generate optimized question distribution templates based on marks and objective distributions.

**Request Body:**

```json
{
  "user_id": "string",
  "board": "string",
  "medium": "string",
  "grade": 10,
  "subject": "string",
  "chapters": [...],
  "total_marks": 100,
  "marks_distribution": [
    {
      "unit_name": "string",
      "percentage_distribution": 40,
      "marks": 40
    }
  ],
  "objective_distribution": [
    {
      "objective": "Knowledge",
      "percentage_distribution": 30
    }
  ],
  "template": [...]
}
```

**Response:**

```json
[
  {
    "type": "MCQ",
    "number_of_questions": 10,
    "marks_per_question": 1,
    "description": "These questions provide exactly four options...",
    "question_distribution": [
      {
        "unit_name": "Light",
        "objective": "Knowledge"
      }
    ]
  }
]
```

**Educational Objectives:**

- **Knowledge**: Recall of facts, terms, concepts
- **Understanding**: Comprehension and interpretation
- **Application**: Using knowledge in new situations
- **Analysis**: Breaking down complex information
- **Synthesis**: Combining elements to form new patterns
- **Evaluation**: Making judgments based on criteria

#### Generate Static Templates - `POST /question-paper/template`

Generate predefined question paper templates for quick prototyping and standard formats.

**Request Body:**

```json
{
  "user_id": "string",
  "board": "string",
  "medium": "string",
  "grade": 10,
  "subject": "string",
  "total_marks": 100
}
```

**Response:**

```json
[
  {
    "type": "MCQ",
    "number_of_questions": 5,
    "marks_per_question": 1,
    "description": "These questions provide exactly four options...",
    "question_distribution": null
  }
]
```

**Features:**

- Fast template generation (no AI processing)
- Standard educational format compliance
- Pre-validated template structures
- Suitable for high-frequency requests

### System Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check

## Azure AI Project Client Integration

The application leverages Azure AI Foundry's project client for advanced AI capabilities and agent-based conversations.

### Azure AI Agents Architecture

The general chat service uses Azure AI Project client with the following features:

- **Agent-based Conversations**: Creates dedicated AI agents with custom instructions and capabilities
- **Thread Management**: Manages conversation threads for context continuity
- **Bing Grounding Tool**: Integrates web search capabilities through Azure connections
- **Automatic Lifecycle Management**: Handles agent creation, thread management, and cleanup

### Key Components

#### AIProjectClient Configuration

```python
project_client = AIProjectClient(
    endpoint=settings.azure_project_endpoint,
    credential=DefaultAzureCredential()
)
```

#### Agent Creation

```python
agent = await project_client.agents.create_agent(
    model=settings.azure_openai_deployment_name,
    name="shiksha-copilot-agent",
    instructions=assistant_system_prompt,
    tools=bing_tools,  # Optional Bing Grounding tools
)
```

#### Thread-based Communication

```python
# Create conversation thread
thread = await project_client.agents.create_thread()

# Add message to thread
message = await project_client.agents.messages.create(
    thread_id=thread.id,
    role=MessageRole.USER,
    content=message_content,
)

# Run agent and get response
run = await project_client.agents.runs.create_and_process(
    thread_id=thread.id,
    agent_id=agent.id,
)
```

### Benefits

- **Enhanced AI Capabilities**: Access to latest Azure AI Foundry features
- **Built-in Tool Integration**: Seamless integration with Bing search and other tools
- **Scalable Architecture**: Production-ready agent management
- **Automatic Resource Management**: Handles threading and cleanup automatically

## RAG (Retrieval-Augmented Generation) Architecture

The application implements a sophisticated RAG architecture for context-aware educational content generation.

### RAG Adapters

The system uses an extensible adapter pattern for different RAG backends:

#### BaseRagAdapter (Abstract Base Class)

```python
class BaseRagAdapter(ABC):
    """Abstract base class for RAG adapters."""

    def __init__(self, completion_llm, embedding_llm, metadata_filter=None):
        # Initialize with Azure OpenAI models

    @abstractmethod
    async def initialize(self) -> Union[InMemRagOps, QdrantRagOps]:
        # Initialize RAG operations instance

    @abstractmethod
    async def initiate_index(self) -> None:
        # Download and prepare index files

    async def chat_with_index(self, curr_message: str, chat_history: List[ChatMessage]) -> str:
        # Chat with RAG index using context
```

#### Available Adapters

1. **InMemRagOpsAdapter**

   - Uses local in-memory vector storage
   - Downloads index files from Azure Blob Storage
   - Suitable for development and testing
   - Automatic cleanup of temporary files

2. **QdrantRagOpsAdapter**
   - Uses Qdrant vector database
   - Supports distributed and scalable deployments
   - Production-ready with persistence
   - Configurable with connection parameters

### RAG Adapter Cache

Implements an LRU (Least Recently Used) cache for RAG adapter instances:

```python
class RagAdapterCache:
    """LRU cache for RAG adapter instances with automatic cleanup."""

    def __init__(self, max_size: int = 32):
        # Initialize cache with maximum size

    async def get_or_create_adapter(self, cache_key: str, adapter_factory) -> BaseRagAdapter:
        # Get existing adapter or create new one

    async def cleanup_all(self) -> None:
        # Clean up all cached adapters
```

**Features:**

- **Automatic Eviction**: Removes least recently used adapters when cache is full
- **Resource Cleanup**: Automatically cleans up adapter resources on eviction
- **Thread Safety**: Safe for concurrent access
- **Configurable Size**: Default maximum of 32 cached adapters

### RAG Integration Flow

1. **Request Processing**: User sends lesson chat request with chapter information
2. **Cache Lookup**: System checks if RAG adapter exists in cache for the chapter
3. **Adapter Creation**: If not cached, creates new adapter with chapter-specific configuration
4. **Index Download**: Downloads index files from Azure Blob Storage if needed
5. **RAG Operations**: Initializes RAG operations with downloaded index
6. **Context Retrieval**: Retrieves relevant context based on user query
7. **Response Generation**: Generates contextual response using Azure OpenAI
8. **Cache Management**: Stores adapter in cache for future requests

### Blob Storage Integration

The system integrates with Azure Blob Storage for index file management:

```python
class BlobStore:
    """Azure Blob Storage utilities for downloading index files."""

    async def download_blob_to_local_directory(self, blob_path: str, local_dir: str) -> str:
        # Download blob contents to local directory

    async def list_blobs_in_directory(self, directory_path: str) -> List[str]:
        # List all blobs in a directory
```

**Features:**

- Automatic directory creation for downloaded files
- Support for nested directory structures
- Efficient streaming downloads for large index files
- Error handling for network issues and missing files

## API Documentation

Once running, visit:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Error Handling

The API implements comprehensive error handling with structured error responses:

### Error Response Format

```json
{
  "error": "string",
  "error_code": "string",
  "details": {}
}
```

### Common Error Codes

- **400 Bad Request**: Invalid input parameters, missing fields, or malformed requests
- **404 Not Found**: Requested resource not found
- **500 Internal Server Error**: Server processing errors, configuration issues, or external service failures

### Error Categories

1. **Configuration Errors**: Missing environment variables, invalid Azure OpenAI configuration
2. **Validation Errors**: Invalid request format, empty message lists, malformed chapter IDs
3. **RAG Errors**: Index download failures, vector database connection issues
4. **AI Generation Errors**: Azure OpenAI API failures, quota exceeded, model unavailable

## Development Guidelines

### Code Structure

- **Models**: Pydantic models for request/response validation
- **Routers**: FastAPI route handlers with comprehensive documentation
- **Services**: Business logic separated from API layer
- **Adapters**: Extensible pattern for different RAG backends
- **Utils**: Reusable utility functions and helpers

### Adding New Question Types

1. Define the question type in `QuestionType` enum in `app/models/question_paper.py`
2. Create corresponding Pydantic model for the question format
3. Update prompt templates in `prompts/question_paper_prompts.yaml`
4. Add generation logic in `QuestionPaperService`

### Adding New RAG Adapters

1. Inherit from `BaseRagAdapter` in `app/services/rag_adapters.py`
2. Implement required abstract methods (`initialize`, `initiate_index`, `cleanup`)
3. Add adapter to cache factory in `RagAdapterCache`
4. Update configuration as needed

### Testing

Run tests using pytest:

```bash
# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=app

# Run specific test file
poetry run pytest tests/test_question_paper.py

# Run with verbose output
poetry run pytest -v
```

## Docker Deployment

### Building the Docker Image

```bash
# Build the image
docker build -t shiksha-copilot-api .

# Run the container
docker run -p 8000:8000 --env-file .env shiksha-copilot-api
```

### Docker Compose

```yaml
version: "3.8"
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - AZURE_OPENAI_API_KEY=${AZURE_OPENAI_API_KEY}
      - AZURE_OPENAI_ENDPOINT=${AZURE_OPENAI_ENDPOINT}
      - BLOB_STORE_CONNECTION_STRING=${BLOB_STORE_CONNECTION_STRING}
    depends_on:
      - qdrant

  qdrant:
    image: qdrant/qdrant
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

volumes:
  qdrant_data:
```

## Performance Considerations

### RAG Adapter Caching

- Default cache size: 32 adapters
- LRU eviction policy automatically cleans up unused adapters
- Each adapter maintains its own index files and vector storage
- Monitor memory usage in production environments

### Azure OpenAI Rate Limits

- Implement exponential backoff for rate limit handling
- Consider using multiple deployments for load balancing
- Monitor token usage and costs

### Blob Storage Optimization

- Index files are cached locally after first download
- Implement cleanup policies for temporary files
- Consider using CDN for frequently accessed indexes

## Security Considerations

### API Security

- Implement proper authentication and authorization
- Use HTTPS in production
- Validate all input parameters
- Sanitize user-generated content

### Environment Variables

- Never commit `.env` files to version control
- Use Azure Key Vault or similar services for production secrets
- Rotate API keys regularly
- Monitor for unauthorized access

## Monitoring and Logging

### Application Logging

The application uses structured logging with configurable levels:

```python
import logging
logger = logging.getLogger(__name__)

# Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
logger.info("Processing request", extra={"user_id": user_id})
logger.error("Failed to generate questions", exc_info=True)
```

### Key Metrics to Monitor

- **Request Latency**: API response times
- **Error Rates**: 4xx and 5xx error percentages
- **Azure OpenAI Usage**: Token consumption and costs
- **Memory Usage**: RAG adapter cache memory footprint
- **Storage Usage**: Blob storage download volumes

## Troubleshooting

### Common Issues

1. **"Configuration error" responses**

   - Check environment variables are set correctly
   - Verify Azure OpenAI endpoint and API key
   - Ensure deployment names match actual deployments

2. **RAG index download failures**

   - Verify blob storage connection string
   - Check blob path exists in storage account
   - Ensure proper permissions for blob access

3. **Question generation timeouts**

   - Check Azure OpenAI quota and rate limits
   - Verify model deployment is active
   - Monitor token usage patterns

4. **Memory issues with RAG cache**
   - Reduce RAG_ADAPTER_CACHE max_size
   - Monitor adapter cleanup in logs
   - Consider using QdrantRagOpsAdapter for production

### Debug Mode

Enable debug mode for detailed logging:

```bash
DEBUG=true poetry run uvicorn app.main:app --reload
```

## Recent Changes and Improvements

### Version 1.1.0 - Azure AI Project Client Integration

**Major Updates:**

- **Migrated from AutoGen to Azure AI Project Client**: Complete rewrite of the general chat service to use Azure AI Foundry's agent-based architecture
- **Enhanced Tool Integration**: Seamless integration with Bing Grounding tool for improved web search capabilities
- **Agent-based Conversations**: Implemented dedicated AI agents with custom instructions and automated lifecycle management
- **Thread Management**: Added conversation thread management for better context continuity

**New Features:**

- **Azure AI Project Client**: Leverages latest Azure AI Foundry capabilities
- **Bing Grounding Tool**: Optional web search integration through Azure connections
- **Automatic Resource Management**: Handles agent creation, thread cleanup, and connection management
- **Enhanced Error Handling**: Improved error handling and fallback mechanisms

**Configuration Changes:**

- **New Environment Variables**:
  - `AZURE_PROJECT_ENDPOINT`: Required for Azure AI Project client
  - `AZURE_BING_GROUNDING_CONNECTION_ID`: Optional for Bing search capabilities

**Benefits:**

- **Improved Performance**: Better response times and reliability
- **Enhanced Capabilities**: Access to latest Azure AI features and tools
- **Scalable Architecture**: Production-ready agent management
- **Better Integration**: Seamless Azure service integration

**Migration Notes:**

- Existing Azure OpenAI configuration remains unchanged
- RAG functionality and question paper generation unaffected
- Backward compatible API endpoints
- No changes required for existing clients

### Dependencies Updated

- **Added**: `azure-ai-projects` - Azure AI Project client library
- **Added**: `azure-ai-agents` - Azure AI agents models and tools
- **Maintained**: All existing dependencies for RAG and other features
