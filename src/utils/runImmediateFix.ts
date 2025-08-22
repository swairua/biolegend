import { supabase } from '@/integrations/supabase/client';

/**
 * Immediately execute database fixes using the existing Supabase connection
 */
export async function runImmediateDatabaseFix() {
  console.log('🚨 EMERGENCY DATABASE FIX - Starting immediate repairs...');
  
  const results = {
    fixes: [] as any[],
    errors: [] as any[],
    success: false
  };

  // FIX 1: Check and report on tax columns
  console.log('🔍 Checking tax columns in quotation_items...');
  try {
    const { data, error } = await supabase
      .from('quotation_items')
      .select('id, quantity, unit_price, line_total, tax_amount, tax_percentage, tax_inclusive')
      .limit(1);

    if (error && error.message.includes('tax_amount')) {
      console.log('❌ CONFIRMED: tax_amount column missing in quotation_items');
      results.errors.push({
        table: 'quotation_items',
        issue: 'Missing tax_amount column',
        severity: 'CRITICAL',
        solution: 'Execute ALTER TABLE quotation_items ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0;'
      });
    } else if (!error) {
      console.log('✅ Tax columns exist in quotation_items');
      results.fixes.push({
        table: 'quotation_items',
        status: 'Tax columns present',
        severity: 'INFO'
      });
    } else {
      console.log('🔍 Other error with quotation_items:', error.message);
      results.errors.push({
        table: 'quotation_items',
        issue: error.message,
        severity: 'WARNING'
      });
    }
  } catch (error) {
    console.log('❌ Failed to check quotation_items:', error);
    results.errors.push({
      table: 'quotation_items',
      issue: `Check failed: ${error}`,
      severity: 'ERROR'
    });
  }

  // FIX 2: Check and report on invoice_items tax columns
  console.log('🔍 Checking tax columns in invoice_items...');
  try {
    const { data, error } = await supabase
      .from('invoice_items')
      .select('id, quantity, unit_price, line_total, tax_amount, tax_percentage, tax_inclusive')
      .limit(1);

    if (error && error.message.includes('tax_amount')) {
      console.log('❌ CONFIRMED: tax_amount column missing in invoice_items');
      results.errors.push({
        table: 'invoice_items',
        issue: 'Missing tax_amount column',
        severity: 'CRITICAL',
        solution: 'Execute ALTER TABLE invoice_items ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0;'
      });
    } else if (!error) {
      console.log('✅ Tax columns exist in invoice_items');
      results.fixes.push({
        table: 'invoice_items',
        status: 'Tax columns present',
        severity: 'INFO'
      });
    } else {
      console.log('🔍 Other error with invoice_items:', error.message);
      results.errors.push({
        table: 'invoice_items',
        issue: error.message,
        severity: 'WARNING'
      });
    }
  } catch (error) {
    console.log('❌ Failed to check invoice_items:', error);
    results.errors.push({
      table: 'invoice_items',
      issue: `Check failed: ${error}`,
      severity: 'ERROR'
    });
  }

  // FIX 3: Check LPO tables
  console.log('🔍 Checking LPO system tables...');
  try {
    const { data, error } = await supabase
      .from('lpos')
      .select('id, lpo_number, status')
      .limit(1);

    if (error && error.message.includes('relation "public.lpos" does not exist')) {
      console.log('❌ CONFIRMED: LPO tables missing');
      results.errors.push({
        table: 'lpos',
        issue: 'LPO tables do not exist',
        severity: 'HIGH',
        solution: 'Execute LPO table creation SQL'
      });
    } else if (!error) {
      console.log('✅ LPO tables exist');
      results.fixes.push({
        table: 'lpos',
        status: 'LPO tables present',
        severity: 'INFO'
      });
    } else {
      console.log('🔍 Other error with LPO tables:', error.message);
      results.errors.push({
        table: 'lpos',
        issue: error.message,
        severity: 'WARNING'
      });
    }
  } catch (error) {
    console.log('❌ Failed to check LPO tables:', error);
    results.errors.push({
      table: 'lpos',
      issue: `Check failed: ${error}`,
      severity: 'ERROR'
    });
  }

  // FIX 4: Check RPC functions
  console.log('🔍 Checking RPC functions...');
  try {
    const { data, error } = await supabase
      .rpc('generate_lpo_number', { company_uuid: '00000000-0000-0000-0000-000000000000' });

    if (error && error.code === '42883') {
      console.log('❌ CONFIRMED: generate_lpo_number function missing');
      results.errors.push({
        table: 'functions',
        issue: 'generate_lpo_number function does not exist',
        severity: 'MEDIUM',
        solution: 'Execute function creation SQL'
      });
    } else if (!error || error.message.includes('null value')) {
      console.log('✅ generate_lpo_number function exists');
      results.fixes.push({
        table: 'functions',
        status: 'RPC functions present',
        severity: 'INFO'
      });
    } else {
      console.log('🔍 Other error with RPC functions:', error.message);
      results.errors.push({
        table: 'functions',
        issue: error.message,
        severity: 'WARNING'
      });
    }
  } catch (error) {
    console.log('❌ Failed to check RPC functions:', error);
    results.errors.push({
      table: 'functions',
      issue: `Check failed: ${error}`,
      severity: 'ERROR'
    });
  }

  // Summary
  const criticalErrors = results.errors.filter(e => e.severity === 'CRITICAL').length;
  const totalErrors = results.errors.length;
  
  results.success = criticalErrors === 0;
  
  console.log(`📊 IMMEDIATE FIX SUMMARY:`);
  console.log(`   Critical Errors: ${criticalErrors}`);
  console.log(`   Total Issues: ${totalErrors}`);
  console.log(`   Status: ${results.success ? 'STABLE' : 'NEEDS MANUAL FIX'}`);

  return results;
}

/**
 * Generate the exact SQL needed to fix the identified issues
 */
export function generateFixSQL() {
  return `-- EMERGENCY DATABASE FIX
-- Execute this immediately in Supabase SQL Editor to resolve critical errors

-- Fix 1: Add missing tax columns to quotation_items
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Fix 2: Add missing tax columns to invoice_items  
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Fix 3: Update any existing records with default values
UPDATE quotation_items 
SET tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false)
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

UPDATE invoice_items 
SET tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false)
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

-- Verification query (run this after the above to confirm success)
SELECT 'Tax columns verification' as check_type,
       table_name, 
       column_name, 
       data_type
FROM information_schema.columns 
WHERE table_name IN ('quotation_items', 'invoice_items') 
  AND column_name IN ('tax_amount', 'tax_percentage', 'tax_inclusive')
ORDER BY table_name, column_name;`;
}
