# LLM Queue

A Python library for managing and queueing LLM (Large Language Model) requests with rate limiting, load balancing, and telemetry features.

## Overview

The LLM Queue module provides a robust solution for handling concurrent LLM requests while respecting rate limits, implementing load balancing across multiple Azure OpenAI deployments, and collecting telemetry data for monitoring and optimization.

## Key Features

- **Request Queueing**: FIFO scheduler for managing incoming LLM requests
- **Rate Limiting**: User-based rate limiting to prevent abuse
- **Load Balancing**: Evenly distributed requests across multiple LLM deployments
- **Telemetry**: Built-in request tracking and performance monitoring
- **Azure OpenAI Integration**: Native support for Azure OpenAI services
- **Async Support**: Fully asynchronous implementation for high performance

## Installation

```bash
pip install vellm-llm-queue
```

Or using Poetry:

```bash
poetry add vellm-llm-queue
```

## Quick Start

### 1. Configuration

Create a YAML configuration file (`llm_config.yaml`):

```yaml
azure_open_ai:
  - api_key: "your-api-key"
    api_version: "2023-03-15-preview"
    api_type: "azure"
    azure_endpoint: "https://your-resource.openai.azure.com/"
    azure_oai_models:
      - unique_model_id: "gpt-4o"
        model_name_in_azure: "gpt-4o"
        deployment_name_in_azure: "gpt-4o"
        model_type: "completion"
        req_per_min: 450
        tokens_per_min: 75000
        error_backoff_in_seconds: 60
      
      - unique_model_id: "text-embedding-ada-002"
        model_name_in_azure: "text-embedding-ada-002"
        deployment_name_in_azure: "text-embedding-ada-002"
        model_type: "embeddings"
        req_per_min: 1020
        tokens_per_min: 170000
        error_backoff_in_seconds: 60

user_limits:
  max_num_requests_in_time_window: 40
  time_window_in_seconds: 60

scheduler_limits:
  max_queue_size: 1000
  request_timeout_seconds: 300
```

### 2. Basic Usage

```python
import asyncio
import yaml
from llm_queue import LLMQueue
from llm_queue.base.config_data_classes import LLMConfig
from llm_queue.base.base_classes import BaseRequestController
from llm_queue.base.data_classes import ModelPreferences

# Load configuration
def load_llm_config(file_path):
    with open(file_path, "r") as file:
        data = yaml.safe_load(file)
    return LLMConfig(**data)

# Create a custom request executor
class ChatRequestExecutor(BaseRequestController):
    async def process_request(self, req, chosen_llm_ids, telemetry_data):
        # Your custom LLM request processing logic here
        # req: the request payload
        # chosen_llm_ids: selected model IDs for this request
        # telemetry_data: tracking information
        
        # Example: Process chat completion request
        response = await self.call_azure_openai(req, chosen_llm_ids[0])
        return response

async def main():
    # Initialize LLM Queue
    llm_config = load_llm_config("llm_config.yaml")
    request_executors = {
        "chat_completion": ChatRequestExecutor(),
        "embeddings": EmbeddingRequestExecutor()
    }
    
    llm_queue = LLMQueue(
        llm_config=llm_config,
        request_executors=request_executors
    )
    
    # Initialize the queue
    await llm_queue.initiate()
    
    # Execute a request
    request_data = {
        "messages": [{"role": "user", "content": "Hello, world!"}],
        "max_tokens": 100
    }
    
    model_preferences = ModelPreferences(
        require_llm_model=True,
        require_embedding_model=False
    )
    
    try:
        response, status_code = await llm_queue.execute_request(
            req_type="chat_completion",
            request_data=request_data,
            user_id="user123",
            model_pref=model_preferences
        )
        
        if status_code == 200:
            print("Success:", response)
        else:
            print("Error:", response)
            
    except Exception as e:
        print(f"Request failed: {e}")
    
    # Graceful shutdown
    await llm_queue.graceful_shutdown()

if __name__ == "__main__":
    asyncio.run(main())
```

### 3. Model Preferences

Control which models to use for your requests:

```python
from llm_queue.base.data_classes import ModelPreferences

# For chat completion only
chat_prefs = ModelPreferences(
    specific_llm_model="gpt-4o",
    require_llm_model=True,
    require_embedding_model=False,
    num_llm_calls_per_req=1
)

# For embeddings only
embedding_prefs = ModelPreferences(
    specific_embedding_model="text-embedding-ada-002",
    require_llm_model=False,
    require_embedding_model=True,
    num_emb_calls_per_req=1
)

# For both (e.g., RAG pipeline)
rag_prefs = ModelPreferences(
    require_llm_model=True,
    require_embedding_model=True,
    num_llm_calls_per_req=1,
    num_emb_calls_per_req=3  # Average embedding calls per request
)
```

## Advanced Configuration

### Custom Rate Limiting

```python
from llm_queue.user_rate_limiter_adapters import RedisUserRateLimitStoreAdapter

# Use Redis for distributed rate limiting
redis_adapter = RedisUserRateLimitStoreAdapter(
    redis_url="redis://localhost:6379"
)

llm_queue = LLMQueue(
    llm_config=llm_config,
    request_executors=request_executors,
    user_rate_limits_store_adapter=redis_adapter
)
```

### Custom Telemetry

```python
from llm_queue.telemetry_data_store_adapters import DatabaseTelemetryAdapter

# Store telemetry in a database
db_adapter = DatabaseTelemetryAdapter(
    connection_string="postgresql://user:pass@localhost/db"
)

llm_queue = LLMQueue(
    llm_config=llm_config,
    request_executors=request_executors,
    telemetry_store_adapter=db_adapter
)
```

## Error Handling

The LLM Queue provides specific exceptions for different error scenarios:

```python
from llm_queue.base.custom_errors import (
    UserRateLimitExceededError,
    SchedulerQueueFullError,
    QueueTimeoutError,
    UserIdHeaderMissingError
)

try:
    response, status = await llm_queue.execute_request(...)
except UserRateLimitExceededError as e:
    print(f"Rate limit exceeded: {e}")
except SchedulerQueueFullError as e:
    print(f"Queue is full: {e}")
except QueueTimeoutError as e:
    print(f"Request timeout: {e}")
except UserIdHeaderMissingError as e:
    print(f"Missing user ID: {e}")
```

## Architecture Components

- **Scheduler**: Manages request queuing (default: FIFO)
- **Load Balancer**: Distributes requests across available models
- **Poller**: Background process that executes queued requests
- **Rate Limiter**: Enforces user-specific rate limits
- **Telemetry**: Tracks request metrics and performance data

## Use Cases

- **API Gateway**: Rate-limited LLM API proxy
- **Multi-tenant Applications**: Isolated rate limiting per user
- **RAG Pipelines**: Coordinated embedding + completion requests
- **Production Monitoring**: Built-in telemetry and error tracking

## Contributing

This module is part of the Shiksha-Copilot project. See the main repository for contribution guidelines.