"""T0004: the api and web answer their health and readiness checks through the published ports."""

import httpx
import pytest

from .conftest import StackSettings

pytestmark = pytest.mark.stack


def test_api_is_alive(stack: StackSettings) -> None:
    response = httpx.get(stack.api("/healthz"), timeout=10)
    assert response.status_code == 200, response.text


def test_api_is_ready_with_postgres_and_redis(stack: StackSettings) -> None:
    response = httpx.get(stack.api("/readyz"), timeout=10)
    assert response.status_code == 200, response.text
    assert response.json() == {"status": "ready"}


def test_web_is_alive(stack: StackSettings) -> None:
    response = httpx.get(stack.web("/api/healthz"), timeout=10)
    assert response.status_code == 200, response.text
