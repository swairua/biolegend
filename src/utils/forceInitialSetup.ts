import { createSuperAdmin } from './createSuperAdmin';
import { runImmediateDatabaseFix } from './runImmediateFix';
import { fixDatabaseIssues } from './automaticDatabaseFix';

/**
 * Force the initial setup process to run immediately
 * This will be called automatically when the app loads
 */
export async function forceInitialSetup() {
  console.log('🚀 FORCING INITIAL SETUP - AUTO EXECUTION');
  
  const results = {
    databaseFixed: false,
    adminCreated: false,
    setupComplete: false,
    errors: [] as string[],
    details: {
      databaseStatus: null as any,
      adminResult: null as any,
      criticalIssues: 0
    }
  };

  try {
    // Step 1: Check and fix database
    console.log('🔧 Step 1: Checking database status...');
    const dbStatus = await runImmediateDatabaseFix();
    results.details.databaseStatus = dbStatus;
    results.details.criticalIssues = dbStatus.errors.filter(e => e.severity === 'CRITICAL').length;
    
    if (dbStatus.success) {
      console.log('✅ Database is operational');
      results.databaseFixed = true;
    } else {
      console.log(`⚠️ Database has ${dbStatus.errors.length} issues, attempting fixes...`);
      
      // Try to fix what we can automatically
      try {
        const fixResults = await fixDatabaseIssues();
        const taxColumnsFixed = fixResults.some(r => r.success && r.step.includes('Tax'));
        
        if (taxColumnsFixed) {
          console.log('✅ Critical database issues resolved');
          results.databaseFixed = true;
        } else {
          console.log('⚠️ Database needs manual intervention');
          results.errors.push('Database requires manual SQL execution');
        }
      } catch (fixError) {
        console.log('❌ Automatic database fix failed:', fixError);
        results.errors.push(`Database fix failed: ${fixError}`);
      }
    }

    // Step 2: Create super admin
    console.log('👤 Step 2: Creating super admin...');
    try {
      const adminResult = await createSuperAdmin();
      results.details.adminResult = adminResult;
      
      if (adminResult.success) {
        console.log('✅ Super admin created successfully');
        results.adminCreated = true;
      } else {
        console.log('❌ Super admin creation failed:', adminResult.error);
        results.errors.push(`Admin creation failed: ${adminResult.error}`);
      }
    } catch (adminError) {
      console.log('❌ Exception during admin creation:', adminError);
      results.errors.push(`Admin creation exception: ${adminError}`);
    }

    // Step 3: Final verification
    results.setupComplete = results.adminCreated && (results.databaseFixed || results.details.criticalIssues === 0);
    
    if (results.setupComplete) {
      console.log('🎉 FORCED SETUP COMPLETE!');
      console.log('📋 Setup Summary:');
      console.log(`   ✅ Database: ${results.databaseFixed ? 'Fixed' : 'Needs manual fix'}`);
      console.log(`   ✅ Admin: ${results.adminCreated ? 'Created' : 'Failed'}`);
      console.log(`   ✅ Critical Issues: ${results.details.criticalIssues}`);
    } else {
      console.log('⚠️ FORCED SETUP PARTIALLY COMPLETE');
      console.log('📋 Issues found:');
      results.errors.forEach(error => console.log(`   ❌ ${error}`));
    }

    return results;
    
  } catch (error) {
    console.error('❌ FORCED SETUP FAILED:', error);
    results.errors.push(`Setup exception: ${error}`);
    return results;
  }
}

/**
 * Check if initial setup is needed and execute if required
 * This version is safe for use during component initialization
 */
export async function checkAndForceSetup(options = { silentMode: false }) {
  try {
    // Quick check if setup is needed
    const quickCheck = await runImmediateDatabaseFix();
    const needsSetup = quickCheck.errors.some(e => e.severity === 'CRITICAL');

    if (needsSetup) {
      if (!options.silentMode) {
        console.log('🚨 Initial setup required - executing forced setup...');
      }
      const results = await forceInitialSetup();

      if (results.setupComplete) {
        if (!options.silentMode) {
          console.log('✅ Forced setup completed successfully');
        }
        return { success: true, results };
      } else {
        if (!options.silentMode) {
          console.log('⚠️ Forced setup needs manual intervention');
        }
        return { success: false, results, needsManualAction: true };
      }
    } else {
      if (!options.silentMode) {
        console.log('✅ No initial setup needed');
      }
      return { success: true, alreadySetup: true };
    }
  } catch (error) {
    if (!options.silentMode) {
      console.error('❌ Error checking setup status:', error);
    }
    return { success: false, error };
  }
}

// Auto-execution removed to prevent setState during render
// Call checkAndForceSetup() manually when needed
