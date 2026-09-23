-- Creates the database the backend test suite runs against (phpunit.xml pins
-- DB_DATABASE=devnotes_test). Mounted into the dev `db` service only, never
-- production. The postgres image runs this directory ONLY when initialising
-- a brand-new, empty data volume, as POSTGRES_USER, so the database is owned
-- by the same role the backend connects as. An existing volume needs the
-- one-time command in docs/git-workflow.md ("Testing") instead.
CREATE DATABASE devnotes_test;
