import { useEffect, useState } from 'react';
import { runBasicProductCategorySetup } from '@/utils/basicProductCategorySetup';
import { ManualMigrationInstructions } from './ManualMigrationInstructions';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export function AutoProductCategoryMigration() {
  const [migrationStatus, setMigrationStatus] = useState<'pending' | 'running' | 'success' | 'error'>('pending');
  const [migrationResult, setMigrationResult] = useState<any>(null);

  useEffect(() => {
    const runMigration = async () => {
      console.log('🚀 AUTO-RUNNING Product Category Migration...');
      setMigrationStatus('running');
      
      try {
        const result = await runBasicProductCategorySetup();
        setMigrationResult(result);
        
        if (result.success) {
          setMigrationStatus('success');
          toast.success('Product category migration completed successfully!');
          console.log('✅ AUTO-MIGRATION SUCCESS:', result);
        } else {
          setMigrationStatus('error');
          toast.error(`Migration failed: ${result.message}`);
          console.error('❌ AUTO-MIGRATION FAILED:', result);
        }
      } catch (error) {
        setMigrationStatus('error');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Migration error: ${errorMessage}`);
        console.error('❌ AUTO-MIGRATION ERROR:', error);
      }
    };

    // Run migration after a short delay to ensure everything is loaded
    const timer = setTimeout(runMigration, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (migrationStatus === 'pending') {
    return null; // Don't show anything while waiting
  }

  return (
    <div className="mb-4">
      {migrationStatus === 'running' && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Running product category migration... Please wait.
          </AlertDescription>
        </Alert>
      )}
      
      {migrationStatus === 'success' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            ✅ Product category migration completed successfully! 
            {migrationResult?.details && (
              <div className="mt-2 text-sm">
                • Categories table: {migrationResult.details.productCategoriesTableCreated ? 'Created' : 'Already exists'}
                • Categories added: {migrationResult.details.categoriesInserted || 0}
                • Database ready for product operations
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {migrationStatus === 'error' && (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ❌ Auto-migration failed: {migrationResult?.message || 'Unknown error'}
            </AlertDescription>
          </Alert>
          <ManualMigrationInstructions />
        </div>
      )}
    </div>
  );
}
