# FastAPI + Python venv for deployment, Poetry for development
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid 1000 --shell /bin/bash --create-home appuser

# Install Poetry temporarily for dependency export
RUN pip install "poetry==1.7.1"

WORKDIR /app

# Copy Poetry configuration files
COPY pyproject.toml poetry.lock* ./

# Copy the local rag-wrapper dependency before generating requirements
COPY app/rag-wrapper ./app/rag-wrapper

# Copy all files first
COPY --chown=appuser:appuser . .

# Generate requirements.txt from Poetry (excluding local dependencies) and install in virtual environment
RUN python -m venv /opt/venv && \
    . /opt/venv/bin/activate && \
    poetry export --only=main --format=requirements.txt --output=requirements.txt --without-hashes && \
    # Remove the local dependency line from requirements.txt as we'll install it separately
    grep -v "vellm-rag-wrapper" requirements.txt > requirements_clean.txt && \
    pip install -r requirements_clean.txt && \
    # Install the local rag-wrapper package
    pip install -e ./app/rag-wrapper

# Remove Poetry to reduce image size
RUN pip uninstall -y poetry

# Switch to appuser
USER appuser

# Make sure we use the virtual environment and add app to Python path
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="/app:$PYTHONPATH"

EXPOSE 8000

# Use uvicorn directly from the virtual environment
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
