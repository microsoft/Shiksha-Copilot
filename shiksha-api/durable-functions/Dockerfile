# To enable ssh & remote debugging on app service change the base image to the one below
# FROM mcr.microsoft.com/azure-functions/python:4-python3.11-appservice

# 1) Base off the official Azure Functions Python 3.11 image
FROM mcr.microsoft.com/azure-functions/python:4-python3.11

# 2) Enable console logging for easier debug
ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true

# 3) Install Poetry into the container
RUN pip install --no-cache-dir poetry

# 4) Set the working directory where the Functions host expects your code
WORKDIR /home/site/wwwroot

# 5) Copy dependency manifests first (for Docker layer caching)
COPY pyproject.toml poetry.lock* ./

# 6) Copy your local path‐dependency so Poetry can find it
COPY core/rag-wrapper ./core/rag-wrapper

# 7) Configure Poetry to install into the system Python (not in a venv)
#    and install only non-dev (runtime) dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi

# 8) Copy the rest of your function-app code
COPY . .

# 9) The Functions base image already sets ENTRYPOINT/CMD to launch the host
