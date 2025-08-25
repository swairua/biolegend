# Fix for Invoice Creation Error: Missing cost_per_unit Column

## Problem Identified
The invoice creation is failing with the error:
```
Failed to create invoice: Could not find the 'cost_per_unit' column of 'stock_movements' in the schema cache
```

## Root Cause
There's a **column name mismatch** between the database schema and application code:
- **Database schema** defines the column as `unit_cost`
- **Application code** tries to insert using `cost_per_unit`

## Solution Applied
Created a SQL migration that:
1. ✅ Adds the missing `cost_per_unit` column
2. ✅ Copies existing `unit_cost` data for backward compatibility
3. ✅ Creates a trigger to keep both columns synchronized
4. ✅ Maintains both old and new column names

## Files Created
- `FIX_STOCK_MOVEMENTS_COST_PER_UNIT.sql` - Complete migration script
- This instruction file

## Manual Execution Required

⚠️ **IMPORTANT**: Due to database permissions, you need to manually execute the migration.

### Option 1: Run SQL Migration File
Execute the complete SQL file:
```sql
-- Run this file in your Supabase SQL Editor or database client
\i FIX_STOCK_MOVEMENTS_COST_PER_UNIT.sql
```

### Option 2: Run Individual Commands
Copy and paste these commands in your Supabase SQL Editor:

```sql
-- 1. Add the missing cost_per_unit column
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS cost_per_unit DECIMAL(15,2);

-- 2. Copy existing unit_cost data to cost_per_unit
UPDATE stock_movements 
SET cost_per_unit = unit_cost 
WHERE unit_cost IS NOT NULL AND cost_per_unit IS NULL;

-- 3. Create sync function
CREATE OR REPLACE FUNCTION sync_stock_movement_costs()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cost_per_unit IS DISTINCT FROM OLD.cost_per_unit THEN
        NEW.unit_cost := NEW.cost_per_unit;
    END IF;
    
    IF NEW.unit_cost IS DISTINCT FROM OLD.unit_cost THEN
        NEW.cost_per_unit := NEW.unit_cost;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
DROP TRIGGER IF EXISTS trigger_sync_stock_movement_costs ON stock_movements;
CREATE TRIGGER trigger_sync_stock_movement_costs
    BEFORE INSERT OR UPDATE ON stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION sync_stock_movement_costs();
```

## Verification
After running the migration, verify the fix with:
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'stock_movements' 
  AND column_name IN ('unit_cost', 'cost_per_unit')
ORDER BY column_name;
```

Expected result: Both `cost_per_unit` and `unit_cost` columns should exist.

## What This Fixes
- ✅ Invoice creation will work without column errors
- ✅ Stock movement tracking during invoice creation
- ✅ Inventory updates when invoices are created
- ✅ Backward compatibility with existing code
- ✅ Future-proofing for both column naming conventions

## Next Steps After Migration
1. Execute the SQL migration
2. Test invoice creation to confirm the fix
3. Monitor for any additional schema-related errors

## Technical Details
The application code in these files uses `cost_per_unit`:
- `src/hooks/useQuotationItems.ts` (multiple locations)
- `src/components/inventory/RestockItemModal.tsx`
- `src/hooks/useDatabase.ts` (type definitions)

The database schema was defined with `unit_cost` in:
- `supabase/migrations/20250121000000_create_stock_movements_table.sql`
- `ADD_MISSING_PRODUCT_COLUMNS.sql`
- `database-schema.sql`

This migration bridges the gap between both naming conventions.
