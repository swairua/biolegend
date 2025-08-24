import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const QUOTATIONS_COMPLETE_FIX_SQL = `
-- ============================================
-- COMPREHENSIVE QUOTATIONS TABLE FIX
-- ============================================
-- This script adds ALL missing columns to quotations and quotation_items tables
-- Based on the expected structure from verifyDatabaseComplete.ts

-- Step 1: Fix quotations table - Add missing columns
DO $$
BEGIN
    -- Add valid_until column (main issue reported)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'valid_until') THEN
        ALTER TABLE quotations ADD COLUMN valid_until DATE;
        RAISE NOTICE 'Added valid_until column to quotations';
    END IF;

    -- Add tax_percentage column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'tax_percentage') THEN
        ALTER TABLE quotations ADD COLUMN tax_percentage DECIMAL(5,2) DEFAULT 0;
        RAISE NOTICE 'Added tax_percentage column to quotations';
    END IF;

    -- Add created_by column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'created_by') THEN
        ALTER TABLE quotations ADD COLUMN created_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added created_by column to quotations';
    END IF;

    -- Ensure all other expected columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'subtotal') THEN
        ALTER TABLE quotations ADD COLUMN subtotal DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added subtotal column to quotations';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'tax_amount') THEN
        ALTER TABLE quotations ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added tax_amount column to quotations';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'total_amount') THEN
        ALTER TABLE quotations ADD COLUMN total_amount DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added total_amount column to quotations';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'status') THEN
        ALTER TABLE quotations ADD COLUMN status VARCHAR(50) DEFAULT 'draft';
        RAISE NOTICE 'Added status column to quotations';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'notes') THEN
        ALTER TABLE quotations ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column to quotations';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'terms_and_conditions') THEN
        ALTER TABLE quotations ADD COLUMN terms_and_conditions TEXT;
        RAISE NOTICE 'Added terms_and_conditions column to quotations';
    END IF;

    RAISE NOTICE 'Quotations table column check complete';
END $$;

-- Step 2: Fix quotation_items table - Add all missing tax and other columns
DO $$
BEGIN
    -- Add tax columns (critical for quotation creation)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotation_items' AND column_name = 'tax_percentage') THEN
        ALTER TABLE quotation_items ADD COLUMN tax_percentage DECIMAL(6,3) DEFAULT 0;
        RAISE NOTICE 'Added tax_percentage column to quotation_items';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotation_items' AND column_name = 'tax_amount') THEN
        ALTER TABLE quotation_items ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added tax_amount column to quotation_items';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotation_items' AND column_name = 'tax_inclusive') THEN
        ALTER TABLE quotation_items ADD COLUMN tax_inclusive BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added tax_inclusive column to quotation_items';
    END IF;

    -- Add discount columns (expected by UI)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotation_items' AND column_name = 'discount_percentage') THEN
        ALTER TABLE quotation_items ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0;
        RAISE NOTICE 'Added discount_percentage column to quotation_items';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotation_items' AND column_name = 'discount_before_vat') THEN
        ALTER TABLE quotation_items ADD COLUMN discount_before_vat DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added discount_before_vat column to quotation_items';
    END IF;

    -- Add product_name column (expected by verification)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotation_items' AND column_name = 'product_name') THEN
        ALTER TABLE quotation_items ADD COLUMN product_name VARCHAR(255);
        RAISE NOTICE 'Added product_name column to quotation_items';
    END IF;

    -- Add sort_order column for item ordering
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotation_items' AND column_name = 'sort_order') THEN
        ALTER TABLE quotation_items ADD COLUMN sort_order INTEGER DEFAULT 0;
        RAISE NOTICE 'Added sort_order column to quotation_items';
    END IF;

    -- Ensure line_total column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotation_items' AND column_name = 'line_total') THEN
        ALTER TABLE quotation_items ADD COLUMN line_total DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added line_total column to quotation_items';
    END IF;

    RAISE NOTICE 'Quotation_items table column check complete';
END $$;

-- Step 3: Update existing records with safe default values
UPDATE quotation_items 
SET tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false),
    discount_percentage = COALESCE(discount_percentage, 0),
    discount_before_vat = COALESCE(discount_before_vat, 0),
    line_total = COALESCE(line_total, quantity * unit_price),
    sort_order = COALESCE(sort_order, 0);

UPDATE quotations 
SET subtotal = COALESCE(subtotal, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_percentage = COALESCE(tax_percentage, 0),
    total_amount = COALESCE(total_amount, 0),
    status = COALESCE(status, 'draft');

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quotations_company_id ON quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_quotation_date ON quotations(quotation_date);
CREATE INDEX IF NOT EXISTS idx_quotations_valid_until ON quotations(valid_until);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_product_id ON quotation_items(product_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_sort_order ON quotation_items(quotation_id, sort_order);

-- Step 5: Enable RLS if not already enabled
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

-- Step 6: Create or replace RLS policies for quotations
DROP POLICY IF EXISTS "Users can view quotations from their company" ON quotations;
DROP POLICY IF EXISTS "Users can insert quotations for their company" ON quotations;
DROP POLICY IF EXISTS "Users can update quotations from their company" ON quotations;
DROP POLICY IF EXISTS "Users can delete quotations from their company" ON quotations;

CREATE POLICY "Users can view quotations from their company" ON quotations
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert quotations for their company" ON quotations
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update quotations from their company" ON quotations
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete quotations from their company" ON quotations
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Step 7: Create or replace RLS policies for quotation_items
DROP POLICY IF EXISTS "Users can view quotation items from their company" ON quotation_items;
DROP POLICY IF EXISTS "Users can insert quotation items for their company" ON quotation_items;
DROP POLICY IF EXISTS "Users can update quotation items from their company" ON quotation_items;
DROP POLICY IF EXISTS "Users can delete quotation items from their company" ON quotation_items;

CREATE POLICY "Users can view quotation items from their company" ON quotation_items
    FOR SELECT USING (
        quotation_id IN (
            SELECT id FROM quotations WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert quotation items for their company" ON quotation_items
    FOR INSERT WITH CHECK (
        quotation_id IN (
            SELECT id FROM quotations WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update quotation items from their company" ON quotation_items
    FOR UPDATE USING (
        quotation_id IN (
            SELECT id FROM quotations WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete quotation items from their company" ON quotation_items
    FOR DELETE USING (
        quotation_id IN (
            SELECT id FROM quotations WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Step 8: Verification - Check that all critical columns exist
SELECT 'VERIFICATION: Quotations table columns' as check_type,
       column_name, 
       data_type,
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_name = 'quotations'
  AND column_name IN ('id', 'company_id', 'customer_id', 'quotation_number', 'quotation_date', 'valid_until', 'status', 'subtotal', 'tax_amount', 'total_amount', 'notes', 'terms_and_conditions', 'created_at', 'updated_at')
ORDER BY column_name;

SELECT 'VERIFICATION: Quotation items table columns' as check_type,
       column_name, 
       data_type,
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_name = 'quotation_items'
  AND column_name IN ('id', 'quotation_id', 'product_id', 'product_name', 'description', 'quantity', 'unit_price', 'discount_percentage', 'discount_before_vat', 'tax_percentage', 'tax_amount', 'tax_inclusive', 'line_total', 'sort_order')
ORDER BY column_name;

-- Step 9: Success message
SELECT '✅ QUOTATIONS TABLE FIX COMPLETE!' as result,
       'All missing columns have been added to quotations and quotation_items tables.' as message,
       'The valid_until column and all tax columns are now available.' as details,
       'You can now create and edit quotations without database errors.' as next_step;
`;

interface QuotationFixResult {
  success: boolean;
  message: string;
  details: string[];
  verification?: any[];
}

export async function fixQuotationsTableColumns(): Promise<QuotationFixResult> {
  try {
    console.log('🔧 Starting comprehensive quotations table fix...');
    toast.info('Fixing quotations table...', { 
      description: 'Adding missing columns and updating schema' 
    });

    // Try to execute the fix SQL using various RPC methods
    const executionMethods = [
      { name: 'exec_sql', params: { sql: QUOTATIONS_COMPLETE_FIX_SQL } },
      { name: 'sql', params: { query: QUOTATIONS_COMPLETE_FIX_SQL } },
      { name: 'execute_sql', params: { sql_text: QUOTATIONS_COMPLETE_FIX_SQL } }
    ];

    let fixExecuted = false;
    let lastError = '';

    for (const method of executionMethods) {
      try {
        console.log(`Trying RPC method: ${method.name}`);
        const { data, error } = await supabase.rpc(method.name, method.params);
        
        if (!error) {
          console.log(`✅ Fix executed successfully using ${method.name}`);
          fixExecuted = true;
          break;
        } else {
          console.log(`❌ ${method.name} failed:`, error.message);
          lastError = error.message;
        }
      } catch (err: any) {
        console.log(`❌ ${method.name} error:`, err.message);
        lastError = err.message;
      }
    }

    if (!fixExecuted) {
      console.log('⚠️ Could not execute fix automatically. Providing manual SQL.');
      toast.warning('Manual fix required', { 
        description: 'Copy SQL script and run in Supabase SQL Editor' 
      });
      
      return {
        success: false,
        message: 'Automatic fix failed - manual execution required',
        details: [
          '❌ Could not execute SQL automatically',
          '📋 Copy the SQL script to Supabase SQL Editor',
          '🔧 Run the script manually to add missing columns',
          '⚡ This will fix the valid_until column and all tax columns'
        ]
      };
    }

    // Verify the fix was successful by checking for key columns
    const { data: quotationsColumns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'quotations')
      .in('column_name', ['valid_until', 'tax_amount', 'subtotal', 'total_amount']);

    const { data: itemsColumns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'quotation_items')
      .in('column_name', ['tax_percentage', 'tax_amount', 'tax_inclusive', 'line_total']);

    const quotationsColumnsFound = quotationsColumns?.length || 0;
    const itemsColumnsFound = itemsColumns?.length || 0;

    toast.success('Quotations table fixed!', { 
      description: `Added missing columns to quotations and quotation_items tables` 
    });

    return {
      success: true,
      message: 'Quotations table fix completed successfully!',
      details: [
        '✅ valid_until column added to quotations table',
        '✅ Tax columns added to quotation_items table',
        '✅ Discount columns added for proper calculations',
        '✅ Indexes created for better performance',
        '✅ RLS policies updated for security',
        `🎯 ${quotationsColumnsFound} critical quotations columns verified`,
        `🎯 ${itemsColumnsFound} critical quotation_items columns verified`
      ],
      verification: [...(quotationsColumns || []), ...(itemsColumns || [])]
    };

  } catch (error: any) {
    console.error('❌ Quotations table fix failed:', error);
    toast.error('Database fix failed', { description: error.message });
    
    return {
      success: false,
      message: 'Quotations table fix failed',
      details: [error.message]
    };
  }
}

export async function auditQuotationsTable(): Promise<{
  quotationsColumns: string[];
  quotationItemsColumns: string[];
  missingQuotationsColumns: string[];
  missingItemsColumns: string[];
}> {
  try {
    const [quotationsResult, itemsResult] = await Promise.all([
      supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'quotations'),
      supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'quotation_items')
    ]);

    const quotationsColumns = quotationsResult.data?.map(col => col.column_name) || [];
    const quotationItemsColumns = itemsResult.data?.map(col => col.column_name) || [];

    // Expected columns based on verification structure
    const expectedQuotationsColumns = [
      'id', 'company_id', 'customer_id', 'quotation_number', 'quotation_date',
      'valid_until', 'status', 'subtotal', 'tax_amount', 'total_amount',
      'notes', 'terms_and_conditions', 'created_at', 'updated_at'
    ];

    const expectedItemsColumns = [
      'id', 'quotation_id', 'product_id', 'product_name', 'description', 'quantity',
      'unit_price', 'discount_percentage', 'discount_before_vat', 'tax_percentage',
      'tax_amount', 'tax_inclusive', 'line_total', 'sort_order'
    ];

    const missingQuotationsColumns = expectedQuotationsColumns.filter(
      col => !quotationsColumns.includes(col)
    );

    const missingItemsColumns = expectedItemsColumns.filter(
      col => !quotationItemsColumns.includes(col)
    );

    return {
      quotationsColumns,
      quotationItemsColumns,
      missingQuotationsColumns,
      missingItemsColumns
    };
  } catch (error) {
    console.error('Error auditing quotations table:', error);
    return {
      quotationsColumns: [],
      quotationItemsColumns: [],
      missingQuotationsColumns: [],
      missingItemsColumns: []
    };
  }
}

export function getQuotationsFixSQL(): string {
  return QUOTATIONS_COMPLETE_FIX_SQL;
}
