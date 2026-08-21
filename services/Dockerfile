FROM python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency files first (Docker layer caching)
COPY api/pyproject.toml api/uv.lock ./

# Sync dependencies using uv
RUN uv sync --frozen

# Copy the rest of the application code
COPY api/ ./

# Expose the port the API runs on
EXPOSE 8020

# Default command: start uvicorn with reload
CMD ["uv", "run", "uvicorn", "main:app", "--reload", "--port", "8020", "--host", "0.0.0.0"]