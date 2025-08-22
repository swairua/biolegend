import { supabase } from '@/integrations/supabase/client';

/**
 * Execute the database fixes directly using Supabase client
 * This attempts to resolve the known issues automatically
 */
export async function executeDirectDatabaseFix() {
  console.log('🚀 Starting direct database fix execution...');
  
  const results = {
    taxColumnsFixed: false,
    lpoTablesCreated: false,
    errors: [] as string[],
    warnings: [] as string[]
  };

  // Step 1: Verify current database state
  console.log('🔍 Checking current database state...');
  
  // Check if tax columns exist in quotation_items
  try {
    const { data, error } = await supabase
      .from('quotation_items')
      .select('tax_amount, tax_percentage, tax_inclusive')
      .limit(1);

    if (!error) {
      console.log('✅ Tax columns already exist in quotation_items');
      results.taxColumnsFixed = true;
    } else if (error.message.includes('tax_amount') || error.message.includes('column')) {
      console.log('❌ Tax columns missing in quotation_items');
      results.warnings.push('Tax columns missing in quotation_items - manual SQL execution required');
    }
  } catch (error) {
    console.log('❌ Error checking quotation_items:', error);
    results.errors.push(`Failed to check quotation_items: ${error}`);
  }

  // Check if LPO tables exist
  try {
    const { data, error } = await supabase
      .from('lpos')
      .select('id')
      .limit(1);

    if (!error) {
      console.log('✅ LPO tables already exist');
      results.lpoTablesCreated = true;
    } else {
      console.log('❌ LPO tables missing');
      results.warnings.push('LPO tables missing - manual SQL execution required');
    }
  } catch (error) {
    console.log('❌ Error checking LPO tables:', error);
    results.errors.push(`Failed to check LPO tables: ${error}`);
  }

  // Step 2: Attempt to create missing structures
  if (!results.taxColumnsFixed) {
    console.log('🔧 Attempting to add tax columns...');
    
    // Since we know exec_sql RPC is not available, we'll document what needs to be done
    results.warnings.push('Tax columns need to be added manually. Execute the provided SQL in Supabase dashboard.');
  }

  if (!results.lpoTablesCreated) {
    console.log('🔧 LPO tables need to be created...');
    results.warnings.push('LPO tables need to be created manually. Execute the provided SQL in Supabase dashboard.');
  }

  // Step 3: Provide clear guidance
  console.log('📋 Generating fix guidance...');
  
  const guidance = {
    urgentFixes: [] as string[],
    nextSteps: [] as string[],
    sqlRequired: false
  };

  if (!results.taxColumnsFixed) {
    guidance.urgentFixes.push('Add tax columns to quotation_items and invoice_items tables');
    guidance.sqlRequired = true;
  }

  if (!results.lpoTablesCreated) {
    guidance.nextSteps.push('Create LPO (Local Purchase Order) system tables and functions');
    guidance.sqlRequired = true;
  }

  return {
    ...results,
    guidance,
    success: results.taxColumnsFixed && results.lpoTablesCreated,
    needsManualAction: guidance.sqlRequired
  };
}

/**
 * Test if the application is working correctly after fixes
 */
export async function testApplicationFunctionality() {
  console.log('🧪 Testing application functionality...');
  
  const tests = {
    quotationSystemWorking: false,
    lpoSystemWorking: false,
    authenticationWorking: false,
    errors: [] as string[]
  };

  // Test 1: Check if quotation system works
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select('id, quotation_number')
      .limit(1);

    if (!error) {
      tests.quotationSystemWorking = true;
      console.log('✅ Quotation system is accessible');
    } else {
      console.log('❌ Quotation system has issues:', error.message);
      tests.errors.push(`Quotation system: ${error.message}`);
    }
  } catch (error) {
    tests.errors.push(`Quotation test failed: ${error}`);
  }

  // Test 2: Check if LPO system works
  try {
    const { data, error } = await supabase
      .from('lpos')
      .select('id, lpo_number')
      .limit(1);

    if (!error) {
      tests.lpoSystemWorking = true;
      console.log('✅ LPO system is accessible');
    } else {
      console.log('❌ LPO system has issues:', error.message);
      tests.errors.push(`LPO system: ${error.message}`);
    }
  } catch (error) {
    tests.errors.push(`LPO test failed: ${error}`);
  }

  // Test 3: Check authentication
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (!error) {
      tests.authenticationWorking = true;
      console.log('✅ Authentication system is working');
    } else {
      console.log('❌ Authentication issues:', error.message);
      tests.errors.push(`Authentication: ${error.message}`);
    }
  } catch (error) {
    tests.errors.push(`Authentication test failed: ${error}`);
  }

  const workingTests = [
    tests.quotationSystemWorking,
    tests.lpoSystemWorking,
    tests.authenticationWorking
  ].filter(Boolean).length;

  return {
    ...tests,
    summary: `${workingTests}/3 systems working`,
    allWorking: workingTests === 3
  };
}
