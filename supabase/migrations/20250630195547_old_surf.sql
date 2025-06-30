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
    - Add shared list access policies
    
  3. Error Handling
    - Use DO blocks to safely create policies that might already exist
    - Avoid syntax errors with IF NOT EXISTS which isn't supported for policies
*/

-- Enable RLS on all tables
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;

-- Safely create policies using DO blocks to check if they exist first
-- This avoids errors when policies already exist

-- Policies for shopping_lists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shopping_lists' 
        AND policyname = 'Users can manage their own lists'
    ) THEN
        CREATE POLICY "Users can manage their own lists"
          ON shopping_lists
          USING (user_id = auth.uid());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shopping_lists' 
        AND policyname = 'Collaborators can view lists'
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shopping_lists' 
        AND policyname = 'Editors can update lists'
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
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'list_items' 
        AND policyname = 'Users can manage items in their own lists'
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'list_items' 
        AND policyname = 'Collaborators can view list items'
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'list_items' 
        AND policyname = 'Editors can manage list items'
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
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'list_items' 
        AND policyname = 'Editors can update list items'
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
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'list_items' 
        AND policyname = 'Editors can delete list items'
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
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Users can manage their own profile'
    ) THEN
        CREATE POLICY "Users can manage their own profile"
          ON user_profiles
          USING (user_id = auth.uid());
    END IF;
END $$;

-- Policies for list_collaborators
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'list_collaborators' 
        AND policyname = 'Users can view collaborators for their lists'
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'list_collaborators' 
        AND policyname = 'Owners can manage collaborators'
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
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'share_invitations' 
        AND policyname = 'Users can view invitations they''ve sent'
    ) THEN
        CREATE POLICY "Users can view invitations they've sent"
          ON share_invitations
          FOR SELECT
          USING (inviter_id = auth.uid());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'share_invitations' 
        AND policyname = 'Users can view invitations sent to them'
    ) THEN
        CREATE POLICY "Users can view invitations sent to them"
          ON share_invitations
          FOR SELECT
          USING (invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'share_invitations' 
        AND policyname = 'Owners can create invitations'
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
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shared_links' 
        AND policyname = 'Users can manage shared links for their lists'
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shared_links' 
        AND policyname = 'Anyone can view active shared links'
    ) THEN
        CREATE POLICY "Anyone can view active shared links"
          ON shared_links
          FOR SELECT
          USING (is_active = true);
    END IF;
END $$;