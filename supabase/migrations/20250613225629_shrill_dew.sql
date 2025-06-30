/*
  # Clean up currency conversion functions

  1. Database Cleanup
    - Drop any existing currency conversion functions
    - Drop conversion_log table if it exists
    - Clean up any related database objects

  2. Notes
    - Uses IF EXISTS to avoid errors if objects don't exist
    - Removes REVOKE statements since functions may not exist
*/

-- Drop existing functions to avoid conflicts (using IF EXISTS to prevent errors)
DROP FUNCTION IF EXISTS get_user_items_for_conversion(uuid);
DROP FUNCTION IF EXISTS update_user_item_currencies(uuid, text, text, numeric);
DROP FUNCTION IF EXISTS batch_convert_item_currencies(jsonb);
DROP FUNCTION IF EXISTS is_valid_currency_code(text);
DROP FUNCTION IF EXISTS get_user_currency_stats(uuid);

-- Drop the conversion log table and its dependencies
DROP TABLE IF EXISTS conversion_log CASCADE;

-- Note: Removed REVOKE statements since the functions don't exist
-- The DROP FUNCTION IF EXISTS statements above handle cleanup safely