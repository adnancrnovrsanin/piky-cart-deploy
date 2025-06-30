/*
  # Reset PikyCart Database Schema

  1. Drop all existing tables and functions
  2. Clean slate for fresh migration application
  
  This migration will remove all existing data and schema.
*/

-- Drop all existing tables in the correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS list_items CASCADE;
DROP TABLE IF EXISTS shopping_lists CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop all custom functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_list_counts() CASCADE;
DROP FUNCTION IF EXISTS update_list_counts_on_delete() CASCADE;

-- Drop all custom triggers (they should be dropped with the functions, but being explicit)
-- Note: Triggers are automatically dropped when tables are dropped

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";