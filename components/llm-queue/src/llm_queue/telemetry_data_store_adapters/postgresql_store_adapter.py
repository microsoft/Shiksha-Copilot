import asyncpg
from llm_queue.base.adapter_base_classes import TelemetryDataStoreAdapter
from llm_queue.base.data_classes import TelemetryData


class PostgresqlTelemetryStoreAdapter(TelemetryDataStoreAdapter):
    """
    Implements the abstract class `TelemetryDataStoreAdapter` to store LLM Queue telemetry data in a
    PostgreSQL datastore

    Parameters:
        db_name, user, password and host: PostgreSQL database credentials
    """

    def __init__(self, db_name: str, user: str, password: str, host: str):
        self.db_name = db_name
        self.user = user
        self.password = password
        self.host = host
        self.pool = None
        self.table_name = "llm_telemetry_golden_lps"

    async def connect(self):
        self.pool = await asyncpg.create_pool(
            database=self.db_name,
            user=self.user,
            password=self.password,
            host=self.host,
        )
        async with self.pool.acquire() as conn:
            check_table_existence = f"""
                SELECT EXISTS (
                    SELECT FROM pg_catalog.pg_tables
                    WHERE schemaname='public' AND tablename='{self.table_name}'
                )
            """
            records = await conn.fetch(check_table_existence)
            exists = records[0][0]
            if not exists:
                print(
                    f"Telemetry table {self.table_name} does not exist. Creating one..."
                )
                query = self.__get_create_sql_table_command()
                await conn.execute(query)
                print("Created telemetry table.")

    async def disconnect(self):
        await self.pool.close()

    async def insert_telemetry_data(self, telemetry_data: TelemetryData):
        insert_query, values = self.__get_sql_insert_query(
            self.table_name, telemetry_data
        )
        async with self.pool.acquire() as conn:
            await conn.execute(insert_query, *values)

    def __get_sql_insert_query(self, table_name: str, telemetry_data: TelemetryData):
        query = f"""
            INSERT INTO {table_name}
            (req_id, user_id, req_payload, req_type, deployment_name, request_received_at,
            request_queued_at, request_dequeued_at, response_queued_at, response_dequeued_at,
            prompt_tokens, completion_tokens, embedding_tokens, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        """
        values = (
            telemetry_data.req_id,
            telemetry_data.user_id,
            telemetry_data.req_payload,
            telemetry_data.req_type,
            telemetry_data.deployment_name,
            telemetry_data.request_received_at,
            telemetry_data.request_queued_at,
            telemetry_data.request_dequeued_at,
            telemetry_data.response_queued_at,
            telemetry_data.response_dequeued_at,
            telemetry_data.prompt_tokens,
            telemetry_data.completion_tokens,
            telemetry_data.embedding_tokens,
            telemetry_data.error_message,
        )
        return query, values

    def __get_create_sql_table_command(self):
        return f"""
        CREATE TABLE {self.table_name}(
            req_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            req_payload TEXT NOT NULL,
            req_type TEXT NOT NULL,
            deployment_name TEXT,
            request_received_at INTEGER NOT NULL,
            request_queued_at INTEGER,
            request_dequeued_at INTEGER,
            response_queued_at INTEGER,
            response_dequeued_at INTEGER,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            embedding_tokens INTEGER,
            error_message TEXT
        )
        """
