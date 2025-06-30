/*
  # Enable Row Level Security and Add Access Policies

  1. Security
    - Enable RLS on all tables
    - Add policies for shopping_lists, list_items, and other tables
    - Ensure users can only access their own data
    - Add special policies for shared lists and collaborators

  2. Changes
    - Enable RLS on all tables
    - Add owner access policies
    - Add collaborator access policies
    - Add shared link access policies
*/

-- Enable RLS on all tables
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;

-- Policies for shopping_lists
-- 1. Users can view, insert, update, delete their own lists
CREATE POLICY "Users can manage their own lists"
  ON shopping_lists
  USING (user_id = auth.uid());

-- 2. Collaborators can view lists they have access to
CREATE POLICY "Collaborators can view lists"
  ON shopping_lists
  FOR SELECT
  USING (
    id IN (
      SELECT list_id FROM list_collaborators 
      WHERE user_id = auth.uid()
    )
  );

-- 3. Collaborators with editor role can update lists
CREATE POLICY "Editors can update lists"
  ON shopping_lists
  FOR UPDATE
  USING (
    id IN (
      SELECT list_id FROM list_collaborators 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'editor')
    )
  );

-- Policies for list_items
-- 1. Users can manage items in their own lists
CREATE POLICY "Users can manage items in their own lists"
  ON list_items
  USING (
    list_id IN (
      SELECT id FROM shopping_lists 
      WHERE user_id = auth.uid()
    )
  );

-- 2. Collaborators can view items in lists they have access to
CREATE POLICY "Collaborators can view list items"
  ON list_items
  FOR SELECT
  USING (
    list_id IN (
      SELECT list_id FROM list_collaborators 
      WHERE user_id = auth.uid()
    )
  );

-- 3. Collaborators with editor role can update/insert/delete items
CREATE POLICY "Editors can manage list items"
  ON list_items
  FOR INSERT
  WITH CHECK (
    list_id IN (
      SELECT list_id FROM list_collaborators 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can update list items"
  ON list_items
  FOR UPDATE
  USING (
    list_id IN (
      SELECT list_id FROM list_collaborators 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can delete list items"
  ON list_items
  FOR DELETE
  USING (
    list_id IN (
      SELECT list_id FROM list_collaborators 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'editor')
    )
  );

-- Policies for user_profiles
-- Users can only view and manage their own profile
CREATE POLICY "Users can manage their own profile"
  ON user_profiles
  USING (user_id = auth.uid());

-- Policies for list_collaborators
-- 1. Users can view collaborators for lists they have access to
CREATE POLICY "Users can view collaborators for their lists"
  ON list_collaborators
  FOR SELECT
  USING (
    list_id IN (
      SELECT id FROM shopping_lists WHERE user_id = auth.uid()
      UNION
      SELECT list_id FROM list_collaborators WHERE user_id = auth.uid()
    )
  );

-- 2. Only list owners can manage collaborators
CREATE POLICY "Owners can manage collaborators"
  ON list_collaborators
  USING (
    list_id IN (
      SELECT id FROM shopping_lists WHERE user_id = auth.uid()
      UNION
      SELECT list_id FROM list_collaborators WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Policies for share_invitations
-- 1. Users can view invitations they've sent
CREATE POLICY "Users can view invitations they've sent"
  ON share_invitations
  FOR SELECT
  USING (inviter_id = auth.uid());

-- 2. Users can view invitations sent to their email
CREATE POLICY "Users can view invitations sent to them"
  ON share_invitations
  FOR SELECT
  USING (invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 3. Only list owners can create invitations
CREATE POLICY "Owners can create invitations"
  ON share_invitations
  FOR INSERT
  WITH CHECK (
    list_id IN (
      SELECT id FROM shopping_lists WHERE user_id = auth.uid()
      UNION
      SELECT list_id FROM list_collaborators WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Policies for shared_links
-- 1. Users can view and manage shared links for their own lists
CREATE POLICY "Users can manage shared links for their lists"
  ON shared_links
  USING (
    list_id IN (
      SELECT id FROM shopping_lists WHERE user_id = auth.uid()
    )
  );

-- 2. Anyone can view active shared links (needed for public access)
CREATE POLICY "Anyone can view active shared links"
  ON shared_links
  FOR SELECT
  USING (is_active = true);