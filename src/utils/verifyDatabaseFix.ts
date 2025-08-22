import { supabase } from '@/integrations/supabase/client';

/**
 * Simple verification that checks database components without using RPC functions
 * This replaces the old migration approaches that relied on exec_sql
 */
export async function verifyDatabaseComponents() {
  console.log('🔍 Verifying database components without RPC dependencies...');
  
  const results = {
    lpoTables: false,
    taxColumns: false,
    rpcFunction: false,
    errors: [] as string[]
  };

  // Check LPO tables exist
  try {
    const { error: lposError } = await supabase
      .from('lpos')
      .select('id')
      .limit(1);

    if (!lposError) {
      results.lpoTables = true;
      console.log('✅ LPO tables are available');
    } else {
      console.log('❌ LPO tables not available:', lposError.message);
      results.errors.push(`LPO tables: ${lposError.message}`);
    }
  } catch (error) {
    console.log('❌ Error checking LPO tables:', error);
    results.errors.push(`LPO table check failed: ${error}`);
  }

  // Check tax columns exist
  try {
    const { error: taxError } = await supabase
      .from('quotation_items')
      .select('tax_amount, tax_percentage, tax_inclusive')
      .limit(1);

    if (!taxError) {
      results.taxColumns = true;
      console.log('✅ Tax columns are available');
    } else if (taxError.message.includes('tax_amount') || taxError.message.includes('column')) {
      console.log('❌ Tax columns not available:', taxError.message);
      results.errors.push(`Tax columns: ${taxError.message}`);
    } else {
      console.log('❌ Unexpected error checking tax columns:', taxError.message);
      results.errors.push(`Tax column check: ${taxError.message}`);
    }
  } catch (error) {
    console.log('❌ Error checking tax columns:', error);
    results.errors.push(`Tax column check failed: ${error}`);
  }

  // Check RPC function exists (but don't require it)
  try {
    const { error: rpcError } = await supabase
      .rpc('generate_lpo_number', { company_uuid: '00000000-0000-0000-0000-000000000000' });

    if (!rpcError || (rpcError.code !== '42883' && !rpcError.message.includes('does not exist'))) {
      results.rpcFunction = true;
      console.log('✅ generate_lpo_number function is available');
    } else {
      console.log('❌ generate_lpo_number function not available:', rpcError.message);
      results.errors.push(`RPC function: ${rpcError.message}`);
    }
  } catch (error) {
    console.log('❌ Error checking RPC function:', error);
    results.errors.push(`RPC function check failed: ${error}`);
  }

  // Summary
  const readyComponents = [results.lpoTables, results.taxColumns, results.rpcFunction].filter(Boolean).length;
  const totalComponents = 3;
  
  console.log(`📊 Database verification complete: ${readyComponents}/${totalComponents} components ready`);
  
  if (readyComponents === totalComponents) {
    console.log('🎉 All database components are ready! Purchase order system is fully operational.');
  } else {
    console.log('⚠️ Some components need setup. Use the manual migration guide.');
  }

  return {
    ...results,
    readyCount: readyComponents,
    totalCount: totalComponents,
    isReady: readyComponents === totalComponents,
    needsManualSetup: readyComponents < totalComponents
  };
}

/**
 * Quick check if the old migration errors should still occur
 */
export async function checkForRPCErrors() {
  console.log('🔍 Checking if RPC errors have been resolved...');
  
  // This should NOT be called anymore, but let's verify
  try {
    const { error } = await supabase.rpc('exec_sql', { query: 'SELECT 1;' });
    
    if (error && error.code === 'PGRST202') {
      console.log('✅ Confirmed: exec_sql RPC is not available (this is expected)');
      return {
        rpcAvailable: false,
        shouldUseManualMigration: true,
        message: 'exec_sql RPC not available - manual migration approach is correct'
      };
    } else {
      console.log('🔍 Unexpected: exec_sql RPC might be available');
      return {
        rpcAvailable: true,
        shouldUseManualMigration: false,
        message: 'exec_sql RPC is available - automatic migration might work'
      };
    }
  } catch (error) {
    console.log('✅ exec_sql check failed as expected:', error);
    return {
      rpcAvailable: false,
      shouldUseManualMigration: true,
      message: 'exec_sql not available - using manual migration guide is correct'
    };
  }
}
