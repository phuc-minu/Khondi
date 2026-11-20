FROM python:3.12.8-slim AS runtime
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir "fastapi==0.115.6" "uvicorn[standard]==0.34.0" "pydantic-settings==2.7.1" "asyncpg==0.30.0" "redis==5.2.1"
COPY khondi_api ./khondi_api
RUN useradd --create-home --uid 10001 appuser && chown -R appuser:appuser /app
USER appuser
ENV PYTHONUNBUFFERED=1
CMD ["sh", "-c", "exec uvicorn khondi_api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
