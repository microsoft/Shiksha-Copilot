# Shiksha Copilot API

A FastAPI-based educational chat API for the Shiksha platform.

## Project Structure

```
app-service/
├── app/
│   ├── main.py          # Main FastAPI application
│   ├── config.py        # Configuration settings
│   ├── models/          # Pydantic models
│   │   └── chat.py      # Chat-related models
│   ├── routers/         # API route handlers
│   │   └── chat.py      # Chat endpoints
│   ├── services/        # Business logic services
│   │   ├── bing_search.py        # Bing search integration
│   │   ├── chat_service.py       # Base chat service
│   │   ├── general_chat_service.py   # General chat logic
│   │   └── lesson_chat_service.py    # Lesson-specific chat logic
│   └── utils/           # Utility functions
│       ├── logger.py    # Logging utilities
│       └── prompt_template.py   # Prompt template handling
├── prompts/             # Prompt templates
│   └── chat_prompts.yaml    # Chat prompt configurations
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

### Running the Application

1. Development mode with Poetry:

```bash
poetry run python main.py
```

2. Alternative - activate shell first, then run:

```bash
poetry shell
python main.py
```

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

- Processes general educational queries using AI assistant
- Supports conversational context with message history
- Integrates with Bing search for real-time information
- Handles user, assistant, and system message roles
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

### System Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check

## API Documentation

Once running, visit:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
