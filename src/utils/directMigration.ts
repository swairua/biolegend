import { supabase } from '@/integrations/supabase/client';

export interface MigrationResult {
  success: boolean;
  message: string;
  step?: string;
}

/**
 * Direct migration approach that doesn't rely on RPC functions
 * Uses Supabase client API to create tables and check schema
 */
export async function executeDirectMigration(): Promise<MigrationResult[]> {
  console.log('🚀 Starting direct migration (no RPC required)...');
  const results: MigrationResult[] = [];

  // Step 1: Check if LPO tables already exist
  try {
    console.log('🔍 Checking if LPO tables exist...');
    const { data: lposCheck, error: lposError } = await supabase
      .from('lpos')
      .select('id')
      .limit(1);

    if (!lposError) {
      console.log('✅ LPO tables already exist');
      results.push({
        success: true,
        message: 'LPO tables already exist - skipping creation',
        step: 'LPO Table Check'
      });
    } else {
      console.log('❌ LPO tables missing, will need manual creation');
      results.push({
        success: false,
        message: 'LPO tables do not exist. Manual SQL execution required in Supabase dashboard.',
        step: 'LPO Table Check'
      });
    }
  } catch (error) {
    console.log('❌ Error checking LPO tables:', error);
    results.push({
      success: false,
      message: 'Could not check LPO table existence. Manual verification needed.',
      step: 'LPO Table Check'
    });
  }

  // Step 2: Check if tax columns exist
  try {
    console.log('🔍 Checking if tax columns exist...');
    const { data: taxCheck, error: taxError } = await supabase
      .from('quotation_items')
      .select('tax_amount, tax_percentage, tax_inclusive')
      .limit(1);

    if (!taxError) {
      console.log('✅ Tax columns already exist');
      results.push({
        success: true,
        message: 'Tax columns already exist in quotation_items',
        step: 'Tax Columns Check'
      });
    } else if (taxError.message.includes('tax_amount') || taxError.message.includes('column')) {
      console.log('❌ Tax columns missing');
      results.push({
        success: false,
        message: 'Tax columns missing. Manual SQL execution required in Supabase dashboard.',
        step: 'Tax Columns Check'
      });
    } else {
      console.log('❌ Unexpected error checking tax columns:', taxError);
      results.push({
        success: false,
        message: `Error checking tax columns: ${taxError.message}`,
        step: 'Tax Columns Check'
      });
    }
  } catch (error) {
    console.log('❌ Error checking tax columns:', error);
    results.push({
      success: false,
      message: 'Could not check tax column existence. Manual verification needed.',
      step: 'Tax Columns Check'
    });
  }

  // Step 3: Check if RPC function exists
  try {
    console.log('🔍 Checking if generate_lpo_number function exists...');
    const { data: rpcCheck, error: rpcError } = await supabase
      .rpc('generate_lpo_number', { company_uuid: '00000000-0000-0000-0000-000000000000' });

    if (!rpcError || (rpcError.code !== '42883' && !rpcError.message.includes('does not exist'))) {
      console.log('✅ RPC function exists');
      results.push({
        success: true,
        message: 'generate_lpo_number function is available',
        step: 'RPC Function Check'
      });
    } else {
      console.log('❌ RPC function missing');
      results.push({
        success: false,
        message: 'generate_lpo_number function missing. Manual SQL execution required.',
        step: 'RPC Function Check'
      });
    }
  } catch (error) {
    console.log('❌ Error checking RPC function:', error);
    results.push({
      success: false,
      message: 'Could not check RPC function existence. Manual verification needed.',
      step: 'RPC Function Check'
    });
  }

  // Summary
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`📊 Migration check complete: ${successCount}/${totalCount} components ready`);
  
  return results;
}

/**
 * Get the SQL that needs to be manually executed in Supabase dashboard
 */
export function getManualMigrationSQL(): string {
  return `-- ============================================
-- COMPLETE DATABASE MIGRATION FOR LPO SYSTEM
-- Execute this in Supabase SQL Editor
-- ============================================

-- 1. CREATE LPO TABLES AND FUNCTIONS
-- ===================================

-- Create LPO status enum
DO $$ BEGIN
    CREATE TYPE lpo_status AS ENUM ('draft', 'sent', 'approved', 'received', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Main LPO table
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

-- LPO items table
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lpos_company_id ON lpos(company_id);
CREATE INDEX IF NOT EXISTS idx_lpos_supplier_id ON lpos(supplier_id);
CREATE INDEX IF NOT EXISTS idx_lpos_lpo_number ON lpos(lpo_number);
CREATE INDEX IF NOT EXISTS idx_lpos_status ON lpos(status);
CREATE INDEX IF NOT EXISTS idx_lpos_lpo_date ON lpos(lpo_date);
CREATE INDEX IF NOT EXISTS idx_lpo_items_lpo_id ON lpo_items(lpo_id);
CREATE INDEX IF NOT EXISTS idx_lpo_items_product_id ON lpo_items(product_id);

-- 2. ADD TAX COLUMNS TO EXISTING TABLES
-- =====================================

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

-- 3. CREATE HELPER FUNCTIONS
-- ===========================

-- Update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- RPC function to generate LPO number
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

-- 4. ADD TRIGGERS
-- ===============

-- Add trigger to lpos table
DROP TRIGGER IF EXISTS update_lpos_updated_at ON lpos;
CREATE TRIGGER update_lpos_updated_at
    BEFORE UPDATE ON lpos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. VERIFICATION QUERIES (Optional - run after above)
-- ====================================================

-- Verify tables exist
SELECT 'Tables Created' as status, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lpos') THEN 'YES' ELSE 'NO' END as lpos_table,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lpo_items') THEN 'YES' ELSE 'NO' END as lpo_items_table;

-- Verify tax columns exist
SELECT 'Tax Columns' as status,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotation_items' AND column_name = 'tax_amount') THEN 'YES' ELSE 'NO' END as quotation_tax,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'tax_amount') THEN 'YES' ELSE 'NO' END as invoice_tax;

-- Verify RPC function exists
SELECT 'Functions' as status,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'generate_lpo_number') THEN 'YES' ELSE 'NO' END as generate_lpo_number;`;
}
