import asyncio
import logging

from llm_queue.base.adapter_base_classes import TelemetryDataStoreAdapter
from llm_queue.base.data_classes import TelemetryData


class Telemetry:
    def __init__(self, data_store: TelemetryDataStoreAdapter = None):
        self.data_store = data_store
        self.logging = logging.getLogger(__name__)

    async def disconnect_database(self):
        if self.data_store:
            await self.data_store.disconnect()

    async def connect_database(self):
        if self.data_store:
            await self.data_store.connect()

    async def __sink_with_error(self, error, telemetry_data: TelemetryData):
        if self.data_store:
            telemetry_data.error_message = str(error)
            await self.data_store.insert_telemetry_data(telemetry_data)
            self.logging.debug("SINKED ERROR TELEMETRY")

    async def __sink_successfull(self, telemetry_data: TelemetryData):
        if self.data_store:
            await self.data_store.insert_telemetry_data(telemetry_data)
            self.logging.debug("SINKED SUCCESS TELEMETRY")

    def sink_with_error(self, error, telemetry_data: TelemetryData):
        if self.data_store:
            asyncio.create_task(self.__sink_with_error(error, telemetry_data))

    def sink_successfull(self, telemetry_data: TelemetryData):
        if self.data_store:
            asyncio.create_task(self.__sink_successfull(telemetry_data))
