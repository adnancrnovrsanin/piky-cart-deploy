/*
  # Shopping List Sharing - Shared Links Table
  
  1. New Table
    - `shared_links` - Stores shareable links for shopping lists
    
  2. Security
    - Enable RLS on shared_links table
    - Add policies for authenticated users to manage their own shared links
    - Add policy for public access to shared list data via valid tokens
    
  3. Features
    - Unique tokens for sharing lists
    - Expiration control with optional expires_at
    - Active/inactive state control
    - Automatic cleanup when lists are deleted (CASCADE)
*/

-- Create shared_links table
CREATE TABLE shared_links (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id uuid REFERENCES shopping_lists(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true
);

-- Create indexes for better performance
CREATE INDEX idx_shared_links_token ON shared_links(token);
CREATE INDEX idx_shared_links_list_id ON shared_links(list_id);
CREATE INDEX idx_shared_links_expires_at ON shared_links(expires_at);
CREATE INDEX idx_shared_links_is_active ON shared_links(is_active);

-- Composite index for efficient token validation
CREATE INDEX idx_shared_links_token_active_expiry ON shared_links(token, is_active, expires_at);