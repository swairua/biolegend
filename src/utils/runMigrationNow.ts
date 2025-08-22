import { supabase } from '@/integrations/supabase/client';

export const runMigrationNow = async () => {
  console.log('🔥 FORCING MIGRATION TO RUN IMMEDIATELY...');
  
  // Simple approach - try to add columns using multiple methods
  const migrationQueries = [
    // Method 1: Simple ADD COLUMN
    `ALTER TABLE quotation_items ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0;`,
    `ALTER TABLE quotation_items ADD COLUMN tax_percentage DECIMAL(6,3) DEFAULT 0;`,
    `ALTER TABLE quotation_items ADD COLUMN tax_inclusive BOOLEAN DEFAULT false;`,
    `ALTER TABLE invoice_items ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0;`,
    `ALTER TABLE invoice_items ADD COLUMN tax_percentage DECIMAL(6,3) DEFAULT 0;`,
    `ALTER TABLE invoice_items ADD COLUMN tax_inclusive BOOLEAN DEFAULT false;`,
  ];

  const results = [];
  
  for (const query of migrationQueries) {
    try {
      console.log(`Executing: ${query}`);
      const { data, error } = await supabase.rpc('exec_sql', { query });
      
      if (error && !error.message.includes('already exists')) {
        console.error(`Failed: ${query}`, error);
        results.push({ query, success: false, error: error.message });
      } else {
        console.log(`Success: ${query}`);
        results.push({ query, success: true });
      }
    } catch (err) {
      console.error(`Exception: ${query}`, err);
      results.push({ query, success: false, error: String(err) });
    }
  }
  
  // Update existing records
  try {
    console.log('Updating existing quotation_items...');
    await supabase
      .from('quotation_items')
      .update({ tax_amount: 0, tax_percentage: 0, tax_inclusive: false })
      .is('tax_amount', null);
      
    console.log('Updating existing invoice_items...');
    await supabase
      .from('invoice_items')
      .update({ tax_amount: 0, tax_percentage: 0, tax_inclusive: false })
      .is('tax_amount', null);
      
  } catch (updateError) {
    console.log('Update failed (might be expected if columns were just added):', updateError);
  }
  
  // Test if it worked
  try {
    const { data: testQuotation } = await supabase
      .from('quotation_items')
      .select('tax_amount')
      .limit(1);
      
    const { data: testInvoice } = await supabase
      .from('invoice_items')
      .select('tax_amount')
      .limit(1);
      
    const success = testQuotation !== null && testInvoice !== null;
    
    console.log(success ? '✅ MIGRATION SUCCESS!' : '❌ MIGRATION FAILED');
    
    return {
      success,
      results,
      message: success ? 'Migration completed successfully!' : 'Migration failed - try manual SQL execution'
    };
    
  } catch (testError) {
    console.error('❌ MIGRATION TEST FAILED:', testError);
    return {
      success: false,
      results,
      error: testError,
      message: 'Migration test failed - columns likely still missing'
    };
  }
};

// Run it immediately when this module is imported (emergency mode)
if (typeof window !== 'undefined') {
  console.log('🚨 EMERGENCY MIGRATION MODE ACTIVATED');
  // Don't auto-run, let user click the button
}
