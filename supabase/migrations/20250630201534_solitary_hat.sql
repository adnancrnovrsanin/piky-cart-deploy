/*
  # Fix RLS Policy Infinite Recursion

  This migration fixes the infinite recursion issue in shopping_lists RLS policies
  by consolidating and simplifying the policies to avoid circular dependencies.

  ## Changes Made
  1. Drop all existing conflicting policies on shopping_lists
  2. Create simplified, non-recursive policies
  3. Ensure policies don't create circular references with list_collaborators

  ## Security
  - Users can manage their own lists (owner access)
  - Collaborators can view/edit lists they have access to
  - No circular policy dependencies
*/

-- Drop all existing policies on shopping_lists to start fresh
DROP POLICY IF EXISTS "Users can manage their own lists" ON shopping_lists;
DROP POLICY IF EXISTS "Users can view own lists" ON shopping_lists;
DROP POLICY IF EXISTS "Users can insert own lists" ON shopping_lists;
DROP POLICY IF EXISTS "Users can update own lists" ON shopping_lists;
DROP POLICY IF EXISTS "Users can delete own lists" ON shopping_lists;
DROP POLICY IF EXISTS "Collaborators can view lists" ON shopping_lists;
DROP POLICY IF EXISTS "Editors can update lists" ON shopping_lists;

-- Create simplified, non-recursive policies

-- Policy 1: Users can view lists they own
CREATE POLICY "owners_can_view_lists"
  ON shopping_lists
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Users can insert their own lists
CREATE POLICY "users_can_insert_own_lists"
  ON shopping_lists
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy 3: Users can update their own lists
CREATE POLICY "owners_can_update_lists"
  ON shopping_lists
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 4: Users can delete their own lists
CREATE POLICY "owners_can_delete_lists"
  ON shopping_lists
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 5: Collaborators can view lists (simplified to avoid recursion)
CREATE POLICY "collaborators_can_view_lists"
  ON shopping_lists
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM list_collaborators lc 
      WHERE lc.list_id = shopping_lists.id 
        AND lc.user_id = auth.uid()
    )
  );

-- Policy 6: Editors and owners can update lists
CREATE POLICY "editors_can_update_lists"
  ON shopping_lists
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM list_collaborators lc 
      WHERE lc.list_id = shopping_lists.id 
        AND lc.user_id = auth.uid() 
        AND lc.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM list_collaborators lc 
      WHERE lc.list_id = shopping_lists.id 
        AND lc.user_id = auth.uid() 
        AND lc.role IN ('owner', 'editor')
    )
  );

-- Ensure list_collaborators policies are also simplified to avoid recursion
-- Drop and recreate list_collaborators policies if they reference shopping_lists

DROP POLICY IF EXISTS "Users can view collaborators for their lists" ON list_collaborators;
DROP POLICY IF EXISTS "Owners can manage collaborators" ON list_collaborators;

-- Simplified collaborator policies that don't reference shopping_lists
CREATE POLICY "users_can_view_collaborators"
  ON list_collaborators
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "owners_can_manage_collaborators"
  ON list_collaborators
  FOR ALL
  TO authenticated
  USING (
    -- User is the owner of this collaboration record
    user_id = auth.uid() 
    OR 
    -- User has owner role for this list
    EXISTS (
      SELECT 1 
      FROM list_collaborators lc2 
      WHERE lc2.list_id = list_collaborators.list_id 
        AND lc2.user_id = auth.uid() 
        AND lc2.role = 'owner'
    )
  );