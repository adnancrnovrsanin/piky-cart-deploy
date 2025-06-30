/*
  # Add quantity_unit column to list_items table

  1. New Column
    - `quantity_unit` (text) - Stores the unit type for quantities (kg, g, lb, oz, l, ml, units, packs, etc.)
    - Default value: 'units' for backward compatibility

  2. Index
    - Add index for quantity_unit for efficient filtering

  3. Data Migration
    - Set default quantity_unit to 'units' for existing items
*/

-- Add quantity_unit column to list_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'list_items' AND column_name = 'quantity_unit'
  ) THEN
    ALTER TABLE list_items ADD COLUMN quantity_unit text DEFAULT 'units';
  END IF;
END $$;

-- Update existing items to have 'units' as default quantity_unit
UPDATE list_items 
SET quantity_unit = 'units' 
WHERE quantity_unit IS NULL;

-- Make quantity_unit NOT NULL with default
ALTER TABLE list_items ALTER COLUMN quantity_unit SET NOT NULL;
ALTER TABLE list_items ALTER COLUMN quantity_unit SET DEFAULT 'units';

-- Add index for quantity_unit searches
CREATE INDEX IF NOT EXISTS idx_list_items_quantity_unit ON list_items(quantity_unit);

-- Add composite index for category and quantity_unit (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_list_items_category_quantity_unit ON list_items(category, quantity_unit);