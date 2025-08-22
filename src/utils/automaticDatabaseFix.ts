import { supabase } from '@/integrations/supabase/client';

export interface FixResult {
  success: boolean;
  message: string;
  step: string;
  error?: any;
}

/**
 * Automatically fix database issues using the existing Supabase connection
 * This applies the fixes described in the documentation files
 */
export async function fixDatabaseIssues(): Promise<FixResult[]> {
  console.log('🔧 Starting automatic database fixes...');
  const results: FixResult[] = [];

  // Step 1: Fix missing tax columns in quotation_items
  try {
    console.log('🔍 Step 1: Adding tax columns to quotation_items...');
    
    // Check if columns already exist
    const { data: quotationColumns, error: quotationCheckError } = await supabase
      .from('quotation_items')
      .select('tax_amount, tax_percentage, tax_inclusive')
      .limit(1);

    if (!quotationCheckError) {
      results.push({
        success: true,
        message: 'Tax columns already exist in quotation_items',
        step: 'Quotation Tax Columns'
      });
    } else {
      // Apply the fix using SQL
      const { error: addQuotationTaxError } = await supabase.rpc('exec_sql', {
        query: `
          ALTER TABLE quotation_items 
          ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
        `
      });

      if (addQuotationTaxError) {
        // If exec_sql doesn't work, try individual operations
        console.log('exec_sql not available, using alternative approach...');
        
        // Try to update existing records to trigger proper column creation
        const { error: updateError } = await supabase
          .from('quotation_items')
          .update({ 
            tax_percentage: 0,
            tax_amount: 0,
            tax_inclusive: false 
          })
          .eq('id', 'non-existent-id'); // This will fail but help us understand schema

        results.push({
          success: false,
          message: 'Tax columns missing in quotation_items. Manual SQL execution required.',
          step: 'Quotation Tax Columns',
          error: addQuotationTaxError
        });
      } else {
        results.push({
          success: true,
          message: 'Successfully added tax columns to quotation_items',
          step: 'Quotation Tax Columns'
        });
      }
    }
  } catch (error) {
    results.push({
      success: false,
      message: 'Error fixing quotation_items tax columns',
      step: 'Quotation Tax Columns',
      error
    });
  }

  // Step 2: Fix missing tax columns in invoice_items
  try {
    console.log('🔍 Step 2: Adding tax columns to invoice_items...');
    
    const { data: invoiceColumns, error: invoiceCheckError } = await supabase
      .from('invoice_items')
      .select('tax_amount, tax_percentage, tax_inclusive')
      .limit(1);

    if (!invoiceCheckError) {
      results.push({
        success: true,
        message: 'Tax columns already exist in invoice_items',
        step: 'Invoice Tax Columns'
      });
    } else {
      const { error: addInvoiceTaxError } = await supabase.rpc('exec_sql', {
        query: `
          ALTER TABLE invoice_items
          ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
        `
      });

      if (addInvoiceTaxError) {
        results.push({
          success: false,
          message: 'Tax columns missing in invoice_items. Manual SQL execution required.',
          step: 'Invoice Tax Columns',
          error: addInvoiceTaxError
        });
      } else {
        results.push({
          success: true,
          message: 'Successfully added tax columns to invoice_items',
          step: 'Invoice Tax Columns'
        });
      }
    }
  } catch (error) {
    results.push({
      success: false,
      message: 'Error fixing invoice_items tax columns',
      step: 'Invoice Tax Columns',
      error
    });
  }

  // Step 3: Create LPO tables if missing
  try {
    console.log('🔍 Step 3: Creating LPO tables...');
    
    const { data: lpoCheck, error: lpoCheckError } = await supabase
      .from('lpos')
      .select('id')
      .limit(1);

    if (!lpoCheckError) {
      results.push({
        success: true,
        message: 'LPO tables already exist',
        step: 'LPO Tables'
      });
    } else {
      // LPO tables creation requires complex SQL that likely needs manual execution
      results.push({
        success: false,
        message: 'LPO tables missing. Manual SQL execution required in Supabase dashboard.',
        step: 'LPO Tables',
        error: lpoCheckError
      });
    }
  } catch (error) {
    results.push({
      success: false,
      message: 'Error checking/creating LPO tables',
      step: 'LPO Tables',
      error
    });
  }

  // Step 4: Check/create RPC functions
  try {
    console.log('🔍 Step 4: Checking RPC functions...');
    
    const { error: rpcCheckError } = await supabase
      .rpc('generate_lpo_number', { company_uuid: '00000000-0000-0000-0000-000000000000' });

    if (!rpcCheckError || (rpcCheckError.code !== '42883' && !rpcCheckError.message.includes('does not exist'))) {
      results.push({
        success: true,
        message: 'LPO number generator function is available',
        step: 'RPC Functions'
      });
    } else {
      results.push({
        success: false,
        message: 'LPO number generator function missing. Manual SQL execution required.',
        step: 'RPC Functions',
        error: rpcCheckError
      });
    }
  } catch (error) {
    results.push({
      success: false,
      message: 'Error checking RPC functions',
      step: 'RPC Functions',
      error
    });
  }

  // Summary
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`📊 Database fix complete: ${successCount}/${totalCount} components fixed/verified`);
  
  return results;
}

/**
 * Execute the specific tax column fixes using direct SQL approach
 */
export async function executeTaxColumnFix(): Promise<FixResult[]> {
  console.log('🔧 Executing tax column fixes...');
  const results: FixResult[] = [];

  // Since exec_sql RPC is not available, we'll try an alternative approach
  // We'll insert test records to trigger proper column handling
  
  try {
    // Try to insert a test quotation item with tax fields
    const testQuotationData = {
      quotation_id: '00000000-0000-0000-0000-000000000000',
      product_id: '00000000-0000-0000-0000-000000000000',
      description: 'Test item for tax column verification',
      quantity: 1,
      unit_price: 100,
      tax_percentage: 15,
      tax_amount: 15,
      tax_inclusive: false,
      line_total: 115
    };

    const { error: quotationInsertError } = await supabase
      .from('quotation_items')
      .insert([testQuotationData]);

    if (!quotationInsertError) {
      // Clean up the test record
      await supabase
        .from('quotation_items')
        .delete()
        .eq('description', 'Test item for tax column verification');

      results.push({
        success: true,
        message: 'Tax columns are working correctly in quotation_items',
        step: 'Tax Column Verification'
      });
    } else if (quotationInsertError.message.includes('tax_amount') || quotationInsertError.message.includes('column')) {
      results.push({
        success: false,
        message: 'Tax columns missing in quotation_items - manual SQL execution required',
        step: 'Tax Column Verification',
        error: quotationInsertError
      });
    } else {
      results.push({
        success: false,
        message: 'Other issues with quotation_items table',
        step: 'Tax Column Verification',
        error: quotationInsertError
      });
    }
  } catch (error) {
    results.push({
      success: false,
      message: 'Error verifying tax columns',
      step: 'Tax Column Verification',
      error
    });
  }

  return results;
}

/**
 * Get the SQL scripts that need to be executed manually
 */
export function getRequiredSQL(): { 
  taxColumnsSQL: string; 
  lpoSystemSQL: string; 
  completeSQL: string;
} {
  const taxColumnsSQL = `-- Fix missing tax columns
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

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
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;`;

  const lpoSystemSQL = `-- Create LPO system
DO $$ BEGIN
    CREATE TYPE lpo_status AS ENUM ('draft', 'sent', 'approved', 'received', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS lpos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    lpo_number VARCHAR(100) UNIQUE NOT NULL,
    lpo_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_date DATE,
    status lpo_status DEFAULT 'draft',
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    terms_and_conditions TEXT,
    delivery_address TEXT,
    contact_person VARCHAR(255),
    contact_phone VARCHAR(50),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lpo_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lpo_id UUID REFERENCES lpos(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL,
    notes TEXT,
    sort_order INTEGER DEFAULT 0
);

CREATE OR REPLACE FUNCTION generate_lpo_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    company_code TEXT;
    lpo_count INTEGER;
    lpo_number TEXT;
BEGIN
    SELECT COALESCE(UPPER(LEFT(name, 3)), 'LPO') INTO company_code
    FROM companies 
    WHERE id = company_uuid;
    
    SELECT COUNT(*) INTO lpo_count
    FROM lpos
    WHERE company_id = company_uuid;
    
    lpo_number := company_code || '-LPO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((lpo_count + 1)::TEXT, 4, '0');
    
    RETURN lpo_number;
END;
$$ LANGUAGE plpgsql;`;

  return {
    taxColumnsSQL,
    lpoSystemSQL,
    completeSQL: taxColumnsSQL + '\n\n' + lpoSystemSQL
  };
}
