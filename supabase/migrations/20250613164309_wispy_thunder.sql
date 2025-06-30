/*
  # Fix currency conversion function type mismatch

  1. Database Function Updates
    - Drop and recreate `get_user_items_for_conversion` function with correct return types
    - Ensure price column is returned as numeric instead of integer
    - Fix any other type mismatches in the function definition

  2. Function Improvements
    - Properly cast price values to numeric type
    - Ensure consistent data types across all returned columns
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_user_items_for_conversion(uuid);

-- Recreate the function with correct return types
CREATE OR REPLACE FUNCTION get_user_items_for_conversion(p_user_id uuid)
RETURNS TABLE (
  item_id uuid,
  item_name text,
  current_price numeric,
  price_currency text,
  list_name text,
  quantity integer,
  quantity_unit text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    li.id as item_id,
    li.name as item_name,
    li.price::numeric as current_price,
    COALESCE(li.price_currency, 'USD') as price_currency,
    sl.name as list_name,
    COALESCE(li.quantity, 1) as quantity,
    COALESCE(li.quantity_unit, 'units') as quantity_unit
  FROM list_items li
  JOIN shopping_lists sl ON li.list_id = sl.id
  WHERE sl.user_id = p_user_id
    AND li.price IS NOT NULL
    AND li.price > 0;
END;
$$;

-- Also ensure the update function exists and has correct parameter types
CREATE OR REPLACE FUNCTION update_user_item_currencies(
  p_user_id uuid,
  p_old_currency text,
  p_new_currency text,
  p_exchange_rate numeric
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  -- Update all items for the user that have the old currency
  UPDATE list_items 
  SET 
    price = (price * p_exchange_rate)::numeric(10,2),
    price_currency = p_new_currency,
    updated_at = now()
  FROM shopping_lists sl
  WHERE list_items.list_id = sl.id
    AND sl.user_id = p_user_id
    AND list_items.price IS NOT NULL
    AND COALESCE(list_items.price_currency, 'USD') = p_old_currency;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log the conversion
  INSERT INTO conversion_log (
    user_id,
    old_currency,
    new_currency,
    exchange_rate,
    items_updated
  ) VALUES (
    p_user_id,
    p_old_currency,
    p_new_currency,
    p_exchange_rate,
    updated_count
  );
  
  RETURN updated_count;
END;
$$;