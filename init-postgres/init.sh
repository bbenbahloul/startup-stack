#!/bin/bash
set -e

# Automatically run by the postgres container on first startup
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE keycloak;
    CREATE DATABASE mattermost;
    CREATE DATABASE forgejo;
    GRANT ALL PRIVILEGES ON DATABASE keycloak TO "$POSTGRES_USER";
    GRANT ALL PRIVILEGES ON DATABASE mattermost TO "$POSTGRES_USER";
    GRANT ALL PRIVILEGES ON DATABASE forgejo TO "$POSTGRES_USER";
EOSQL