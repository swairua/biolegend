import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { runProductCategoryMigration } from '@/utils/fixProductCategoryMigration';
import { Database, RefreshCw } from 'lucide-react';

export function ProductCategoryMigrationButton() {
  const [isRunning, setIsRunning] = useState(false);

  const handleRunMigration = async () => {
    setIsRunning(true);
    toast.info('Starting product category migration...');

    try {
      const result = await runProductCategoryMigration();
      
      if (result.success) {
        toast.success('Product category migration completed successfully!');
        console.log('Migration result:', result);
      } else {
        toast.error(`Migration failed: ${result.message}`);
        console.error('Migration failed:', result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Migration failed: ${errorMessage}`);
      console.error('Migration error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Database className="h-5 w-5" />
        <h3 className="font-semibold">Product Category Migration</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Run this migration to fix the product category column issue. This will create the product_categories table 
        and migrate any existing category data to use the normalized structure.
      </p>
      <Button 
        onClick={handleRunMigration} 
        disabled={isRunning}
        className="w-full"
      >
        {isRunning ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Running Migration...
          </>
        ) : (
          <>
            <Database className="h-4 w-4 mr-2" />
            Run Product Category Migration
          </>
        )}
      </Button>
    </div>
  );
}
