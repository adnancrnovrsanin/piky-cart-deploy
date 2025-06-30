/*
  # Add brand property to list items

  1. Schema Changes
    - Add `brand` column to `list_items` table
    - Add index for brand searches
    
  2. Notes
    - Brand is optional (nullable)
    - Will be used for AI optimization and manual entry
    - Users can lock brand during optimization
*/

-- Add brand column to list_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'list_items' AND column_name = 'brand'
  ) THEN
    ALTER TABLE list_items ADD COLUMN brand text;
  END IF;
END $$;

-- Add index for brand searches
CREATE INDEX IF NOT EXISTS idx_list_items_brand ON list_items(brand);

-- Add composite index for brand and category (useful for optimization queries)
CREATE INDEX IF NOT EXISTS idx_list_items_brand_category ON list_items(brand, category);