import { diagnoseUserCompanyIssue, fixUserCompanyAssociation } from './userCompanyDiagnostic';
import { testQuotationCreation } from './verifyQuotationConstraintFixes';
import { diagnoseUserProfile, fixUserProfile } from './userProfileDiagnostic';

/**
 * Comprehensive test that verifies the user-company fix process
 */
export async function testUserCompanyFixProcess() {
  console.log('🧪 Starting comprehensive user-company fix test...');
  
  const results = {
    profileDiagnosis: null as any,
    profileFix: null as any,
    initialDiagnosis: null as any,
    fixAttempt: null as any,
    finalDiagnosis: null as any,
    quotationTest: null as any,
    success: false,
    errors: [] as string[]
  };

  try {
    // Step 1: Check user profile first
    console.log('👤 Step 1: Checking user profile...');
    results.profileDiagnosis = await diagnoseUserProfile();

    if (!results.profileDiagnosis.success || results.profileDiagnosis.issue === 'profile_incomplete') {
      console.log('🔧 Step 1b: Fixing user profile...');
      results.profileFix = await fixUserProfile();

      if (!results.profileFix.success) {
        results.errors.push(`Profile fix failed: ${results.profileFix.message}`);
        return results;
      }

      console.log('✅ Profile fixed successfully');
    } else {
      console.log('✅ User profile is valid');
    }

    // Step 2: Check user-company association
    console.log('📋 Step 2: Running company association diagnosis...');
    results.initialDiagnosis = await diagnoseUserCompanyIssue();
    
    if (results.initialDiagnosis.success) {
      console.log('✅ User-company association already valid');
      results.success = true;
    } else {
      console.log('⚠️ User-company association issue detected:', results.initialDiagnosis.message);

      // Step 3: Attempt company association fix
      console.log('🔧 Step 3: Attempting to fix user-company association...');
      results.fixAttempt = await fixUserCompanyAssociation();

      if (!results.fixAttempt.success) {
        results.errors.push(`Fix failed: ${results.fixAttempt.message}`);
        return results;
      }

      console.log('✅ Fix completed successfully');

      // Step 4: Verify fix worked
      console.log('🔍 Step 4: Verifying fix...');
      results.finalDiagnosis = await diagnoseUserCompanyIssue();

      if (!results.finalDiagnosis.success) {
        results.errors.push(`Verification failed: ${results.finalDiagnosis.message}`);
        return results;
      }

      console.log('✅ Fix verification successful');
      results.success = true;
    }

    // Step 5: Test quotation creation
    console.log('📝 Step 5: Testing quotation creation...');
    results.quotationTest = await testQuotationCreation();
    
    if (!results.quotationTest.success) {
      results.errors.push(`Quotation test failed: ${results.quotationTest.error}`);
      console.log('⚠️ Quotation test failed, but user-company fix was successful');
      // Don't mark overall success as false - the user-company fix worked
    } else {
      console.log('✅ Quotation creation test passed');
    }

  } catch (error: any) {
    results.errors.push(`Test process failed: ${error.message}`);
    console.error('❌ Test process error:', error);
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`Initial State: ${results.initialDiagnosis?.success ? 'Valid' : 'Invalid'}`);
  if (results.fixAttempt) {
    console.log(`Fix Attempt: ${results.fixAttempt.success ? 'Success' : 'Failed'}`);
  }
  if (results.finalDiagnosis) {
    console.log(`Final State: ${results.finalDiagnosis.success ? 'Valid' : 'Invalid'}`);
  }
  console.log(`Quotation Test: ${results.quotationTest?.success ? 'Passed' : 'Failed'}`);
  console.log(`Overall Success: ${results.success ? 'Yes' : 'No'}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(error => console.log(`  - ${error}`));
  }

  return results;
}

/**
 * Quick fix function that attempts to resolve user-company association
 */
export async function quickFixUserCompany() {
  console.log('⚡ Running quick user-company fix...');
  
  try {
    const diagnosis = await diagnoseUserCompanyIssue();
    
    if (diagnosis.success) {
      return {
        success: true,
        message: 'User-company association is already valid',
        action: 'none'
      };
    }

    const fix = await fixUserCompanyAssociation();
    
    if (fix.success) {
      return {
        success: true,
        message: 'User-company association fixed successfully',
        action: 'fixed',
        companyId: fix.companyId
      };
    } else {
      return {
        success: false,
        message: `Fix failed: ${fix.message}`,
        action: 'failed',
        error: fix.error
      };
    }

  } catch (error: any) {
    return {
      success: false,
      message: 'Quick fix failed',
      action: 'error',
      error: error.message
    };
  }
}
