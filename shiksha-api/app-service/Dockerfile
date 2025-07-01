FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies and Poetry
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -sSL https://install.python-poetry.org | python3 -

# Add Poetry to PATH
ENV PATH="${PATH}:/root/.local/bin"

# Configure Poetry to not create a virtual environment inside the Docker container
RUN poetry config virtualenvs.create false

# Copy pyproject.toml and poetry.lock (if exists)
COPY pyproject.toml ./
COPY poetry.lock* ./

# Install Python dependencies
RUN poetry install --no-interaction --no-ansi --no-dev

# Copy application code
COPY . .

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser:appuser /app
USER appuser

# Expose port (default for App Service is 8000, but can be configured)
EXPOSE 8000

# Run the application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
