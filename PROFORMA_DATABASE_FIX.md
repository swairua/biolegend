# Proforma Functionality Database Fix

## Issue
The proforma creation was failing with "[object Object]" error due to:
1. Missing `generate_proforma_number` database function
2. Missing tax-related fields in various item tables
3. Incorrect table usage in the proforma creation code

## Fixed in Code
✅ Updated CreateProformaModal to use correct `proforma_invoices` table
✅ Added proper error handling to show meaningful error messages
✅ Created `useCreateProformaWithItems` hook for proper proforma creation
✅ Added fallback number generation for proforma invoices

## Database Changes Required

Please run these SQL commands in your Supabase SQL editor to complete the fix:

```sql
-- Add missing tax fields to quotation_items table
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Add missing tax fields to proforma_items table  
ALTER TABLE proforma_items ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE proforma_items ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE proforma_items ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Add missing tax fields to invoice_items table
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Create function to generate proforma numbers
CREATE OR REPLACE FUNCTION generate_proforma_number(company_uuid UUID)
RETURNS VARCHAR AS $$
DECLARE
    next_number INTEGER;
    year_part VARCHAR(4);
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(proforma_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM proforma_invoices 
    WHERE company_id = company_uuid 
    AND proforma_number LIKE 'PF-' || year_part || '-%';
    
    RETURN 'PF-' || year_part || '-' || LPAD(next_number::VARCHAR, 3, '0');
END;
$$ LANGUAGE plpgsql;
```

## How to Apply

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the SQL commands above
5. Run the query

## After Applying

The proforma creation should work correctly with:
- ✅ Proper error messages instead of "[object Object]"
- ✅ Correct table usage (proforma_invoices instead of quotations)
- ✅ Automatic proforma number generation (PF-YYYY-XXX format)
- ✅ Tax calculation support (once database is updated)

## Verification

To verify the fix worked:
1. Try creating a new proforma invoice
2. Check that it appears in the proforma list
3. Verify the proforma number follows PF-YYYY-XXX format
4. Confirm no "[object Object]" errors appear
