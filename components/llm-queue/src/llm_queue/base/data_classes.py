import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TelemetryData(BaseModel):
    user_id: str = "NO_USER_ID"
    req_id: str
    req_payload: str
    req_type: str
    deployment_name: str = "DEFAULT DEPLOYMENT NAME"
    request_received_at: int = Field(
        default_factory=lambda: int(datetime.now().timestamp())
    )
    request_queued_at: int = -1
    request_dequeued_at: int = -1
    response_queued_at: int = -1
    response_dequeued_at: int = -1
    prompt_tokens: int = -1
    completion_tokens: int = -1
    embedding_tokens: int = -1
    error_message: str = "NO ERROR"


class ModelPreferences(BaseModel):
    specific_embedding_model: Optional[str] = Field(
        default=None, description="Preferred Embedding Model"
    )
    specific_llm_model: Optional[str] = Field(
        default=None, description="Preferred LLM Model ID"
    )
    require_embedding_model: bool = Field(
        default=False, description="Is Embedding model requried to process this request"
    )
    require_llm_model: bool = Field(
        default=True, description="Is LLM model requried to process this request"
    )
    num_emb_calls_per_req: float = Field(
        default=1, description="Avg Number of Embedding LLM Calls made per request"
    )
    num_llm_calls_per_req: float = Field(
        default=1, description="Avg Number of LLM Calls made per request"
    )

    def has_specific_model_pref(self):
        return self.specific_embedding_model != None or self.specific_llm_model != None


class ScheduledRequest(BaseModel):
    req_type: str = Field(..., description="Type of the request controller to use")
    req_id: str = Field(..., description="Unique identifier for the request")
    payload: Dict[str, Any] = Field(
        ..., description="The request payload"
    )  # Assuming keys are strings and values can be any type
    model_preferences: ModelPreferences = Field(
        default_factory=ModelPreferences, description="Preferred models for the request"
    )
    telemetry_data: TelemetryData = Field(
        ..., description="Telemetry data associated with the request"
    )

    def __lt__(self, other: "ScheduledRequest") -> bool:
        """Less than comparison based on id."""
        if not isinstance(other, ScheduledRequest):
            return NotImplemented
        return self.req_id < other.req_id


class TopQueuedRequest(BaseModel):
    newly_queued_request: ModelPreferences = None
    waiting_requests_list: List[ModelPreferences] = []
