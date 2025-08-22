import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Database, Play, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { executeForcedMigrations, checkMigrationsNeeded } from '@/utils/executeForcedMigrations';

export function MigrationExecutor() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [checkResult, setCheckResult] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  const handleCheckMigrations = async () => {
    setIsChecking(true);
    setCheckResult(null);

    try {
      const result = await checkMigrationsNeeded();
      setCheckResult(result);
      
      if (result.needed) {
        toast.warning(`${result.issues.length} migration issues found`);
      } else {
        toast.success('All migrations up to date!');
      }
    } catch (error) {
      console.error('Check failed:', error);
      toast.error('Failed to check migration status');
    } finally {
      setIsChecking(false);
    }
  };

  const handleExecuteMigrations = async () => {
    setIsExecuting(true);
    setMigrationStatus(null);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const result = await executeForcedMigrations();
      
      clearInterval(progressInterval);
      setProgress(100);
      setMigrationStatus(result);

      if (result.success && result.remainingIssues.length === 0) {
        toast.success('All migrations completed successfully!');
        // Refresh the page to reflect changes
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (result.success) {
        toast.warning('Migrations completed but some issues remain');
      } else {
        toast.error('Some migrations failed');
      }
    } catch (error) {
      console.error('Migration execution failed:', error);
      toast.error('Migration execution failed. Check console for details.');
      setMigrationStatus({
        success: false,
        migrationResults: [{ 
          step: 'Migration Execution', 
          success: false, 
          message: error instanceof Error ? error.message : 'Unknown error' 
        }]
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Purchase Order Migration Center
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-3">
          <Button
            onClick={handleCheckMigrations}
            disabled={isExecuting || isChecking}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Check Migration Status'}
          </Button>

          {checkResult?.needed && (
            <Button
              onClick={handleExecuteMigrations}
              disabled={isExecuting || isChecking}
            >
              <Play className="h-4 w-4 mr-2" />
              {isExecuting ? 'Executing...' : 'Run All Migrations'}
            </Button>
          )}
        </div>

        {/* Migration Progress */}
        {isExecuting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Migration Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Check Results */}
        {checkResult && (
          <Alert variant={checkResult.needed ? "destructive" : "default"}>
            {checkResult.needed ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {checkResult.needed ? (
                <div>
                  <strong>Migrations Required:</strong>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {checkResult.issues.map((issue: string, index: number) => (
                      <li key={index} className="text-sm">{issue}</li>
                    ))}
                  </ul>
                  <div className="mt-3 flex gap-4 text-sm">
                    <span>LPO System: {checkResult.lpoReady ? '✅ Ready' : '❌ Needs Setup'}</span>
                    <span>Tax System: {checkResult.taxReady ? '✅ Ready' : '❌ Needs Setup'}</span>
                  </div>
                </div>
              ) : (
                <strong>✅ All systems ready! No migrations needed.</strong>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Migration Results */}
        {migrationStatus && (
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Migration Results</h3>
            
            <div className="grid gap-3">
              {migrationStatus.migrationResults?.map((result: any, index: number) => (
                <Alert key={index} variant={result.success ? "default" : "destructive"}>
                  {result.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <strong>{result.step}:</strong> {result.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Migration Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>Total Steps: {migrationStatus.totalSteps}</div>
                <div>Successful: {migrationStatus.successfulSteps}</div>
                <div>Failed: {migrationStatus.failedSteps}</div>
                <div>Issues Resolved: {migrationStatus.criticalIssuesResolved}</div>
              </div>
              
              {migrationStatus.remainingIssues?.length > 0 && (
                <div className="mt-3">
                  <strong>Remaining Issues:</strong>
                  <ul className="list-disc list-inside text-sm mt-1">
                    {migrationStatus.remainingIssues.map((issue: string, index: number) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {migrationStatus.success && migrationStatus.remainingIssues?.length === 0 && (
                <Alert className="mt-3">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    🎉 <strong>Migration Complete!</strong> Your purchase order system is now fully operational.
                    The page will refresh automatically to load the updated interface.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
