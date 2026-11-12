-- Create limited, non-owner, non-superuser role for the application runtime
-- The role is created without a hard-coded password.
-- The database administrator sets the password out-of-band via:
-- ALTER ROLE medguard_app WITH PASSWORD '<secure_password>';
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'medguard_app') THEN
        CREATE ROLE medguard_app WITH LOGIN;
    END IF;
END
$$;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO medguard_app;

-- Grant DML permissions needed by the API
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO medguard_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO medguard_app;

-- Ensure future tables and sequences automatically grant DML to medguard_app
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO medguard_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO medguard_app;
