# Shiksha Copilot Durable Functions

A serverless Azure Functions application that generates educational lesson plans using AI-powered orchestration. This application leverages Azure Durable Functions to manage complex, long-running lesson plan generation workflows with status tracking and webhook notifications.

## Architecture Overview

The application consists of the following components:

- **HTTP Trigger** (`LessonPlanHttpTrigger`): REST API endpoint for lesson plan generation requests
- **Orchestrator** (`LessonPlanOrchestrator`): Manages the workflow execution and coordinates activities
- **Activities**:
  - `GenerateSectionActivity`: Generates individual lesson plan sections
  - `SectionsGraphOrchestrator`: Manages section dependencies and execution order
  - `WebhookStatusActivity`: Sends status updates to external webhooks

## Features

- **Asynchronous Processing**: Long-running lesson plan generation with status tracking
- **Workflow Orchestration**: Complex dependency management between lesson plan sections
- **AI-Powered Content**: Integration with Azure OpenAI for intelligent content generation
- **Status Webhooks**: Real-time status updates via HTTP callbacks
- **Containerized Deployment**: Docker support for consistent deployments
- **Parallel RAG Execution**: Optimized section generation through parallel execution of independent RAG operations

## Workflow Orchestration & Parallel Execution

The system uses a **Directed Acyclic Graph (DAG)** to optimize lesson plan generation through parallel execution of independent sections.

### DAG Creation & Execution Flow

#### 1. Initial DAG Creation

```
Workflow Definition → DAG Nodes → Independent Subgraphs
```

```
Example 5E Instructional Model Workflow DAG:
┌─────────────────────────────────────────────────────────────────┐
│                    Original DAG                                 │
│                                                                 │
│  [Engage]              [Evaluate]                               │
│     │                     │                                     │
│     ▼                     │                                     │
│  [Explore]                │                                     │
│     │                     │                                     │
│     ▼                     │                                     │
│  [Explain]                |                                     │
│     │                     |                                     │
│     ▼                     |                                     │
│  [Elaborate]              |                                     │
│     │                     |                                     │
│     ▼     ▼───────────────┘                                     │
│  [Checklist] ← Dependencies from all phases                     │
└─────────────────────────────────────────────────────────────────┘

Split into Independent Subgraphs:
┌─────────────────────────┐  ┌─────────────────────┐
│     Subgraph 1          │  │    Subgraph 2       │
│                         │  │                     │
│  [Engage]               │  │  [Evaluate]         │
│     │                   │  │     │               │
│     ▼                   │  │     │               │
│  [Explore]              │  │     │               │
│     │                   │  │     │               │
│     ▼                   │  │     │               │
│  [Explain]              │  │     │               │
│     │                   │  │     │               │
│     ▼                   │  │     │               │
│  [Elaborate]            │  │     │               │
│     │                   │  │     │               │
│     └─────────────────────┐│  │──┘               │
│                           ▼│  │                  │
│                    [Checklist]                   │
└─────────────────────────┘  └─────────────────────┘
```

#### 2. Parallel Execution Strategy

```
Subgraph Parallelism
├─ Subgraph 1: [Engage] → [Explore] → [Explain] → [Elaborate] ──┐
├─ Subgraph 2: [Evaluate] ──────────────────────────────────────┼─→ [Checklist]
└─ Wait for completion -────────────────────────────────────────┘
```

Within subgraphs, if multiple nodes are NOT waiting for any of their parent dependencies to be generated, they are processed in parallel as well.

#### 3. Regeneration Scenario with User Feedback

When regenerating with user feedback, previously generated sections are added as **completed dependency nodes** to existing workflow nodes:

```
Regeneration DAG - User wants to improve "Engage" phase:
┌─────────────────────────────────────────────────────────────────┐
│                 Regeneration DAG                                │
│                                                                 │
│  [other_section_engage: ✓ Previous Content] ←── User Feedback:  │
│           │                                     "Change the     │
│           ▼                                     starting        │
│  [section_engage: Regenerate] ←────────────────  scenario"      │
│           │                                                     │
│           ▼                                                     │
│  [other_section_explore: ✓ Previous Content]                    │
│           │                                                     │
│           ▼                                                     │
│  [section_explore: Regenerate] ←─── Uses: other_section_engage  │
│           │                          + section_engage (new)     │
│           ▼                                                     │
│  [other_section_explain: ✓ Previous Content]                    │
│           │                                                     │
│           ▼                                                     │
│  [section_explain: Regenerate] ←─── Uses: other_section_engage  │
│           │                          + other_section_explore    │
│           ▼                          + section_engage (new)     │
│  [section_elaborate: Regenerate]     + section_explore (new)    │
│           │                                                     │
│           ▼                                                     │
│  [section_evaluate: ✓ Previous Content]                         │
│           │                                                     │
│           ▼                                                     │
│  [section_checklist: Regenerate] ←── Uses all previous +        │
│                                       current sections          │
└─────────────────────────────────────────────────────────────────┘
```

How It Works:

1. Each previous section becomes "other\_[section_id]" dependency node (COMPLETED)
2. Original workflow nodes get these "other\_" nodes as additional dependencies
3. LLM receives: previous content + user feedback + current parent sections
4. Only nodes requiring regeneration are executed (not already COMPLETED ones)
5. Parallel execution: [section_engage] || [section_evaluate] can run simultaneously

## API Endpoints

📋 **For complete API documentation with detailed request/response examples, see [APIContract.md](./APIContract.md)**

### Generate Lesson Plan

- **Endpoint**: `POST /api/v2/lesson-plans/`
- **Description**: Starts asynchronous lesson plan generation
- **Response**: Returns orchestration instance ID and status URLs

### Generate Checklist (Synchronous)

- **Endpoint**: `POST /api/v2/lesson-plans/checklist`
- **Description**: Generates a checklist synchronously with immediate response
- **Response**: Returns generated checklist content

## Prerequisites

- Python 3.11
- Poetry (for dependency management)
- Azure CLI (for deployment)
- Docker (for containerized deployment)
- Azure subscription with the following services:
  - Azure Functions (Premium or Dedicated plan recommended)
  - Azure Storage Account
  - Azure Container Registry (optional, for container deployment)
  - Azure OpenAI Service or OpenAI API access

## Local Development

### Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd durable-functions
   ```

2. **Install dependencies**

   ```bash
   poetry install
   ```

3. **Configure environment variables**
   Copy `local.settings.json.example` to `local.settings.json` and update with your values:

   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "your-storage-connection-string",
       "FUNCTIONS_WORKER_RUNTIME": "python",
       "AZURE_OPENAI_API_BASE": "your-openai-endpoint",
       "AZURE_OPENAI_API_KEY": "your-openai-key",
       "AZURE_OPENAI_API_VERSION": "2024-08-01-preview",
       "AZURE_OPENAI_MODEL": "gpt-4o",
       "AZURE_OPENAI_EMBED_MODEL": "text-embedding-ada-002",
       "BLOB_STORE_CONNECTION_STRING": "your-blob-storage-connection-string",
       "WEBHOOK_URL": "your-webhook-endpoint"
     }
   }
   ```

4. **Run locally**
   ```bash
   func start
   ```

## Deployment

### Container Deployment

1. **Build and push container**

   ```bash
   # Login to Azure Container Registry
   az acr login --name your-registry-name

   # Build and push
   docker build -t your-registry.azurecr.io/shiksha-functions:latest .
   docker push your-registry.azurecr.io/shiksha-functions:latest
   ```

2. **Create Azure function app**: Follow the Azure documented steps [here](https://learn.microsoft.com/en-us/azure/azure-functions/functions-how-to-custom-container?tabs=core-tools%2Cacr%2Cazure-cli2%2Cazure-cli&pivots=azure-functions#azure-portal-create-using-containers)

## Environment Variables

Configure the following environment variables in your Azure Function App:

### Environment Variables

| Variable                       | Description                                          | Example / Default                                |
| ------------------------------ | ---------------------------------------------------- | ------------------------------------------------ |
| `AzureWebJobsStorage`          | Azure Storage connection string for function runtime | `DefaultEndpointsProtocol=https;AccountName=...` |
| `FUNCTIONS_WORKER_RUNTIME`     | Function runtime                                     | `python`                                         |
| `AZURE_OPENAI_API_BASE`        | Azure OpenAI service endpoint                        | `https://your-openai.openai.azure.com`           |
| `AZURE_OPENAI_API_KEY`         | Azure OpenAI API key                                 | `your-api-key`                                   |
| `AZURE_OPENAI_API_VERSION`     | OpenAI API version                                   | `2024-08-01-preview`                             |
| `AZURE_OPENAI_MODEL`           | Primary GPT model                                    | `gpt-4o`                                         |
| `AZURE_OPENAI_EMBED_MODEL`     | Embedding model                                      | `text-embedding-ada-002`                         |
| `BLOB_STORE_CONNECTION_STRING` | Blob storage for content artifacts                   | `DefaultEndpointsProtocol=https;AccountName=...` |
| `WEBHOOK_URL`                  | Webhook endpoint for status updates                  | `None`                                           |
| `BLOB_STORE_URL`               | Public blob storage URL                              | `None`                                           |
| `AzureWebJobsFeatureFlags`     | Enable worker indexing                               | `EnableWorkerIndexing`                           |

### Setting Environment Variables

```bash
# Using Azure CLI
az functionapp config appsettings set --name shiksha-functions --resource-group shiksha-rg --settings "AZURE_OPENAI_API_KEY=your-key"

# Using Azure Portal
# Navigate to Function App > Configuration > Application settings
```

## Security Considerations

- Use Azure Key Vault for sensitive configuration values
- Enable Managed Identity for secure access to Azure resources
- Implement proper authentication for webhook endpoints
- Review and limit function app permissions
- Enable HTTPS-only traffic
