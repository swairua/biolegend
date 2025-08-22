import { forceAllMigrations } from './forceAllMigrations';
import { toast } from 'sonner';

/**
 * Execute migration immediately and show progress to user
 * This can be called from anywhere in the app
 */
export async function executeMigrationNow(): Promise<boolean> {
  console.log('🚀 EXECUTING IMMEDIATE MIGRATION...');
  
  // Show loading toast
  const loadingToast = toast.loading('Creating database tables...', {
    description: 'This may take a moment. Please wait.',
    duration: 0 // Don't auto-dismiss
  });

  try {
    const result = await forceAllMigrations();
    
    // Dismiss loading toast
    toast.dismiss(loadingToast);

    if (result.success) {
      toast.success('🎉 Database Migration Complete!', {
        description: `Successfully created ${result.tablesCreated.length} tables. Page will refresh in 3 seconds.`,
        duration: 5000
      });

      // Auto-refresh after successful migration
      setTimeout(() => {
        window.location.reload();
      }, 3000);

      return true;
    } else if (result.needsManualSQL) {
      toast.warning('Manual SQL Required', {
        description: 'Some tables need manual creation. Click here for instructions.',
        duration: 10000,
        action: {
          label: 'View Instructions',
          onClick: () => window.location.href = '/force-migration'
        }
      });

      return false;
    } else {
      toast.error('Migration Failed', {
        description: result.message,
        duration: 10000,
        action: {
          label: 'Retry',
          onClick: () => executeMigrationNow()
        }
      });

      return false;
    }
  } catch (error) {
    toast.dismiss(loadingToast);
    
    toast.error('Migration Execution Failed', {
      description: 'Check console for details. You may need to run manual SQL.',
      duration: 10000,
      action: {
        label: 'Manual Setup',
        onClick: () => window.location.href = '/force-migration'
      }
    });

    console.error('Migration execution failed:', error);
    return false;
  }
}

/**
 * Check if migration is needed and execute if required
 * This can be called on app startup
 */
export async function autoMigrateIfNeeded(): Promise<void> {
  try {
    console.log('🔍 Checking if migration is needed...');
    
    // Quick check for basic tables
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Test if basic tables exist
    const tableChecks = [
      { name: 'companies', check: () => supabase.from('companies').select('id').limit(1) },
      { name: 'profiles', check: () => supabase.from('profiles').select('id').limit(1) },
      { name: 'customers', check: () => supabase.from('customers').select('id').limit(1) }
    ];

    let missingTables = 0;
    
    for (const table of tableChecks) {
      try {
        const { error } = await table.check();
        if (error) {
          missingTables++;
          console.log(`❌ Table ${table.name} missing or inaccessible`);
        } else {
          console.log(`✅ Table ${table.name} exists`);
        }
      } catch (error) {
        missingTables++;
        console.log(`❌ Table ${table.name} check failed:`, error);
      }
    }

    if (missingTables > 0) {
      console.log(`⚠️ ${missingTables}/${tableChecks.length} tables missing. Auto-migration recommended.`);
      
      // Show option to auto-migrate
      toast.info('Database Setup Required', {
        description: `${missingTables} critical tables are missing. Click to setup automatically.`,
        duration: 15000,
        action: {
          label: 'Setup Now',
          onClick: () => executeMigrationNow()
        }
      });
    } else {
      console.log('✅ All critical tables exist. No migration needed.');
    }
  } catch (error) {
    console.error('Auto-migration check failed:', error);
  }
}

// Export for global use
if (typeof window !== 'undefined') {
  (window as any).executeMigrationNow = executeMigrationNow;
  (window as any).autoMigrateIfNeeded = autoMigrateIfNeeded;
}
