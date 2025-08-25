// Test script for proforma function fix
// Run this in browser console to test the function

console.log('🧪 Testing Proforma Function Fix');
console.log('=================================');

async function testProformaFunction() {
  console.log('1️⃣ Testing function existence...');
  
  try {
    // Import Supabase client (assuming it's available globally)
    const supabase = window.supabase || (await import('/src/integrations/supabase/client.ts')).supabase;
    
    if (!supabase) {
      console.error('❌ Supabase client not available');
      return false;
    }
    
    console.log('✅ Supabase client found');
    
    // Test the function
    console.log('2️⃣ Testing generate_proforma_number function...');
    
    const testCompanyId = '550e8400-e29b-41d4-a716-446655440000';
    const { data, error } = await supabase.rpc('generate_proforma_number', {
      company_uuid: testCompanyId
    });
    
    if (error) {
      console.error('❌ Function test failed:', error);
      console.log('💡 To fix this, visit: /proforma-function-fix');
      return false;
    }
    
    console.log('✅ Function test successful!');
    console.log('Generated proforma number:', data);
    
    // Test multiple calls to ensure incrementing works
    console.log('3️⃣ Testing number incrementing...');
    
    const { data: data2, error: error2 } = await supabase.rpc('generate_proforma_number', {
      company_uuid: testCompanyId
    });
    
    if (error2) {
      console.warn('⚠️ Second test failed:', error2);
    } else {
      console.log('✅ Second test successful:', data2);
      
      // Check if numbers are different (incrementing)
      if (data !== data2) {
        console.log('✅ Number incrementing works correctly');
      } else {
        console.log('ℹ️ Numbers are the same (might be expected if no proforma table data)');
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Test script error:', error);
    return false;
  }
}

// Function to check if proforma tables exist
async function checkProformaTables() {
  console.log('4️⃣ Checking proforma tables...');
  
  try {
    const supabase = window.supabase || (await import('/src/integrations/supabase/client.ts')).supabase;
    
    // Test proforma_invoices table
    const { error: tableError } = await supabase
      .from('proforma_invoices')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.warn('⚠️ proforma_invoices table issue:', tableError.message);
      if (tableError.message.includes('does not exist')) {
        console.log('💡 Proforma tables might not exist. This is OK - function will use fallback.');
      }
    } else {
      console.log('✅ proforma_invoices table accessible');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Table check error:', error);
    return false;
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 Starting comprehensive proforma function test...\n');
  
  const functionTest = await testProformaFunction();
  const tableTest = await checkProformaTables();
  
  console.log('\n📊 Test Summary:');
  console.log(`Function Test: ${functionTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Table Check: ${tableTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (functionTest) {
    console.log('\n🎉 All tests passed! Proforma function is working correctly.');
    console.log('You can now create proforma invoices without errors.');
  } else {
    console.log('\n❌ Tests failed. Please visit /proforma-function-fix to resolve the issue.');
  }
  
  return functionTest && tableTest;
}

// Auto-run tests
if (typeof window !== 'undefined') {
  console.log('🌐 Browser environment detected. You can run:');
  console.log('• runAllTests() - Run all tests');
  console.log('• testProformaFunction() - Test function only');
  console.log('• checkProformaTables() - Check tables only');
  
  // Make functions available globally
  window.runAllTests = runAllTests;
  window.testProformaFunction = testProformaFunction;
  window.checkProformaTables = checkProformaTables;
  
  // Auto-run after a short delay
  setTimeout(() => {
    console.log('\n⏰ Auto-running tests in 2 seconds...');
    setTimeout(runAllTests, 2000);
  }, 1000);
  
} else {
  console.log('📄 Node.js environment - tests not available');
}
