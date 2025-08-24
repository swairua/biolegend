// Script to audit and fix products table
import { auditProductTable, autoFixProductTable } from './src/utils/autoFixProductTable.ts';

async function runFix() {
  console.log('🔍 Starting product table audit...');
  
  try {
    // First run audit
    const auditResult = await auditProductTable();
    console.log('\n📋 AUDIT RESULTS:');
    console.log('Success:', auditResult.success);
    console.log('Message:', auditResult.message);
    console.log('Details:');
    auditResult.details.forEach(detail => console.log(' -', detail));
    
    if (!auditResult.success) {
      console.log('\n🔧 Running auto-fix...');
      const fixResult = await autoFixProductTable();
      
      console.log('\n✅ FIX RESULTS:');
      console.log('Success:', fixResult.success);
      console.log('Message:', fixResult.message);
      console.log('Details:');
      fixResult.details.forEach(detail => console.log(' -', detail));
      
      if (!fixResult.success && fixResult.sqlScript) {
        console.log('\n📜 MANUAL SQL SCRIPT:');
        console.log(fixResult.sqlScript);
      }
    }
    
  } catch (error) {
    console.error('❌ Error running fix:', error);
  }
}

runFix();
