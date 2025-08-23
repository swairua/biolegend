// Execute Database Fixes and Remove RLS
// Copy and paste this into your browser console (F12 → Console tab)

(async function executeFixesAndRemoveRLS() {
  console.log('🚀 STARTING DATABASE FIXES AND RLS REMOVAL...');
  
  try {
    // Import the function
    const module = await import('./src/utils/runFixesAndRemoveRLS.ts');
    const { runFixesAndRemoveRLS } = module;
    
    console.log('📦 Module loaded successfully');
    console.log('⚡ Executing fixes and RLS removal now...');
    
    // Execute the fixes and RLS removal
    const result = await runFixesAndRemoveRLS();
    
    if (result.success) {
      console.log('✅ DATABASE FIXES AND RLS REMOVAL COMPLETED SUCCESSFULLY!');
      console.log('🎉 All missing columns added and RLS policies removed.');
      console.log('📊 Result details:', result);
      
      // Show success notification
      if (window.toast) {
        window.toast.success('Database fixes and RLS removal completed!', {
          description: 'All missing columns added and RLS policies removed.'
        });
      }
      
      console.log('🔄 You may want to refresh the page to see the changes.');
      
    } else {
      console.log('⚠️ Database fixes and RLS removal completed with issues.');
      console.log('❌ Error:', result.error);
      console.log('💡 Manual SQL required:');
      console.log(result.details?.sql);
      
      if (window.toast) {
        window.toast.error('Database fixes and RLS removal failed', {
          description: 'Manual execution required. Check console for SQL.'
        });
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Execution failed:', error);
    console.log('💡 Alternative: Visit /database-fix-page for the visual interface');
    
    if (window.toast) {
      window.toast.error('Execution failed', {
        description: 'Visit /database-fix-page for manual execution.'
      });
    }
    
    return { success: false, error: error.message };
  }
})();

// Also make the function available globally
window.runDatabaseFixesAndRemoveRLS = async function() {
  try {
    const module = await import('./src/utils/runFixesAndRemoveRLS.ts');
    return await module.runFixesAndRemoveRLS();
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: error.message };
  }
};

console.log('💡 You can also call: runDatabaseFixesAndRemoveRLS()');
