// Console command to execute database migration immediately
// Copy and paste this into your browser console (F12 → Console tab)

(async function executeDatabaseMigration() {
  console.log('🚀 STARTING AUTOMATIC DATABASE MIGRATION...');
  
  try {
    // Import the migration function
    const { executeMigrationNow } = await import('./src/utils/executeMigrationNow.ts');
    
    console.log('📦 Migration module loaded successfully');
    console.log('⚡ Executing migration now...');
    
    // Execute the migration
    const success = await executeMigrationNow();
    
    if (success) {
      console.log('✅ DATABASE MIGRATION COMPLETED SUCCESSFULLY!');
      console.log('🎉 All tables created. Application will refresh in 3 seconds.');
    } else {
      console.log('⚠️ Migration completed with issues. Check notifications for details.');
    }
    
    return success;
  } catch (error) {
    console.error('❌ Migration execution failed:', error);
    console.log('💡 Try visiting /auto-setup for the visual interface');
    return false;
  }
})();
