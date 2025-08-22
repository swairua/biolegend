import { executeComprehensiveMigration, verifyCriticalTables } from './comprehensiveMigration';

/**
 * Test the comprehensive migration setup
 * This can be called from browser console for manual testing
 */
export async function testComprehensiveMigration() {
  console.log('🧪 Testing comprehensive migration setup...');
  
  try {
    // 1. Check current database state
    console.log('📊 Step 1: Checking current database state...');
    const initialCheck = await verifyCriticalTables();
    console.log('Initial state:', initialCheck);
    
    // 2. Execute migration
    console.log('🚀 Step 2: Executing comprehensive migration...');
    const migrationResult = await executeComprehensiveMigration();
    console.log('Migration result:', migrationResult);
    
    // 3. Verify final state
    console.log('✅ Step 3: Verifying final database state...');
    const finalCheck = await verifyCriticalTables();
    console.log('Final state:', finalCheck);
    
    // 4. Summary
    console.log('\n📋 MIGRATION TEST SUMMARY');
    console.log('========================');
    console.log(`Overall Success: ${migrationResult.success ? '✅' : '❌'}`);
    console.log(`Steps Executed: ${migrationResult.stats.successful}/${migrationResult.stats.total}`);
    console.log(`Critical Tables: ${finalCheck.criticalTablesExist ? '✅' : '❌'}`);
    
    if (migrationResult.success && finalCheck.criticalTablesExist) {
      console.log('🎉 MIGRATION TEST PASSED! All systems operational.');
    } else {
      console.log('⚠️ MIGRATION TEST ISSUES DETECTED');
      if (!finalCheck.criticalTablesExist) {
        console.log('💡 Critical tables missing - manual SQL execution may be required');
      }
    }
    
    return {
      success: migrationResult.success && finalCheck.criticalTablesExist,
      migrationResult,
      finalCheck,
      summary: {
        overallSuccess: migrationResult.success,
        stepsExecuted: `${migrationResult.stats.successful}/${migrationResult.stats.total}`,
        criticalTablesExist: finalCheck.criticalTablesExist
      }
    };
    
  } catch (error) {
    console.error('❌ Migration test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      summary: {
        overallSuccess: false,
        error: true
      }
    };
  }
}

/**
 * Quick database status check
 */
export async function quickDatabaseCheck() {
  console.log('🔍 Quick database status check...');
  
  try {
    const status = await verifyCriticalTables();
    
    console.log('\n📊 DATABASE STATUS');
    console.log('==================');
    console.log(`Quotation Tax Columns: ${status.details.quotation_items_tax_columns ? '✅' : '❌'}`);
    console.log(`Invoice Tax Columns: ${status.details.invoice_items_tax_columns ? '✅' : '❌'}`);
    console.log(`LPO Tables: ${status.details.lpos_table ? '✅' : '❌'}`);
    console.log(`LPO Items Table: ${status.details.lpo_items_table ? '✅' : '❌'}`);
    console.log(`Critical Components: ${status.criticalTablesExist ? '✅ ALL WORKING' : '❌ ISSUES FOUND'}`);
    
    return status;
  } catch (error) {
    console.error('❌ Database check failed:', error);
    return { criticalTablesExist: false, details: {}, error };
  }
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testComprehensiveMigration = testComprehensiveMigration;
  (window as any).quickDatabaseCheck = quickDatabaseCheck;
  
  console.log('🧪 Migration test functions available:');
  console.log('• testComprehensiveMigration() - Full migration test');
  console.log('• quickDatabaseCheck() - Quick status check');
}
