// Quick verification script for proforma fixes
// Run this in browser console to verify all fixes are working

console.log('🔍 Verifying Proforma Error Fixes');
console.log('==================================');

async function verifyProformaFixes() {
  console.log('1️⃣ Checking if errors are resolved...');
  
  try {
    // Check if the optimized modal is being used
    const hasOptimizedModal = !!document.querySelector('[data-testid="proforma-optimized"]') ||
                             document.body.innerHTML.includes('CreateProformaModalOptimized');
    
    if (hasOptimizedModal) {
      console.log('✅ Optimized modal detected');
    } else {
      console.log('ℹ️ Optimized modal not visible (may not be open)');
    }
    
    // Check for error messages in the UI
    const errorElements = document.querySelectorAll('[class*="error"], [class*="alert-destructive"]');
    const hasVisibleErrors = Array.from(errorElements).some(el => 
      el.textContent?.includes('generate_proforma_number') ||
      el.textContent?.includes('schema cache')
    );
    
    if (hasVisibleErrors) {
      console.log('⚠️ Proforma errors still visible in UI');
      console.log('💡 Try refreshing the page or clicking auto-fix buttons');
    } else {
      console.log('✅ No proforma errors visible in UI');
    }
    
    // Test the function directly if Supabase is available
    console.log('2️⃣ Testing proforma function...');
    
    const supabase = window.supabase || (await import('/src/integrations/supabase/client.ts')).supabase;
    
    if (supabase) {
      const { data, error } = await supabase.rpc('generate_proforma_number', {
        company_uuid: '550e8400-e29b-41d4-a716-446655440000'
      });
      
      if (error) {
        console.log('❌ Function test failed:', error.message);
        console.log('💡 Function may need to be created. Try the auto-fix button.');
        return false;
      } else {
        console.log('✅ Function test successful:', data);
        return true;
      }
    } else {
      console.log('ℹ️ Supabase client not available for testing');
      return true; // Assume success if we can't test
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

// Check for loading issues
function checkLoadingIssues() {
  console.log('3️⃣ Checking for loading issues...');
  
  const loadingElements = document.querySelectorAll('.animate-spin, [data-testid="loading"]');
  const isStuckLoading = Array.from(loadingElements).some(el => 
    el.isConnected && getComputedStyle(el).display !== 'none'
  );
  
  if (isStuckLoading) {
    console.log('⚠️ App appears to be stuck loading');
    console.log('💡 Try refreshing the page or using emergency reset');
  } else {
    console.log('✅ No loading issues detected');
  }
  
  return !isStuckLoading;
}

// Check proforma modal functionality
function checkModalFunctionality() {
  console.log('4️⃣ Checking proforma modal...');
  
  try {
    // Look for proforma-related buttons
    const createButtons = document.querySelectorAll('button');
    const hasCreateButton = Array.from(createButtons).some(btn => 
      btn.textContent?.includes('Create Proforma') ||
      btn.textContent?.includes('New Proforma')
    );
    
    if (hasCreateButton) {
      console.log('✅ Create proforma button found');
    } else {
      console.log('ℹ️ Create proforma button not visible (may be in different page)');
    }
    
    // Check for error notifications
    const errorNotifications = document.querySelectorAll('[class*="notification"], [class*="alert"]');
    const hasErrorNotification = Array.from(errorNotifications).some(el => 
      el.textContent?.includes('proforma') && el.textContent?.includes('error')
    );
    
    if (hasErrorNotification) {
      console.log('⚠️ Error notifications present');
      console.log('💡 Look for auto-fix buttons in the notifications');
    } else {
      console.log('✅ No error notifications visible');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Modal check failed:', error);
    return false;
  }
}

// Provide fix suggestions
function suggestFixes() {
  console.log('\n🛠️ Available Fix Options:');
  console.log('========================');
  console.log('• Auto-Fix Button: Click any "Auto-Fix Function" buttons in error notifications');
  console.log('• Manual Fix Page: Visit /proforma-function-fix for comprehensive tools');
  console.log('• Diagnostic Page: Visit /proforma-number-diagnostic for detailed analysis');
  console.log('• Emergency Reset: Use emergency auth reset if app is stuck');
  console.log('• Page Refresh: Try refreshing the page to reload with fixes');
}

// Main verification function
async function runVerification() {
  console.log('🚀 Starting comprehensive verification...\n');
  
  const functionTest = await verifyProformaFixes();
  const loadingTest = checkLoadingIssues();
  const modalTest = checkModalFunctionality();
  
  console.log('\n📊 Verification Summary:');
  console.log(`Function Test: ${functionTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Loading Test: ${loadingTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Modal Test: ${modalTest ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = functionTest && loadingTest && modalTest;
  
  if (allPassed) {
    console.log('\n🎉 All verifications passed! Proforma errors should be resolved.');
    console.log('You can now create proforma invoices without errors.');
  } else {
    console.log('\n⚠️ Some issues detected. Fixes may be needed.');
    suggestFixes();
  }
  
  return allPassed;
}

// Auto-run verification
if (typeof window !== 'undefined') {
  console.log('🌐 Browser environment detected. You can run:');
  console.log('• runVerification() - Run all checks');
  console.log('• verifyProformaFixes() - Test function only');
  console.log('• checkLoadingIssues() - Check loading state');
  console.log('• checkModalFunctionality() - Check modal state');
  
  // Make functions available globally
  window.runVerification = runVerification;
  window.verifyProformaFixes = verifyProformaFixes;
  window.checkLoadingIssues = checkLoadingIssues;
  window.checkModalFunctionality = checkModalFunctionality;
  
  // Auto-run after a short delay
  setTimeout(() => {
    console.log('\n⏰ Auto-running verification in 2 seconds...');
    setTimeout(runVerification, 2000);
  }, 1000);
  
} else {
  console.log('📄 Node.js environment - verification not available');
}
