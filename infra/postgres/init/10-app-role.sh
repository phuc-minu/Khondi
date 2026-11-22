#!/bin/sh
# Creates khondi_app, the least-privilege role the api connects as (T0005).
# The postgres image runs this once, when the data volume is empty. POSTGRES_USER owns the
# schema and is used only by the migrate job; khondi_app may read and write data, not change it.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v app_password="$POSTGRES_APP_PASSWORD" -v db="$POSTGRES_DB" -v owner="$POSTGRES_USER" <<'SQL'
CREATE ROLE khondi_app LOGIN PASSWORD :'app_password';
GRANT CONNECT ON DATABASE :"db" TO khondi_app;
GRANT USAGE ON SCHEMA public TO khondi_app;
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner" IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO khondi_app;
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner" IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO khondi_app;
SQL
