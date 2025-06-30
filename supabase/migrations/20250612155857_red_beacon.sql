/*
  # Add price column to list_items

  1. Changes
    - Add price column to list_items table for manual price entry and optimization results
  
  2. Features
    - Optional price field for items
    - Supports both manual entry and optimization results
*/

-- Add price column to list_items table
ALTER TABLE list_items
ADD COLUMN IF NOT EXISTS price decimal(10,2);

-- Add index for price queries
CREATE INDEX IF NOT EXISTS idx_list_items_price ON list_items(price);