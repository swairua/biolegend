// Test script to verify quotation constraints and identify foreign key issues
import { verifyQuotationConstraintFixes, testQuotationCreation } from './src/utils/verifyQuotationConstraintFixes.ts';

console.log('🚀 Starting quotation constraint verification...');

async function runQuotationTests() {
  try {
    // Run verification
    const verificationResult = await verifyQuotationConstraintFixes();
    console.log('Verification Result:', verificationResult);
    
    // Run creation test
    const creationResult = await testQuotationCreation();
    console.log('Creation Test Result:', creationResult);
    
    return { verificationResult, creationResult };
  } catch (error) {
    console.error('Test failed:', error);
    return { error: error.message };
  }
}

// Export for manual execution
window.runQuotationTests = runQuotationTests;
console.log('✅ Test function loaded. Run window.runQuotationTests() in browser console.');
