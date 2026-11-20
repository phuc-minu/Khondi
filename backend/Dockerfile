FROM python:3.12.8-slim AS builder
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install --no-cache-dir "uv==0.6.14" && uv sync --frozen --no-dev --no-install-project
COPY khondi_api ./khondi_api
RUN uv sync --frozen --no-dev

FROM python:3.12.8-slim AS runtime
WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/khondi_api ./khondi_api
RUN useradd --create-home --uid 10001 appuser && chown -R appuser:appuser /app
USER appuser
ENV PYTHONUNBUFFERED=1
ENV PATH="/app/.venv/bin:$PATH"
CMD ["sh", "-c", "exec uvicorn khondi_api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
