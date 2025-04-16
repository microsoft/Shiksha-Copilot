import json
import pytest
import logging
from unittest.mock import AsyncMock, MagicMock, patch
from llm_queue import LLMQueue
from llm_queue.base.custom_errors import (
    UserIdHeaderMissingError,
    UserRateLimitExceededError,
    SchedulerQueueFullError,
    QueueTimeoutError,
)
from llm_queue.base.data_classes import (
    ModelPreferences,
    ScheduledRequest,
    TelemetryData,
)
from llm_queue.base.config_data_classes import LLMConfig
from llm_queue.base import BaseRequestController
import yaml
from dataclasses import asdict
import asyncio

LLM_CONFIG_PATH = "tests/configs/llm_config.yaml"
TEST_REQUEST_TYPE = "test"
TEST_USER_ID = "test-user"

logger = logging.getLogger(__name__)


@pytest.fixture
async def llm_queue_instance():
    # Function to load LLMConfig from a YAML file
    def load_llm_config_from_file(file_path):
        with open(file_path, "r") as file:
            data = yaml.safe_load(file)
        return LLMConfig(**data)

    class MockRequestExecutor(BaseRequestController):
        async def process_request(self, req, chosen_llm_ids, telemetry_data):
            await asyncio.sleep(10)  # Simulate execution time of 10 seconds
            return f"CHOSEN LLM IDs {chosen_llm_ids} -- REQ DATA: {json.dumps(req, indent=4)}"

    llm_config = load_llm_config_from_file(LLM_CONFIG_PATH)
    request_executors = {TEST_REQUEST_TYPE: MockRequestExecutor()}
    llm_queue = LLMQueue(
        llm_config,
        request_executors,
    )
    await llm_queue.initiate()
    yield llm_queue


@pytest.mark.asyncio
async def test_basic_flow(llm_queue_instance):
    resp, status = await llm_queue_instance.execute_request(
        req_type=TEST_REQUEST_TYPE,
        user_id=TEST_USER_ID,
        request_data={"data": "test-data"},
        model_pref=ModelPreferences(
            require_embedding_model=True,
            require_llm_model=True,
            num_emb_calls_per_req=1,
            num_llm_calls_per_req=1,
        ),
    )
    logger.info(f"RESPONSE: {resp}")
    logger.info(f"STATUS: {status}")
    await llm_queue_instance.graceful_shutdown()
