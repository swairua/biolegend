import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { runLPOMigrationSimple } from '@/utils/runLPOMigrationSimple';
import { debugSupabaseRPC } from '@/utils/debugSupabaseRPC';

export const ForceLPOMigrationButton = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isDebugging, setIsDebugging] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleRunMigration = async () => {
    setIsRunning(true);
    setResult(null);
    
    try {
      const migrationResult = await runLPOMigrationSimple();
      setResult(migrationResult);
      
      if (migrationResult.success) {
        toast.success('LPO tables created successfully! Please refresh the page.');
      } else {
        toast.error('Migration failed. Check console for details.');
      }
    } catch (error) {
      console.error('Error running migration:', error);
      setResult({
        success: false,
        message: `Migration error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      toast.error('Migration failed. Check console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleDebug = async () => {
    setIsDebugging(true);
    try {
      await debugSupabaseRPC();
      toast.success('Debug completed. Check browser console for details.');
    } catch (error) {
      console.error('Debug error:', error);
      toast.error('Debug failed. Check browser console.');
    } finally {
      setIsDebugging(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Database Setup Required:</strong> The LPO tables are missing from your database. 
          Click the button below to create the necessary tables (lpos, lpo_items) and functions.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Button
          onClick={handleRunMigration}
          disabled={isRunning || isDebugging}
          variant="default"
          size="lg"
          className="w-full"
        >
          <Database className="h-4 w-4 mr-2" />
          {isRunning ? 'Creating LPO Tables...' : 'Force Create LPO Tables'}
        </Button>

        <Button
          onClick={handleDebug}
          disabled={isRunning || isDebugging}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          {isDebugging ? 'Running Debug...' : 'Debug Database Connection'}
        </Button>
      </div>

      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          {result.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertDescription>
            {result.message}
            {result.success && (
              <div className="mt-2">
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  size="sm"
                >
                  Refresh Page
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
