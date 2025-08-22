# Fix Missing tax_amount Column Error

## Problem
The application is trying to use `tax_amount` columns in the database tables (`quotation_items`, `invoice_items`, etc.) but these columns don't exist in the current database schema.

## Solution
Apply the migration to add the missing tax-related columns to the database.

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `apply_tax_migration.sql` 
4. Run the query

### Option 2: Using Supabase CLI (if available)
If you have Docker and Supabase CLI set up locally:
```bash
cd supabase
npx supabase db reset
```

### Option 3: Manual SQL Execution
Execute the following SQL commands in your Supabase SQL editor:

```sql
-- Add tax columns to quotation_items
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Add tax columns to invoice_items
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Update existing records
UPDATE quotation_items 
SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false 
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

UPDATE invoice_items 
SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false 
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;
```

## Files Created
- `apply_tax_migration.sql` - Complete migration script with safety checks
- `supabase/migrations/20241221000000_fix_tax_columns.sql` - New migration file
- This instruction file

## What This Migration Does
Adds the following columns to line item tables:
- `tax_percentage` (DECIMAL): The tax rate percentage (e.g., 16 for 16%)
- `tax_amount` (DECIMAL): The calculated tax amount in currency
- `tax_inclusive` (BOOLEAN): Whether tax is included in the unit price

## After Migration
Once applied, the quotation and invoice creation should work without the "tax_amount column not found" error.

## Verification
After running the migration, you can verify it worked by checking if the columns exist:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('quotation_items', 'invoice_items') 
AND column_name IN ('tax_percentage', 'tax_amount', 'tax_inclusive')
ORDER BY table_name, column_name;
```
