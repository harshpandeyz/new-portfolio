-- Runs automatically only when PostgreSQL initializes an empty data directory.
-- It can also be run manually against an existing installation after creating
-- the role passwords in the host-only Compose environment.
\set ON_ERROR_STOP on
\getenv app_password POSTGRES_APP_PASSWORD
\getenv migrator_password POSTGRES_MIGRATOR_PASSWORD

SELECT format('CREATE ROLE hp_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L', :'migrator_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hp_migrator')
\gexec
SELECT format('ALTER ROLE hp_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L', :'migrator_password')
\gexec

SELECT format('CREATE ROLE hp_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hp_app')
\gexec
SELECT format('ALTER ROLE hp_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L', :'app_password')
\gexec

ALTER SCHEMA public OWNER TO hp_migrator;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE hp_os TO hp_migrator, hp_app;
GRANT USAGE ON SCHEMA public TO hp_app;
ALTER DEFAULT PRIVILEGES FOR ROLE hp_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hp_app;
ALTER DEFAULT PRIVILEGES FOR ROLE hp_migrator IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO hp_app;
ALTER DEFAULT PRIVILEGES FOR ROLE hp_migrator IN SCHEMA public
  GRANT USAGE ON TYPES TO hp_app;

\unset app_password
\unset migrator_password
