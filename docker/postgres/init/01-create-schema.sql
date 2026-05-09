-- Bootstraps the `registry` schema that src/prisma/schema.prisma expects.
-- Runs the first time the postgres container starts (entrypoint init scripts
-- only execute on an empty data volume); for subsequent runs it's a no-op.

CREATE SCHEMA IF NOT EXISTS registry;
