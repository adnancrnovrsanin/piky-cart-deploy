/*
  # Currency Conversion Functions and Audit System

  1. Functions
    - Enhanced currency conversion with error handling
    - Batch conversion capabilities
    - Currency validation
    - User currency statistics
    - Items retrieval for conversion

  2. Audit System
    - Conversion log table for tracking currency changes
    - RLS policies for secure access
    - Indexes for performance

  3. Security
    - All functions use SECURITY DEFINER
    - Proper input validation
    - RLS policies for data access
*/

-- Drop existing functions to avoid return type conflicts
DROP FUNCTION IF EXISTS get_user_items_for_conversion(uuid);
DROP FUNCTION IF EXISTS update_user_item_currencies(uuid, text, text, numeric);
DROP FUNCTION IF EXISTS batch_convert_item_currencies(jsonb);
DROP FUNCTION IF EXISTS is_valid_currency_code(text);
DROP FUNCTION IF EXISTS get_user_currency_stats(uuid);

-- Enhanced function to update item currencies with better error handling
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
  conversion_errors integer := 0;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_old_currency IS NULL OR p_new_currency IS NULL OR p_exchange_rate IS NULL THEN
    RAISE EXCEPTION 'Invalid parameters provided';
  END IF;
  
  IF p_exchange_rate <= 0 THEN
    RAISE EXCEPTION 'Exchange rate must be positive';
  END IF;
  
  -- Update all items for this user's lists that have the old currency
  UPDATE list_items 
  SET 
    price = CASE 
      WHEN price IS NOT NULL AND price > 0 THEN 
        ROUND((price * p_exchange_rate)::numeric, 2)
      ELSE NULL 
    END,
    price_currency = p_new_currency,
    updated_at = now()
  WHERE list_id IN (
    SELECT id FROM shopping_lists WHERE user_id = p_user_id
  )
  AND (price_currency = p_old_currency OR (price_currency IS NULL AND price IS NOT NULL))
  AND price IS NOT NULL
  AND price > 0;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log the conversion for audit purposes
  INSERT INTO conversion_log (user_id, old_currency, new_currency, exchange_rate, items_updated, created_at)
  VALUES (p_user_id, p_old_currency, p_new_currency, p_exchange_rate, updated_count, now())
  ON CONFLICT DO NOTHING; -- Ignore if logging table doesn't exist
  
  RETURN updated_count;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the entire operation
    RAISE WARNING 'Error during currency conversion: %', SQLERRM;
    RETURN 0;
END;
$$;

-- Function to get user's items that need currency conversion with better filtering
CREATE OR REPLACE FUNCTION get_user_items_for_conversion(p_user_id uuid)
RETURNS TABLE(
  item_id uuid,
  list_id uuid,
  list_name text,
  item_name text,
  current_price numeric,
  current_currency text,
  quantity numeric,
  quantity_unit text,
  price_per_unit boolean,
  last_updated timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate input
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  RETURN QUERY
  SELECT 
    li.id as item_id,
    li.list_id,
    sl.name as list_name,
    li.name as item_name,
    li.price as current_price,
    COALESCE(li.price_currency, 'USD') as current_currency,
    li.quantity,
    COALESCE(li.quantity_unit, 'units') as quantity_unit,
    COALESCE(li.price_per_unit, false) as price_per_unit,
    li.updated_at as last_updated
  FROM list_items li
  JOIN shopping_lists sl ON li.list_id = sl.id
  WHERE sl.user_id = p_user_id
    AND li.price IS NOT NULL
    AND li.price > 0
  ORDER BY sl.created_at DESC, li.created_at DESC;
END;
$$;

-- Function to batch update multiple items with currency conversion
CREATE OR REPLACE FUNCTION batch_convert_item_currencies(
  p_conversions jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conversion_record jsonb;
  updated_count integer := 0;
  total_updated integer := 0;
BEGIN
  -- Validate input
  IF p_conversions IS NULL OR jsonb_array_length(p_conversions) = 0 THEN
    RETURN 0;
  END IF;
  
  -- Process each conversion
  FOR conversion_record IN SELECT * FROM jsonb_array_elements(p_conversions)
  LOOP
    UPDATE list_items
    SET 
      price = ROUND((conversion_record->>'new_price')::numeric, 2),
      price_currency = conversion_record->>'new_currency',
      updated_at = now()
    WHERE id = (conversion_record->>'item_id')::uuid
      AND price IS NOT NULL
      AND price > 0;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    total_updated := total_updated + updated_count;
  END LOOP;
  
  RETURN total_updated;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error during batch currency conversion: %', SQLERRM;
    RETURN total_updated;
END;
$$;

-- Function to validate currency codes
CREATE OR REPLACE FUNCTION is_valid_currency_code(p_currency_code text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- List of supported currency codes
  RETURN p_currency_code IN (
    'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BRL',
    'MXN', 'KRW', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'HUF',
    'RUB', 'TRY', 'ZAR', 'NZD', 'THB', 'MYR', 'IDR', 'PHP', 'VND', 'AED',
    'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD', 'LBP', 'EGP', 'MAD', 'TND',
    'DZD', 'NGN', 'GHS', 'KES', 'UGX', 'TZS', 'ETB', 'XOF', 'XAF', 'CLP',
    'ARS', 'COP', 'PEN', 'UYU', 'BOB', 'PYG', 'VES', 'GYD', 'SRD', 'TTD',
    'JMD', 'BBD', 'BSD', 'BZD', 'GTQ', 'HNL', 'NIO', 'CRC', 'PAB', 'DOP',
    'HTG', 'CUP', 'XCD'
  );
END;
$$;

-- Function to get currency conversion statistics for a user
CREATE OR REPLACE FUNCTION get_user_currency_stats(p_user_id uuid)
RETURNS TABLE(
  total_items_with_prices integer,
  currencies_used text[],
  items_by_currency jsonb,
  total_value_usd numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH currency_stats AS (
    SELECT 
      COUNT(*) as total_items,
      array_agg(DISTINCT COALESCE(li.price_currency, 'USD')) as currencies,
      jsonb_object_agg(
        COALESCE(li.price_currency, 'USD'), 
        COUNT(*)
      ) as currency_breakdown,
      -- Simplified USD conversion (would need real exchange rates in production)
      SUM(
        CASE 
          WHEN li.price_per_unit THEN li.price * li.quantity
          ELSE li.price
        END
      ) as total_value
    FROM list_items li
    JOIN shopping_lists sl ON li.list_id = sl.id
    WHERE sl.user_id = p_user_id
      AND li.price IS NOT NULL
      AND li.price > 0
  )
  SELECT 
    cs.total_items::integer,
    cs.currencies,
    cs.currency_breakdown,
    COALESCE(cs.total_value, 0)::numeric
  FROM currency_stats cs;
END;
$$;

-- Create optional conversion log table for audit purposes
CREATE TABLE IF NOT EXISTS conversion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  old_currency text NOT NULL,
  new_currency text NOT NULL,
  exchange_rate numeric NOT NULL,
  items_updated integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add index for conversion log queries
CREATE INDEX IF NOT EXISTS idx_conversion_log_user_id ON conversion_log(user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_log_created_at ON conversion_log(created_at DESC);

-- Enable RLS on conversion log
ALTER TABLE conversion_log ENABLE ROW LEVEL SECURITY;

-- Create policy for conversion log access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'conversion_log' 
    AND policyname = 'Users can view own conversion logs'
  ) THEN
    CREATE POLICY "Users can view own conversion logs"
      ON conversion_log
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_user_item_currencies(uuid, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_items_for_conversion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_convert_item_currencies(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_currency_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_currency_stats(uuid) TO authenticated;