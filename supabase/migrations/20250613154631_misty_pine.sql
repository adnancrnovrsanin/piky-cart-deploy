/*
  # Add price_per_unit column to list_items table

  1. New Column
    - `price_per_unit` (boolean, default false)
      - Indicates whether the price is per unit/quantity or total price
      - false = total price for the entire quantity
      - true = price per unit (e.g., $2 per kg, $1 per pack)

  2. Index
    - Add index for price_per_unit for efficient queries

  3. Backward Compatibility
    - Default to false (total price) for existing items
    - Maintains existing pricing behavior
*/

-- Add price_per_unit column to list_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'list_items' AND column_name = 'price_per_unit'
  ) THEN
    ALTER TABLE list_items ADD COLUMN price_per_unit boolean DEFAULT false;
  END IF;
END $$;

-- Update existing items to have false as default (total price)
UPDATE list_items 
SET price_per_unit = false 
WHERE price_per_unit IS NULL;

-- Make price_per_unit NOT NULL with default
ALTER TABLE list_items ALTER COLUMN price_per_unit SET NOT NULL;
ALTER TABLE list_items ALTER COLUMN price_per_unit SET DEFAULT false;

-- Add index for price_per_unit queries
CREATE INDEX IF NOT EXISTS idx_list_items_price_per_unit ON list_items(price_per_unit);