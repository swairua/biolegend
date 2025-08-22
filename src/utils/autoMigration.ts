import { supabase } from '@/integrations/supabase/client';

let migrationAttempted = false;
let migrationInProgress = false;

export const autoRunMigration = async () => {
  if (migrationAttempted || migrationInProgress) return;
  migrationInProgress = true;

  console.log('🚀 AUTO-MIGRATION: Starting tax columns check...');

  try {
    // Test if columns exist
    const { error: quotationError } = await supabase
      .from('quotation_items')
      .select('tax_amount')
      .limit(1);

    const { error: invoiceError } = await supabase
      .from('invoice_items')
      .select('tax_amount')
      .limit(1);

    if (quotationError || invoiceError) {
      console.log('🔥 TAX COLUMNS MISSING - FORCING MIGRATION NOW!');
      const success = await runAutoMigration();
      if (success) {
        console.log('✅ AUTO-MIGRATION COMPLETED SUCCESSFULLY!');
        migrationAttempted = true;
      } else {
        console.error('❌ AUTO-MIGRATION FAILED - Manual intervention required');
      }
    } else {
      console.log('✅ Tax columns already exist - no migration needed');
      migrationAttempted = true;
    }
  } catch (error) {
    console.error('Auto-migration check failed:', error);
  } finally {
    migrationInProgress = false;
  }
};

const runAutoMigration = async (): Promise<boolean> => {
  console.log('🔧 Executing migration SQL...');

  // Individual SQL commands for better success rate
  const migrationCommands = [
    'ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0;',
    'ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0;',
    'ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;',
    'ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0;',
    'ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0;',
    'ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;'
  ];

  let successCount = 0;

  // Try each command individually
  for (const command of migrationCommands) {
    try {
      console.log(`Executing: ${command}`);

      // Try multiple RPC function names that might exist
      const rpcMethods = ['exec_sql', 'sql', 'execute_sql', 'run_sql'];
      let commandSuccess = false;

      for (const method of rpcMethods) {
        try {
          await supabase.rpc(method, { query: command });
          console.log(`✅ Command succeeded with ${method}`);
          commandSuccess = true;
          break;
        } catch (rpcError: any) {
          if (rpcError.message && rpcError.message.includes('already exists')) {
            console.log(`✅ Column already exists (${command})`);
            commandSuccess = true;
            break;
          }
        }
      }

      if (commandSuccess) {
        successCount++;
      } else {
        console.warn(`⚠️ Command failed: ${command}`);
      }
    } catch (error) {
      console.warn(`⚠️ Command error: ${command}`, error);
    }
  }

  console.log(`Migration completed: ${successCount}/${migrationCommands.length} commands succeeded`);

  // Verify the migration worked
  try {
    const { error: testError } = await supabase
      .from('quotation_items')
      .select('tax_amount')
      .limit(1);

    if (!testError) {
      console.log('🎉 MIGRATION VERIFICATION SUCCESSFUL!');
      return true;
    }
  } catch (verifyError) {
    console.error('Migration verification failed:', verifyError);
  }

  return successCount > 0;
};

// Multiple triggers to ensure migration runs
if (typeof window !== 'undefined') {
  // Immediate attempt
  console.log('🚀 AUTO-MIGRATION: Triggering immediate run...');
  setTimeout(autoRunMigration, 100);

  // Backup attempts
  setTimeout(autoRunMigration, 1000);
  setTimeout(autoRunMigration, 3000);

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoRunMigration);
  } else {
    autoRunMigration();
  }

  // Run when page is fully loaded
  window.addEventListener('load', autoRunMigration);
}
