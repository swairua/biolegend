import { runLPOMigration } from './runLPOMigration';
import { forceTaxMigration } from './forceTaxMigration';
import { auditDatabaseState } from './databaseAudit';

/**
 * Execute all necessary migrations for the purchase order system
 * This function should be called after connecting to Supabase
 */
export async function executeForcedMigrations() {
  console.log('🚀 Starting comprehensive migration process...');
  
  // Step 1: Initial audit
  console.log('📊 Step 1: Running initial database audit...');
  const initialAudit = await auditDatabaseState();
  console.log('Initial audit results:', initialAudit);

  const migrationResults = [];

  // Step 2: Run LPO migration if needed
  if (!initialAudit.lposTable.exists || !initialAudit.lpoItemsTable.exists) {
    console.log('🔧 Step 2: Running LPO table migration...');
    try {
      const lpoResult = await runLPOMigration();
      migrationResults.push({ step: 'LPO Migration', ...lpoResult });
      console.log('LPO migration result:', lpoResult);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      migrationResults.push({ 
        step: 'LPO Migration', 
        success: false, 
        message: `Migration failed: ${errorMsg}` 
      });
      console.error('LPO migration failed:', error);
    }
  } else {
    console.log('✅ LPO tables already exist, skipping LPO migration');
    migrationResults.push({ 
      step: 'LPO Migration', 
      success: true, 
      message: 'LPO tables already exist' 
    });
  }

  // Step 3: Run tax migration if needed
  if (!initialAudit.quotationItemsTaxColumns.exists || !initialAudit.invoiceItemsTaxColumns.exists) {
    console.log('🔧 Step 3: Running tax columns migration...');
    try {
      const taxResult = await forceTaxMigration();
      migrationResults.push({ step: 'Tax Migration', ...taxResult });
      console.log('Tax migration result:', taxResult);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      migrationResults.push({ 
        step: 'Tax Migration', 
        success: false, 
        message: `Migration failed: ${errorMsg}` 
      });
      console.error('Tax migration failed:', error);
    }
  } else {
    console.log('✅ Tax columns already exist, skipping tax migration');
    migrationResults.push({ 
      step: 'Tax Migration', 
      success: true, 
      message: 'Tax columns already exist' 
    });
  }

  // Step 4: Final audit
  console.log('📊 Step 4: Running final database audit...');
  const finalAudit = await auditDatabaseState();
  console.log('Final audit results:', finalAudit);

  // Step 5: Summary
  const allSuccessful = migrationResults.every(result => result.success);
  const summary = {
    success: allSuccessful,
    totalSteps: migrationResults.length,
    successfulSteps: migrationResults.filter(r => r.success).length,
    failedSteps: migrationResults.filter(r => !r.success).length,
    migrationResults,
    initialAudit,
    finalAudit,
    criticalIssuesResolved: initialAudit.summary.criticalIssues.length - finalAudit.summary.criticalIssues.length,
    remainingIssues: finalAudit.summary.criticalIssues
  };

  console.log('🎯 Migration Summary:', summary);

  if (allSuccessful && finalAudit.summary.criticalIssues.length === 0) {
    console.log('✅ All migrations completed successfully! Purchase order system is ready.');
  } else if (allSuccessful) {
    console.log('⚠️ Migrations completed but some issues remain. Check remaining issues.');
  } else {
    console.log('❌ Some migrations failed. Manual intervention may be required.');
  }

  return summary;
}

/**
 * Quick verification function to check if migrations are needed
 */
export async function checkMigrationsNeeded() {
  try {
    const audit = await auditDatabaseState();
    return {
      needed: audit.summary.criticalIssues.length > 0,
      issues: audit.summary.criticalIssues,
      lpoReady: audit.summary.lpoTablesReady,
      taxReady: !audit.summary.taxMigrationNeeded
    };
  } catch (error) {
    console.error('Error checking migration status:', error);
    return {
      needed: true,
      issues: ['Unable to verify database state - connection may be required'],
      lpoReady: false,
      taxReady: false
    };
  }
}
