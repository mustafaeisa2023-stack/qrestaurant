-- ============================================================
-- QRestaurant - PostgreSQL Initialization Script
-- Runs on first database creation
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'UTC';

-- Create indexes for common query patterns (Prisma migrations handle tables,
-- but we can add performance indexes here)
-- These will be added AFTER Prisma runs migrations

DO $$
BEGIN
  RAISE NOTICE 'QRestaurant database initialized successfully';
END $$;
