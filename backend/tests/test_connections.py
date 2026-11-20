from pydantic import PostgresDsn, RedisDsn

from khondi_api.connections import postgres_options, redis_options


def test_plain_connections_are_not_tls() -> None:
    assert postgres_options(PostgresDsn("postgresql://user:pass@db:5432/app")) == {}
    assert redis_options(RedisDsn("redis://db:6379/0")) == {"ssl": False}


def test_tls_connections_are_enabled() -> None:
    assert postgres_options(PostgresDsn("postgresql://user:pass@db:5432/app?sslmode=require")) == {"ssl": True}
    assert redis_options(RedisDsn("rediss://db:6380/0")) == {"ssl": True}
