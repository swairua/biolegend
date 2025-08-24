// Direct script to force quotations table migration
// Run this to immediately fix missing columns

import { fixQuotationsTableColumns } from './src/utils/fixQuotationsTableColumns.ts';

console.log('🚀 FORCE QUOTATIONS MIGRATION STARTING...');
console.log('=====================================');

async function forceQuotationsMigration() {
  try {
    console.log('📋 Step 1: Executing comprehensive quotations table fix...');
    
    const result = await fixQuotationsTableColumns();
    
    console.log('\n📊 MIGRATION RESULTS:');
    console.log('====================');
    console.log('Success:', result.success);
    console.log('Message:', result.message);
    console.log('\nDetails:');
    result.details.forEach((detail, i) => {
      console.log(`  ${i + 1}. ${detail}`);
    });
    
    if (result.success) {
      console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY!');
      console.log('🎉 You can now use quotations without database errors.');
      console.log('');
      console.log('Next steps:');
      console.log('- Go to /quotations page');
      console.log('- Try creating a new quotation');
      console.log('- The valid_until field should now work');
      console.log('- All tax calculations should work');
    } else {
      console.log('\n❌ AUTOMATIC MIGRATION FAILED');
      console.log('📋 Manual steps required:');
      console.log('1. Copy the SQL from the QuotationsTableFix component');
      console.log('2. Go to Supabase Dashboard → SQL Editor');
      console.log('3. Paste and run the SQL script');
      console.log('4. Return and test quotations functionality');
    }
    
  } catch (error) {
    console.error('\n💥 MIGRATION FAILED WITH ERROR:');
    console.error(error);
    console.log('\n🔧 FALLBACK OPTION:');
    console.log('Visit /quotations-table-fix in the app for manual SQL script');
  }
}

forceQuotationsMigration();
