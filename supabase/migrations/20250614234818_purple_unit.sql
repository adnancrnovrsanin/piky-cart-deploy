/*
  # Disable Row Level Security

  This migration disables Row Level Security (RLS) on all tables to simplify the project
  while maintaining all existing functionality including:
  
  1. Table structures and relationships
  2. Triggers for automatic updates
  3. Indexes for performance
  4. Foreign key constraints
  5. Check constraints
  
  ## Changes Made
  - Disable RLS on all tables
  - Remove all RLS policies (they become unnecessary)
  - Keep all other database functionality intact
  
  ## Security Note
  With RLS disabled, the application will rely on application-level security
  through the authentication system and proper API endpoint validation.
*/

-- Disable RLS on all tables
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE list_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE shared_lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE shared_links DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies since they're no longer needed

-- User profiles policies
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;

-- Shopping lists policies
DROP POLICY IF EXISTS "Users can insert own lists" ON shopping_lists;
DROP POLICY IF EXISTS "Users can update own lists" ON shopping_lists;
DROP POLICY IF EXISTS "Users can delete own lists" ON shopping_lists;
DROP POLICY IF EXISTS "Users can view own lists" ON shopping_lists;

-- List items policies
DROP POLICY IF EXISTS "Users can insert items into own lists" ON list_items;
DROP POLICY IF EXISTS "Users can update items in own lists" ON list_items;
DROP POLICY IF EXISTS "Users can delete items from own lists" ON list_items;
DROP POLICY IF EXISTS "Users can view items from own lists" ON list_items;

-- Shared lists policies
DROP POLICY IF EXISTS "Users can create shares for their own lists" ON shared_lists;
DROP POLICY IF EXISTS "Users can update shares for their own lists" ON shared_lists;
DROP POLICY IF EXISTS "Users can delete shares for their own lists" ON shared_lists;
DROP POLICY IF EXISTS "Users can view shares for their own lists" ON shared_lists;

-- Shared links policies
DROP POLICY IF EXISTS "Public can view shared lists via valid tokens" ON shared_links;
DROP POLICY IF EXISTS "Users can create shared links for own lists" ON shared_links;
DROP POLICY IF EXISTS "Users can update shared links for own lists" ON shared_links;
DROP POLICY IF EXISTS "Users can delete shared links for own lists" ON shared_links;
DROP POLICY IF EXISTS "Users can view shared links for own lists" ON shared_links;