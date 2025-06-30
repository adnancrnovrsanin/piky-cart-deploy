/*
  # Backfill List Owners as Collaborators
  
  This migration adds all existing list owners as collaborators in the list_collaborators
  table with the 'owner' role. This ensures that list creators have proper access
  to view and manage collaborators for lists created before the collaboration system
  was implemented.
  
  The migration:
  1. Inserts list owners from shopping_lists.user_id into list_collaborators
  2. Sets their role as 'owner'
  3. Uses ON CONFLICT DO NOTHING to avoid duplicates for lists that already
     have the owner as a collaborator
*/

-- Insert all list owners as collaborators with 'owner' role
INSERT INTO list_collaborators (user_id, list_id, role, created_at, updated_at)
SELECT
  sl.user_id as user_id,
  sl.id as list_id,
  'owner' as role,
  sl.created_at,
  now() as updated_at
FROM shopping_lists sl
WHERE sl.user_id IS NOT NULL
ON CONFLICT (user_id, list_id) DO NOTHING;

-- Update the count of affected rows for logging
-- This will help track how many owners were backfilled
DO $$
DECLARE
  affected_count integer;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled % list owners as collaborators', affected_count;
END $$;