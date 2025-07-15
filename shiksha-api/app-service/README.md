# Shiksha Copilot API

A FastAPI-based educational chat API for the Shiksha platform.

## Project Structure

```
app-service/
├── app/
│   ├── main.py          # Main FastAPI application
│   ├── config.py        # Configuration settings
│   ├── dependencies.py  # Common dependencies
│   ├── models/          # Pydantic models
│   │   └── chat.py      # Chat-related models
│   └── routers/         # API route handlers
│       └── chat.py      # Chat endpoints
├── requirements.txt     # Python dependencies
└── README.md           # This file
```

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Run the application:

```bash
# Development mode
python -m app.main

# Or using uvicorn directly
uvicorn app.main:app --reload
```

## API Endpoints

### Chat Endpoints

- `POST /chat/` - General chat endpoint
- `POST /chat/lesson` - Lesson-specific chat endpoint

### System Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check

## API Documentation

Once running, visit:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## TODO

- [ ] Implement chat endpoint logic
- [ ] Implement lesson chat endpoint logic
- [ ] Add authentication middleware
- [ ] Add database integration
- [ ] Add logging configuration
- [ ] Add environment-specific configurations
- [ ] Add unit tests
