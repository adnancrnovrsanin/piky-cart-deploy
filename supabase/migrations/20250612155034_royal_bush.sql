/*
  # PikyCart Shopping App Database Schema

  1. New Tables
    - `user_profiles` - Extended user profile information
    - `shopping_lists` - User's shopping lists with name and metadata
    - `list_items` - Individual items within shopping lists (with store property)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Secure user data access patterns

  3. Features
    - Support for multiple lists per user
    - Categorized items with purchase status and store assignment
    - Automatic count tracking for items and purchased items
    - Timestamps for sync and ordering
*/

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table for extended user information
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Shopping lists table with item counts
CREATE TABLE shopping_lists (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_archived boolean DEFAULT false,
  item_count integer DEFAULT 0,
  purchased_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- List items table with store property
CREATE TABLE list_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id uuid REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity integer DEFAULT 1,
  category text DEFAULT 'other',
  notes text,
  store text, -- Store where the item will be purchased (optional)
  is_purchased boolean DEFAULT false,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Shopping lists policies
CREATE POLICY "Users can view own lists"
  ON shopping_lists
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lists"
  ON shopping_lists
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lists"
  ON shopping_lists
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own lists"
  ON shopping_lists
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- List items policies
CREATE POLICY "Users can view items from own lists"
  ON list_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shopping_lists 
      WHERE id = list_items.list_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert items into own lists"
  ON list_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopping_lists 
      WHERE id = list_items.list_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in own lists"
  ON list_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shopping_lists 
      WHERE id = list_items.list_id 
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopping_lists 
      WHERE id = list_items.list_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items from own lists"
  ON list_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shopping_lists 
      WHERE id = list_items.list_id 
      AND user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_shopping_lists_user_id ON shopping_lists(user_id);
CREATE INDEX idx_shopping_lists_created_at ON shopping_lists(created_at DESC);
CREATE INDEX idx_shopping_lists_is_archived ON shopping_lists(is_archived);
CREATE INDEX idx_list_items_list_id ON list_items(list_id);
CREATE INDEX idx_list_items_created_at ON list_items(created_at DESC);
CREATE INDEX idx_list_items_category ON list_items(category);
CREATE INDEX idx_list_items_store ON list_items(store);
CREATE INDEX idx_list_items_is_purchased ON list_items(is_purchased);
-- Composite index for store + category grouping
CREATE INDEX idx_list_items_store_category ON list_items(store, category);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_lists_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_list_items_updated_at
  BEFORE UPDATE ON list_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to update list counts
CREATE OR REPLACE FUNCTION update_list_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the counts in the shopping_lists table
  UPDATE shopping_lists
  SET 
    item_count = (SELECT COUNT(*) FROM list_items WHERE list_id = NEW.list_id),
    purchased_count = (SELECT COUNT(*) FROM list_items WHERE list_id = NEW.list_id AND is_purchased = true)
  WHERE id = NEW.list_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle item deletions
CREATE OR REPLACE FUNCTION update_list_counts_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the counts in the shopping_lists table
  UPDATE shopping_lists
  SET 
    item_count = (SELECT COUNT(*) FROM list_items WHERE list_id = OLD.list_id),
    purchased_count = (SELECT COUNT(*) FROM list_items WHERE list_id = OLD.list_id AND is_purchased = true)
  WHERE id = OLD.list_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to maintain counts
CREATE TRIGGER update_list_counts_insert_update
  AFTER INSERT OR UPDATE ON list_items
  FOR EACH ROW
  EXECUTE FUNCTION update_list_counts();

CREATE TRIGGER update_list_counts_delete
  AFTER DELETE ON list_items
  FOR EACH ROW
  EXECUTE FUNCTION update_list_counts_on_delete();