// Test Database Fixes Completion
// Copy and paste this into your browser console to test if the fixes worked

(async function testDatabaseFixes() {
  console.log('🧪 TESTING DATABASE FIXES COMPLETION...');
  
  try {
    // Test if verification module exists
    let verifyModule;
    try {
      verifyModule = await import('./src/utils/verifyDatabaseComplete.ts');
    } catch (importError) {
      console.log('⚠️ Could not import verification module, using direct Supabase queries');
      
      // Fallback to direct testing
      const { supabase } = await import('./src/integrations/supabase/client.ts');
      
      console.log('🔍 Testing critical columns exist...');
      
      const tests = [
        { table: 'lpo_items', column: 'unit_of_measure', description: 'LPO items unit of measure' },
        { table: 'delivery_note_items', column: 'unit_of_measure', description: 'Delivery note items unit of measure' },
        { table: 'invoices', column: 'lpo_number', description: 'Invoice LPO number reference' },
        { table: 'delivery_notes', column: 'delivery_method', description: 'Delivery method tracking' },
        { table: 'delivery_notes', column: 'tracking_number', description: 'Delivery tracking number' },
        { table: 'invoice_items', column: 'tax_amount', description: 'Invoice items tax amount' },
        { table: 'quotation_items', column: 'tax_amount', description: 'Quotation items tax amount' },
        { table: 'products', column: 'min_stock_level', description: 'Products min stock level (form compatible)' },
      ];
      
      let passedTests = 0;
      console.log('\n📋 Running individual column tests:');
      
      for (const test of tests) {
        try {
          const { data, error } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', test.table)
            .eq('column_name', test.column)
            .single();
          
          if (data && !error) {
            console.log(`  ✅ ${test.description}`);
            passedTests++;
          } else {
            console.log(`  ❌ ${test.description} - Column missing`);
          }
        } catch (err) {
          console.log(`  ❌ ${test.description} - Error: ${err.message}`);
        }
      }
      
      const successRate = ((passedTests / tests.length) * 100).toFixed(1);
      console.log(`\n📊 Test Results: ${passedTests}/${tests.length} tests passed (${successRate}%)`);
      
      if (passedTests === tests.length) {
        console.log('🎉 ALL CRITICAL FIXES VERIFIED! Database structure is ready.');
        return { success: true, message: 'All critical database fixes verified' };
      } else {
        console.log('⚠️ Some fixes are missing. Consider running the DatabaseFixPage.');
        return { success: false, message: `${tests.length - passedTests} critical fixes missing` };
      }
    }
    
    // Use the verification module if available
    if (verifyModule && verifyModule.verifyDatabaseComplete) {
      console.log('🔍 Running comprehensive database verification...');
      
      const result = await verifyModule.verifyDatabaseComplete();
      
      console.log('\n' + result.summary);
      
      if (result.isComplete) {
        console.log('🎉 DATABASE STRUCTURE IS COMPLETE!');
        console.log(`✅ All ${result.details.totalTables} tables present`);
        console.log(`✅ All ${result.details.totalColumns} expected columns present`);
        
        if (window.toast) {
          window.toast.success('Database verification passed!', {
            description: 'All required tables and columns are present.'
          });
        }
        
        return { success: true, result };
      } else {
        console.log('❌ DATABASE STRUCTURE INCOMPLETE');
        
        if (result.missingTables.length > 0) {
          console.log(`\n📋 Missing Tables (${result.missingTables.length}):`);
          result.missingTables.forEach(table => console.log(`  - ${table}`));
        }
        
        if (result.missingColumns.length > 0) {
          console.log(`\n📋 Missing Columns (${result.missingColumns.length}):`);
          const grouped = result.missingColumns.reduce((acc, item) => {
            if (!acc[item.table]) acc[item.table] = [];
            acc[item.table].push(item.column);
            return acc;
          }, {});
          
          Object.entries(grouped).forEach(([table, columns]) => {
            console.log(`  ${table}: ${columns.join(', ')}`);
          });
        }
        
        console.log('\n💡 Run the DatabaseFixPage to resolve missing elements: /database-fix-page');
        
        if (window.toast) {
          window.toast.warning('Database verification failed', {
            description: `${result.missingTables.length} missing tables, ${result.missingColumns.length} missing columns`
          });
        }
        
        return { success: false, result };
      }
    }
    
  } catch (error) {
    console.error('❌ Database verification test failed:', error);
    
    if (window.toast) {
      window.toast.error('Verification test failed', {
        description: error.message
      });
    }
    
    return { success: false, error: error.message };
  }
})();

console.log('💡 Navigation: You can visit /database-fix-page to run fixes if needed');
