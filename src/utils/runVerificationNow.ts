import { verifyManualSetup, testCoreSystemAfterSetup } from './verifyManualSetup';

/**
 * Run verification immediately and log results
 */
export async function runVerificationNow() {
  console.log('🔍 RUNNING POST-MANUAL VERIFICATION...');
  
  try {
    const verification = await verifyManualSetup();
    const coreTests = await testCoreSystemAfterSetup();
    
    console.log('📊 VERIFICATION RESULTS:');
    console.log('========================');
    
    // Database Status
    console.log('\n🗄️ DATABASE STATUS:');
    console.log(`   Quotation Tax Columns: ${verification.databaseStatus.quotationTaxColumns ? '✅ Working' : '❌ Missing'}`);
    console.log(`   Invoice Tax Columns: ${verification.databaseStatus.invoiceTaxColumns ? '✅ Working' : '❌ Missing'}`);
    console.log(`   LPO Tables: ${verification.databaseStatus.lpoTables ? '✅ Working' : '➖ Optional'}`);
    console.log(`   RPC Functions: ${verification.databaseStatus.rpcFunctions ? '✅ Working' : '➖ Optional'}`);
    console.log(`   Overall Database: ${verification.databaseWorking ? '✅ WORKING' : '❌ NEEDS FIXES'}`);
    
    // Auth Status
    console.log('\n🔐 AUTHENTICATION STATUS:');
    console.log(`   Auth Connection: ${verification.authStatus.connectionWorking ? '✅ Working' : '❌ Failed'}`);
    console.log(`   Super Admin User: ${verification.authStatus.adminUserExists ? '✅ Exists' : '❌ Missing'}`);
    
    // Core System Tests
    console.log('\n🧪 CORE SYSTEM TESTS:');
    console.log(`   Quotations: ${coreTests.quotationCreation ? '✅ Working' : '❌ Failed'}`);
    console.log(`   Inventory: ${coreTests.inventoryAccess ? '✅ Working' : '❌ Failed'}`);
    console.log(`   Customers: ${coreTests.customerAccess ? '✅ Working' : '❌ Failed'}`);
    console.log(`   Summary: ${coreTests.summary}`);
    
    // Overall Status
    console.log('\n🎯 OVERALL STATUS:');
    console.log(`   System Ready: ${verification.systemReady ? '✅ YES - READY TO USE!' : '❌ NO - NEEDS COMPLETION'}`);
    
    if (verification.successes.length > 0) {
      console.log('\n✅ WORKING SYSTEMS:');
      verification.successes.forEach((success: string) => console.log(`   ${success}`));
    }
    
    if (verification.issues.length > 0) {
      console.log('\n❌ ISSUES FOUND:');
      verification.issues.forEach((issue: string) => console.log(`   ${issue}`));
    }
    
    if (verification.nextSteps.length > 0) {
      console.log('\n📝 NEXT STEPS:');
      verification.nextSteps.forEach((step: string, index: number) => console.log(`   ${index + 1}. ${step}`));
    }
    
    if (coreTests.errors.length > 0) {
      console.log('\n🔧 CORE SYSTEM ERRORS:');
      coreTests.errors.forEach((error: string) => console.log(`   • ${error}`));
    }
    
    console.log('\n========================');
    
    return {
      verification,
      coreTests,
      summary: {
        databaseWorking: verification.databaseWorking,
        systemReady: verification.systemReady,
        coreSystemsWorking: coreTests.allWorking,
        needsAdminCreation: !verification.authStatus.adminUserExists,
        overallStatus: verification.systemReady && coreTests.allWorking ? 'READY' : 'NEEDS_COMPLETION'
      }
    };
    
  } catch (error) {
    console.error('❌ VERIFICATION FAILED:', error);
    throw error;
  }
}

// Auto-execution removed to prevent setState during render
// Call runVerificationNow() manually when needed
