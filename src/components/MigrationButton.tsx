import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { runTaxSettingsMigration, checkTaxSettingsStatus } from '@/utils/runMigration';
import { ManualMigrationInstructions } from '@/components/ManualMigrationInstructions';
import { Play, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function MigrationButton() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  const handleRunMigration = async () => {
    setIsRunning(true);
    setResult(null);
    
    try {
      // Check current status
      const status = await checkTaxSettingsStatus();
      
      if (status.tableExists && status.hasData) {
        setResult({
          success: true,
          message: `Tax settings already configured! Found ${status.taxSettingsCount} tax settings for ${status.companyCount} companies.`
        });
        
        toast.success('Tax settings are already properly configured!');
        
        // Refresh page to hide migration UI
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        
        return;
      }
      
      // Run the migration
      await runTaxSettingsMigration();
      
      setResult({
        success: true,
        message: 'Tax settings migration completed successfully! Default tax rates have been created.'
      });
      
      toast.success('Tax settings migration completed!');
      
      // Refresh page to show the tax settings
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Migration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Check if this is the expected table creation error
      if (errorMessage.includes('TABLE_CREATION_REQUIRED') || errorMessage.includes('does not exist')) {
        setResult({
          success: false,
          message: 'Automatic table creation failed. Please follow the manual steps below.'
        });

        setShowManualInstructions(true);
        toast.error('Automatic migration failed - manual steps required');
      } else {
        setResult({
          success: false,
          message: errorMessage
        });

        toast.error(`Migration failed: ${errorMessage}`);
      }
    } finally {
      setIsRunning(false);
    }
  };

  if (showManualInstructions) {
    return <ManualMigrationInstructions />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          onClick={handleRunMigration}
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isRunning ? 'Running Migration...' : 'Create Tax Settings Table'}
        </Button>

        {result && (
          <div className="flex items-center gap-2">
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
          </div>
        )}
      </div>

      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          <AlertDescription>
            {result.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="text-sm text-muted-foreground">
        <p>
          <strong>What this does:</strong> Attempts to create the tax_settings table automatically.
          If that fails, you'll see manual instructions.
        </p>
      </div>
    </div>
  );
}
