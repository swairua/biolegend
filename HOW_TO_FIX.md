# 🚨 URGENT: Fix Missing tax_amount Column

## The Problem
You're getting: `could not find the tax_amount column of quotation_items in the schema cache`

## The Solution (2 minutes to fix)

### STEP 1: Go to Supabase Dashboard
1. Open your **Supabase Dashboard** 
2. Navigate to **SQL Editor**

### STEP 2: Run This SQL (Copy & Paste)

```sql
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0;  
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
```

### STEP 3: Click "Run"
The SQL will execute and add the missing columns.

## Files Available
- `SIMPLE_FIX.sql` - The 6-line fix above
- `URGENT_DATABASE_FIX.sql` - Comprehensive version with checks

## After Running SQL
- ✅ Quotation creation will work
- ✅ Tax calculations will work properly  
- ✅ No more "column not found" errors

## Verification
After running the SQL, you can verify with:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'quotation_items' 
AND column_name LIKE 'tax%';
```

This should show: `tax_amount`, `tax_percentage`, `tax_inclusive`

---
**This is the definitive fix. The auto-migration approach didn't work, so manual SQL execution is required.**
