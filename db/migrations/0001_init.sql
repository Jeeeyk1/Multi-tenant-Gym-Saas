-- Migration : 0001_init
-- Description: Initial database setup — enable extensions
-- Applied by : db/scripts/apply-migrations.ts

-- Generate UUIDs with uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Hashing and crypto utilities
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
