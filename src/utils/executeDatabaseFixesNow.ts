import { runDatabaseFixes } from './runDatabaseFixes';
import { toast } from 'sonner';

/**
 * Execute database fixes immediately
 * This function can be called directly from components or console
 */
export async function executeDatabaseFixesNow(): Promise<boolean> {
  console.log('🚀 Executing database fixes now...');
  
  try {
    const result = await runDatabaseFixes();
    
    if (result.success) {
      console.log('✅ Database fixes completed successfully!');
      toast.success('Database fixes completed!', {
        description: 'All missing columns and tables have been added.'
      });
      return true;
    } else {
      console.error('❌ Database fixes failed:', result.error);
      toast.error('Database fixes failed', {
        description: result.error || 'Manual execution may be required.'
      });
      return false;
    }
  } catch (error: any) {
    console.error('❌ Error executing database fixes:', error);
    toast.error('Execution error', {
      description: error.message
    });
    return false;
  }
}

// Auto-execute if called directly
if (typeof window !== 'undefined') {
  (window as any).executeDatabaseFixesNow = executeDatabaseFixesNow;
  console.log('💡 You can run database fixes by calling: executeDatabaseFixesNow()');
}
