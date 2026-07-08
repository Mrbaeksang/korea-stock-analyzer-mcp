FROM python:3.12-slim

# Pin uv version per official best practice (docs.astral.sh/uv/guides/integration/docker)
COPY --from=ghcr.io/astral-sh/uv:0.11.28 /uv /uvx /bin/

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_NO_DEV=1 \
    PYTHONUNBUFFERED=1

# Dependency layer before source copy for layer caching.
# Plain COPY only — Railway's builder rejects bind/cache mounts without
# service-scoped ids, which would break every fork.
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-install-project

COPY src ./src

ENV PATH="/app/.venv/bin:$PATH" \
    APP_CACHE_DIR=/tmp/app-cache

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --app-dir src --host 0.0.0.0 --port ${PORT:-8000}"]
