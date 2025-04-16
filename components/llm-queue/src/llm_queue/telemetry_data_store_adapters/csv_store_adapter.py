import csv
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor

from llm_queue.base.adapter_base_classes import TelemetryDataStoreAdapter
from llm_queue.base.data_classes import TelemetryData


class CSVTelemetryDataStore(TelemetryDataStoreAdapter):
    """
    Implements the abstract class `TelemetryDataStoreAdapter` to store LLM Queue telemetry data in a
    CSV format
    """

    def __init__(self, file_path: str):
        self.file_path = file_path
        self.executor = ThreadPoolExecutor(
            max_workers=1
        )  # Ensure serial access to the CSV file

    async def connect(self):
        if not os.path.exists(self.file_path):
            await asyncio.get_event_loop().run_in_executor(
                self.executor, self._write_headers
            )

    async def disconnect(self):
        pass  # No action needed for CSV files

    async def insert_telemetry_data(self, telemetry_data: TelemetryData):
        data_dict = telemetry_data.dict()
        await asyncio.get_event_loop().run_in_executor(
            self.executor, self._append_row, data_dict
        )

    def _write_headers(self):
        headers = TelemetryData.__fields__.keys()
        self._write_row(headers, "w+")

    def _append_row(self, data_dict):
        row = [data_dict[field] for field in TelemetryData.__fields__]
        self._write_row(row)

    def _write_row(self, row, mode="a"):
        with open(self.file_path, mode, newline="") as file:
            writer = csv.writer(file)
            writer.writerow(row)
