import { supabase } from '@/integrations/supabase/client';

export interface MigrationResult {
  success: boolean;
  message: string;
  details?: any;
}

export interface DirectMigrationStep {
  name: string;
  description: string;
  execute: () => Promise<MigrationResult>;
}

/**
 * Alternative migration approach that doesn't rely on RPC functions
 * Uses direct Supabase client operations to check and create tables
 */

// Step 1: Create LPO tables using direct table operations
async function createLPOTables(): Promise<MigrationResult> {
  try {
    console.log('🚀 Creating LPO tables using direct approach...');

    // Check if tables already exist first
    const { data: lposCheck } = await supabase
      .from('lpos')
      .select('id')
      .limit(1);

    const { data: lpoItemsCheck } = await supabase
      .from('lpo_items')
      .select('id')
      .limit(1);

    if (lposCheck !== null && lpoItemsCheck !== null) {
      return {
        success: true,
        message: 'LPO tables already exist and are accessible'
      };
    }

    // If tables don't exist or are not accessible, we need to create them
    // Since we can't use RPC, we'll use a different approach
    
    // Try to insert a test record to see if we can create the schema
    // This is a workaround since direct DDL operations need RPC functions
    
    return {
      success: false,
      message: 'LPO tables need to be created manually via Supabase dashboard SQL editor - RPC functions not available'
    };

  } catch (error) {
    console.error('LPO table creation failed:', error);
    return {
      success: false,
      message: `LPO table creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Step 2: Add tax columns using schema introspection
async function addTaxColumns(): Promise<MigrationResult> {
  try {
    console.log('🚀 Checking tax columns using direct approach...');

    // Check if quotation_items has tax columns
    const { data: quotationData, error: quotationError } = await supabase
      .from('quotation_items')
      .select('tax_amount, tax_percentage, tax_inclusive')
      .limit(1);

    // Check if invoice_items has tax columns  
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoice_items')
      .select('tax_amount, tax_percentage, tax_inclusive')
      .limit(1);

    if (!quotationError && !invoiceError) {
      return {
        success: true,
        message: 'Tax columns already exist on both quotation_items and invoice_items tables'
      };
    }

    // If columns don't exist, we need manual intervention
    return {
      success: false,
      message: 'Tax columns need to be created manually via Supabase dashboard SQL editor - RPC functions not available'
    };

  } catch (error) {
    console.error('Tax columns check failed:', error);
    return {
      success: false,
      message: `Tax columns check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Step 3: Check profiles table exists (this should exist from auth)
async function verifyProfilesTable(): Promise<MigrationResult> {
  try {
    console.log('🚀 Verifying profiles table...');

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, status')
      .limit(1);

    if (error) {
      return {
        success: false,
        message: `Profiles table not accessible: ${error.message}`
      };
    }

    return {
      success: true,
      message: 'Profiles table exists and is accessible'
    };

  } catch (error) {
    console.error('Profiles table verification failed:', error);
    return {
      success: false,
      message: `Profiles verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Step 4: Check core business tables
async function verifyCoreBusinessTables(): Promise<MigrationResult> {
  try {
    console.log('🚀 Verifying core business tables...');

    const results = [];
    
    // Check companies table
    try {
      const { error: companiesError } = await supabase
        .from('companies')
        .select('id')
        .limit(1);
      results.push({ table: 'companies', exists: !companiesError });
    } catch {
      results.push({ table: 'companies', exists: false });
    }

    // Check customers table
    try {
      const { error: customersError } = await supabase
        .from('customers')
        .select('id')
        .limit(1);
      results.push({ table: 'customers', exists: !customersError });
    } catch {
      results.push({ table: 'customers', exists: false });
    }

    // Check quotations table
    try {
      const { error: quotationsError } = await supabase
        .from('quotations')
        .select('id')
        .limit(1);
      results.push({ table: 'quotations', exists: !quotationsError });
    } catch {
      results.push({ table: 'quotations', exists: false });
    }

    // Check quotation_items table
    try {
      const { error: quotationItemsError } = await supabase
        .from('quotation_items')
        .select('id')
        .limit(1);
      results.push({ table: 'quotation_items', exists: !quotationItemsError });
    } catch {
      results.push({ table: 'quotation_items', exists: false });
    }

    const existingTables = results.filter(r => r.exists);
    const missingTables = results.filter(r => !r.exists);

    return {
      success: true,
      message: `Core tables check: ${existingTables.length}/${results.length} tables exist`,
      details: { existingTables, missingTables }
    };

  } catch (error) {
    console.error('Core business tables verification failed:', error);
    return {
      success: false,
      message: `Core tables verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Main migration steps
export const directMigrationSteps: DirectMigrationStep[] = [
  {
    name: 'Profiles Table',
    description: 'Verify user profiles table exists',
    execute: verifyProfilesTable
  },
  {
    name: 'Core Business Tables',
    description: 'Check core business tables (companies, customers, quotations)',
    execute: verifyCoreBusinessTables
  },
  {
    name: 'Tax Columns',
    description: 'Verify tax columns on quotation and invoice items',
    execute: addTaxColumns
  },
  {
    name: 'LPO Tables',
    description: 'Create LPO (Purchase Order) tables',
    execute: createLPOTables
  }
];

/**
 * Execute all direct migration steps
 */
export async function executeDirectMigrations(): Promise<{
  success: boolean;
  message: string;
  results: Array<{ step: string; result: MigrationResult }>;
}> {
  console.log('🚀 Starting direct migrations (no RPC required)...');
  
  const results = [];
  let overallSuccess = true;

  for (const step of directMigrationSteps) {
    console.log(`🔄 Executing: ${step.name}`);
    const result = await step.execute();
    results.push({ step: step.name, result });
    
    if (!result.success) {
      overallSuccess = false;
    }
  }

  const successCount = results.filter(r => r.result.success).length;
  const totalCount = results.length;

  return {
    success: overallSuccess,
    message: `Direct migration completed: ${successCount}/${totalCount} steps successful`,
    results
  };
}

/**
 * Get SQL scripts for manual execution in Supabase dashboard
 */
export function getManualMigrationSQL(): string {
  return `-- ============================================
-- MANUAL DATABASE MIGRATION FOR MEDPLUS SYSTEM
-- Execute this in Supabase SQL Editor if RPC functions are not available
-- ============================================

-- 1. Create LPO status enum
DO $$ BEGIN
    CREATE TYPE lpo_status AS ENUM ('draft', 'sent', 'approved', 'received', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create main LPO table
CREATE TABLE IF NOT EXISTS lpos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create LPO items table
CREATE TABLE IF NOT EXISTS lpo_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lpo_id UUID REFERENCES lpos(id) ON DELETE CASCADE,
    product_id UUID,
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL,
    notes TEXT,
    sort_order INTEGER DEFAULT 0
);

-- 4. Add tax columns to quotation_items
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- 5. Add tax columns to invoice_items
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lpos_company_id ON lpos(company_id);
CREATE INDEX IF NOT EXISTS idx_lpos_supplier_id ON lpos(supplier_id);
CREATE INDEX IF NOT EXISTS idx_lpos_lpo_number ON lpos(lpo_number);
CREATE INDEX IF NOT EXISTS idx_lpos_status ON lpos(status);
CREATE INDEX IF NOT EXISTS idx_lpos_lpo_date ON lpos(lpo_date);
CREATE INDEX IF NOT EXISTS idx_lpo_items_lpo_id ON lpo_items(lpo_id);

-- 7. Create LPO number generation function
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
$$ LANGUAGE plpgsql;

-- 8. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Add trigger to lpos table
DROP TRIGGER IF EXISTS update_lpos_updated_at ON lpos;
CREATE TRIGGER update_lpos_updated_at
    BEFORE UPDATE ON lpos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Update existing records with default tax values
UPDATE quotation_items 
SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false 
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

UPDATE invoice_items 
SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false 
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================`;
}
