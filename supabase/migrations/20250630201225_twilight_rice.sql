/*
# Fix RLS Policies Migration

1. Changes
   - Added IF NOT EXISTS to all policy creation statements
   - Maintains all the same policies but prevents errors when they already exist

2. Security
   - Maintains all the same Row Level Security policies
   - Ensures proper access control for all tables
*/

-- Enable RLS on all tables
ALTER TABLE IF EXISTS shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS list_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS share_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shared_links ENABLE ROW LEVEL SECURITY;

-- Policies for shopping_lists
-- 1. Users can view, insert, update, delete their own lists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'shopping_lists' AND policyname = 'Users can manage their own lists'
  ) THEN
    CREATE POLICY "Users can manage their own lists"
      ON shopping_lists
      USING (user_id = auth.uid());
  END IF;
END $$;

-- 2. Collaborators can view lists they have access to
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'shopping_lists' AND policyname = 'Collaborators can view lists'
  ) THEN
    CREATE POLICY "Collaborators can view lists"
      ON shopping_lists
      FOR SELECT
      USING (
        id IN (
          SELECT list_id FROM list_collaborators 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 3. Collaborators with editor role can update lists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'shopping_lists' AND policyname = 'Editors can update lists'
  ) THEN
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
  END IF;
END $$;

-- Policies for list_items
-- 1. Users can manage items in their own lists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'list_items' AND policyname = 'Users can manage items in their own lists'
  ) THEN
    CREATE POLICY "Users can manage items in their own lists"
      ON list_items
      USING (
        list_id IN (
          SELECT id FROM shopping_lists 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 2. Collaborators can view items in lists they have access to
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'list_items' AND policyname = 'Collaborators can view list items'
  ) THEN
    CREATE POLICY "Collaborators can view list items"
      ON list_items
      FOR SELECT
      USING (
        list_id IN (
          SELECT list_id FROM list_collaborators 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 3. Collaborators with editor role can update/insert/delete items
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'list_items' AND policyname = 'Editors can manage list items'
  ) THEN
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
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'list_items' AND policyname = 'Editors can update list items'
  ) THEN
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
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'list_items' AND policyname = 'Editors can delete list items'
  ) THEN
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
  END IF;
END $$;

-- Policies for user_profiles
-- Users can only view and manage their own profile
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'user_profiles' AND policyname = 'Users can manage their own profile'
  ) THEN
    CREATE POLICY "Users can manage their own profile"
      ON user_profiles
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Policies for list_collaborators
-- 1. Users can view collaborators for lists they have access to
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'list_collaborators' AND policyname = 'Users can view collaborators for their lists'
  ) THEN
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
  END IF;
END $$;

-- 2. Only list owners can manage collaborators
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'list_collaborators' AND policyname = 'Owners can manage collaborators'
  ) THEN
    CREATE POLICY "Owners can manage collaborators"
      ON list_collaborators
      USING (
        list_id IN (
          SELECT id FROM shopping_lists WHERE user_id = auth.uid()
          UNION
          SELECT list_id FROM list_collaborators WHERE user_id = auth.uid() AND role = 'owner'
        )
      );
  END IF;
END $$;

-- Policies for share_invitations
-- 1. Users can view invitations they've sent
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'share_invitations' AND policyname = 'Users can view invitations they''ve sent'
  ) THEN
    CREATE POLICY "Users can view invitations they've sent"
      ON share_invitations
      FOR SELECT
      USING (inviter_id = auth.uid());
  END IF;
END $$;

-- 2. Users can view invitations sent to their email
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'share_invitations' AND policyname = 'Users can view invitations sent to them'
  ) THEN
    CREATE POLICY "Users can view invitations sent to them"
      ON share_invitations
      FOR SELECT
      USING (invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
  END IF;
END $$;

-- 3. Only list owners can create invitations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'share_invitations' AND policyname = 'Owners can create invitations'
  ) THEN
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
  END IF;
END $$;

-- Policies for shared_links
-- 1. Users can view and manage shared links for their own lists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'shared_links' AND policyname = 'Users can manage shared links for their lists'
  ) THEN
    CREATE POLICY "Users can manage shared links for their lists"
      ON shared_links
      USING (
        list_id IN (
          SELECT id FROM shopping_lists WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 2. Anyone can view active shared links (needed for public access)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'shared_links' AND policyname = 'Anyone can view active shared links'
  ) THEN
    CREATE POLICY "Anyone can view active shared links"
      ON shared_links
      FOR SELECT
      USING (is_active = true);
  END IF;
END $$;