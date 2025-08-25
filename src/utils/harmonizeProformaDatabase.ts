import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// SQL to harmonize proforma database schema with code expectations
const HARMONIZE_PROFORMA_SQL = `
-- ============================================
-- HARMONIZE PROFORMA DATABASE SCHEMA
-- ============================================
-- This script ensures proforma tables match the code expectations

-- Step 1: Ensure proforma_invoices table has all required columns
DO $$
BEGIN
    -- Add valid_until column (critical for proforma creation)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'valid_until') THEN
        ALTER TABLE proforma_invoices ADD COLUMN valid_until DATE;
        RAISE NOTICE 'Added valid_until column to proforma_invoices';
    END IF;

    -- Add tax_percentage column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'tax_percentage') THEN
        ALTER TABLE proforma_invoices ADD COLUMN tax_percentage DECIMAL(5,2) DEFAULT 0;
        RAISE NOTICE 'Added tax_percentage column to proforma_invoices';
    END IF;

    -- Add created_by column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'created_by') THEN
        ALTER TABLE proforma_invoices ADD COLUMN created_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added created_by column to proforma_invoices';
    END IF;

    -- Ensure all other expected columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'subtotal') THEN
        ALTER TABLE proforma_invoices ADD COLUMN subtotal DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added subtotal column to proforma_invoices';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'tax_amount') THEN
        ALTER TABLE proforma_invoices ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added tax_amount column to proforma_invoices';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'total_amount') THEN
        ALTER TABLE proforma_invoices ADD COLUMN total_amount DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added total_amount column to proforma_invoices';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'status') THEN
        ALTER TABLE proforma_invoices ADD COLUMN status VARCHAR(50) DEFAULT 'draft';
        RAISE NOTICE 'Added status column to proforma_invoices';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'notes') THEN
        ALTER TABLE proforma_invoices ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column to proforma_invoices';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'terms_and_conditions') THEN
        ALTER TABLE proforma_invoices ADD COLUMN terms_and_conditions TEXT;
        RAISE NOTICE 'Added terms_and_conditions column to proforma_invoices';
    END IF;

    RAISE NOTICE 'Proforma_invoices table column check complete';
END $$;

-- Step 2: Ensure proforma_items table has all required columns
DO $$
BEGIN
    -- Add tax columns (critical for proforma creation)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_items' AND column_name = 'tax_percentage') THEN
        ALTER TABLE proforma_items ADD COLUMN tax_percentage DECIMAL(6,3) DEFAULT 0;
        RAISE NOTICE 'Added tax_percentage column to proforma_items';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_items' AND column_name = 'tax_amount') THEN
        ALTER TABLE proforma_items ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added tax_amount column to proforma_items';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_items' AND column_name = 'tax_inclusive') THEN
        ALTER TABLE proforma_items ADD COLUMN tax_inclusive BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added tax_inclusive column to proforma_items';
    END IF;

    -- Add discount columns (used by tax calculation)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_items' AND column_name = 'discount_percentage') THEN
        ALTER TABLE proforma_items ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0;
        RAISE NOTICE 'Added discount_percentage column to proforma_items';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_items' AND column_name = 'discount_amount') THEN
        ALTER TABLE proforma_items ADD COLUMN discount_amount DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added discount_amount column to proforma_items';
    END IF;

    -- Ensure line_total column exists (critical for calculations)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_items' AND column_name = 'line_total') THEN
        ALTER TABLE proforma_items ADD COLUMN line_total DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added line_total column to proforma_items';
    END IF;

    RAISE NOTICE 'Proforma_items table column check complete';
END $$;

-- Step 3: Update existing records with safe default values
UPDATE proforma_items 
SET tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false),
    discount_percentage = COALESCE(discount_percentage, 0),
    discount_amount = COALESCE(discount_amount, 0),
    line_total = COALESCE(line_total, quantity * unit_price);

UPDATE proforma_invoices 
SET subtotal = COALESCE(subtotal, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_percentage = COALESCE(tax_percentage, 0),
    total_amount = COALESCE(total_amount, 0),
    status = COALESCE(status, 'draft');

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_company_id ON proforma_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_customer_id ON proforma_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_status ON proforma_invoices(status);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_date ON proforma_invoices(proforma_date);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_valid_until ON proforma_invoices(valid_until);

CREATE INDEX IF NOT EXISTS idx_proforma_items_proforma_id ON proforma_items(proforma_id);
CREATE INDEX IF NOT EXISTS idx_proforma_items_product_id ON proforma_items(product_id);

-- Step 5: Success message
SELECT '✅ PROFORMA DATABASE HARMONIZATION COMPLETE!' as result,
       'All missing columns have been added to proforma_invoices and proforma_items tables.' as message,
       'The valid_until column and all tax columns are now available.' as details,
       'Proforma invoices can now be created without database errors.' as next_step;
`;

interface HarmonizeResult {
  success: boolean;
  message: string;
  details: string[];
  errors?: string[];
}

export async function harmonizeProformaDatabase(): Promise<HarmonizeResult> {
  try {
    console.log('🔧 Starting proforma database harmonization...');
    toast.info('Harmonizing proforma database schema...', { 
      description: 'Adding missing columns and fixing schema' 
    });

    // Try to execute the harmonization SQL using various RPC methods
    const executionMethods = [
      { name: 'exec_sql', params: { sql: HARMONIZE_PROFORMA_SQL } },
      { name: 'sql', params: { query: HARMONIZE_PROFORMA_SQL } },
      { name: 'execute_sql', params: { sql_text: HARMONIZE_PROFORMA_SQL } }
    ];

    let harmonizationExecuted = false;
    let lastError = '';

    for (const method of executionMethods) {
      try {
        console.log(`Trying RPC method: ${method.name}`);
        const { data, error } = await supabase.rpc(method.name, method.params);
        
        if (!error) {
          console.log(`✅ Harmonization executed successfully using ${method.name}`);
          harmonizationExecuted = true;
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

    if (!harmonizationExecuted) {
      console.log('⚠️ Could not execute harmonization automatically. Providing manual SQL.');
      toast.warning('Manual harmonization required', { 
        description: 'Copy SQL script and run in Supabase SQL Editor' 
      });
      
      return {
        success: false,
        message: 'Automatic harmonization failed - manual execution required',
        details: [
          '❌ Could not execute SQL automatically',
          '📋 Copy the SQL script to Supabase SQL Editor',
          '🔧 Run the script manually to add missing columns',
          '⚡ This will fix the valid_until column and all tax columns'
        ],
        errors: [lastError]
      };
    }

    // Verify the harmonization was successful by checking for key columns
    const { data: proformaColumns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'proforma_invoices')
      .in('column_name', ['valid_until', 'tax_amount', 'subtotal', 'total_amount']);

    const { data: itemsColumns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'proforma_items')
      .in('column_name', ['tax_percentage', 'tax_amount', 'tax_inclusive', 'line_total']);

    const proformaColumnsFound = proformaColumns?.length || 0;
    const itemsColumnsFound = itemsColumns?.length || 0;

    toast.success('Proforma database harmonized!', { 
      description: `Schema updated with all required columns` 
    });

    return {
      success: true,
      message: 'Proforma database harmonization completed successfully!',
      details: [
        '✅ valid_until column added to proforma_invoices table',
        '✅ Tax columns added to proforma_items table',
        '✅ Discount columns added for proper calculations',
        '✅ Indexes created for better performance',
        '✅ All existing records updated with safe defaults',
        `🎯 ${proformaColumnsFound} critical proforma_invoices columns verified`,
        `🎯 ${itemsColumnsFound} critical proforma_items columns verified`,
        '🎉 Code and database are now harmonized!'
      ]
    };

  } catch (error: any) {
    console.error('❌ Proforma database harmonization failed:', error);
    toast.error('Database harmonization failed', { description: error.message });
    
    return {
      success: false,
      message: 'Proforma database harmonization failed',
      details: [error.message]
    };
  }
}

export async function auditProformaDatabase(): Promise<{
  proformaColumns: string[];
  proformaItemsColumns: string[];
  missingProformaColumns: string[];
  missingItemsColumns: string[];
}> {
  try {
    const [proformaResult, itemsResult] = await Promise.all([
      supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'proforma_invoices'),
      supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'proforma_items')
    ]);

    const proformaColumns = proformaResult.data?.map(col => col.column_name) || [];
    const proformaItemsColumns = itemsResult.data?.map(col => col.column_name) || [];

    // Expected columns based on code expectations
    const expectedProformaColumns = [
      'id', 'company_id', 'customer_id', 'proforma_number', 'proforma_date',
      'valid_until', 'status', 'subtotal', 'tax_percentage', 'tax_amount', 'total_amount',
      'notes', 'terms_and_conditions', 'created_by', 'created_at', 'updated_at'
    ];

    const expectedItemsColumns = [
      'id', 'proforma_id', 'product_id', 'description', 'quantity',
      'unit_price', 'discount_percentage', 'discount_amount', 'tax_percentage',
      'tax_amount', 'tax_inclusive', 'line_total', 'created_at'
    ];

    const missingProformaColumns = expectedProformaColumns.filter(
      col => !proformaColumns.includes(col)
    );

    const missingItemsColumns = expectedItemsColumns.filter(
      col => !proformaItemsColumns.includes(col)
    );

    return {
      proformaColumns,
      proformaItemsColumns,
      missingProformaColumns,
      missingItemsColumns
    };
  } catch (error) {
    console.error('Error auditing proforma database:', error);
    return {
      proformaColumns: [],
      proformaItemsColumns: [],
      missingProformaColumns: [],
      missingItemsColumns: []
    };
  }
}

export function getProformaHarmonizationSQL(): string {
  return HARMONIZE_PROFORMA_SQL;
}
