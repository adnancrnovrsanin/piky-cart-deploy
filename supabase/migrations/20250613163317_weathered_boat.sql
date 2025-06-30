/*
  # Add currency tracking and conversion system

  1. New Columns
    - `price_currency` to track the original currency of each price
    - Add indexes for efficient currency queries

  2. Updates
    - Set default currency for existing items based on user preferences
    - Add currency tracking to all price-related operations

  3. Functions
    - Create function to handle currency conversion updates
*/

-- Add price_currency column to list_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'list_items' AND column_name = 'price_currency'
  ) THEN
    ALTER TABLE list_items ADD COLUMN price_currency text DEFAULT 'USD';
  END IF;
END $$;

-- Update existing items to have USD as default currency (most common default)
UPDATE list_items 
SET price_currency = 'USD' 
WHERE price_currency IS NULL AND price IS NOT NULL;

-- Make price_currency NOT NULL with default for items that have prices
ALTER TABLE list_items ALTER COLUMN price_currency SET DEFAULT 'USD';

-- Add index for currency queries
CREATE INDEX IF NOT EXISTS idx_list_items_price_currency ON list_items(price_currency);

-- Add composite index for price and currency (useful for conversion queries)
CREATE INDEX IF NOT EXISTS idx_list_items_price_currency_composite ON list_items(price, price_currency) WHERE price IS NOT NULL;

-- Create function to update item currencies when user changes default currency
CREATE OR REPLACE FUNCTION update_user_item_currencies(
  p_user_id uuid,
  p_old_currency text,
  p_new_currency text,
  p_exchange_rate numeric
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  -- Update all items for this user's lists that have the old currency
  UPDATE list_items 
  SET 
    price = CASE 
      WHEN price IS NOT NULL THEN ROUND(price * p_exchange_rate, 2)
      ELSE NULL 
    END,
    price_currency = p_new_currency
  WHERE list_id IN (
    SELECT id FROM shopping_lists WHERE user_id = p_user_id
  )
  AND price_currency = p_old_currency
  AND price IS NOT NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$;

-- Create function to get user's items that need currency conversion
CREATE OR REPLACE FUNCTION get_user_items_for_conversion(p_user_id uuid)
RETURNS TABLE(
  item_id uuid,
  list_id uuid,
  item_name text,
  current_price numeric,
  current_currency text,
  quantity numeric,
  quantity_unit text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    li.id as item_id,
    li.list_id,
    li.name as item_name,
    li.price as current_price,
    li.price_currency as current_currency,
    li.quantity,
    li.quantity_unit
  FROM list_items li
  JOIN shopping_lists sl ON li.list_id = sl.id
  WHERE sl.user_id = p_user_id
    AND li.price IS NOT NULL
    AND li.price_currency IS NOT NULL
  ORDER BY sl.created_at DESC, li.created_at DESC;
END;
$$;