import datetime
from enum import Enum
from typing import Optional, Union
import logging
import os
import aiohttp
from pydantic import BaseModel
from core.config import Config


class StatusEnum(Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    FAILED = "FAILED"
    COMPLETED = "COMPLETED"


class GenStatus(BaseModel):
    instance_id: str
    status: str
    timestamp: str
    input: Optional[dict] = None
    output: Optional[Union[dict, str]] = None

    @staticmethod
    def from_status_and_output(
        instance_id, input, status: StatusEnum, output: dict | str = None
    ):
        return GenStatus(
            instance_id=instance_id,
            status=status.value,
            timestamp=datetime.datetime.now().isoformat(),
            input=input,
            output=output,
        )


class WebhookPoster:
    def __init__(self):
        self.webhook_url = Config.WEBHOOK_URL

    async def post_status(self, gen_status: GenStatus):
        if self.webhook_url:
            async with aiohttp.ClientSession() as session:
                try:
                    async with session.post(
                        self.webhook_url, json=gen_status.dict()
                    ) as response:
                        response.raise_for_status()  # Raise an error for bad status codes
                        logging.info(
                            f"Successfully posted GenStatus: {gen_status.instance_id}"
                        )
                except aiohttp.ClientError as e:
                    logging.error(f"Failed to post GenStatus: {gen_status.instance_id}")
                    logging.error(f"Error: {e}")
                    self.log_gen_status(gen_status)

    @staticmethod
    def log_gen_status(gen_status: GenStatus):
        logging.info(f"GenStatus log: {gen_status.dict()}")
