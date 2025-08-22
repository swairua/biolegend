import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, Database, RefreshCw, Copy, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { executeDirectMigrations, getManualMigrationSQL } from '@/utils/directTableMigration';


export function ForcedMigrationExecutor() {
  const [status, setStatus] = useState<'pending' | 'running' | 'success' | 'error' | 'manual-required'>('pending');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [results, setResults] = useState<string[]>([]);
  const [migrationResults, setMigrationResults] = useState<any[]>([]);
  const [showManualSQL, setShowManualSQL] = useState(false);

  const runMigrations = async () => {
    setStatus('running');
    setProgress(0);
    setErrors([]);
    setResults([]);
    setMigrationResults([]);

    try {
      setCurrentStep('Starting direct migration approach...');
      setProgress(10);

      console.log('🚀 Starting direct migrations (RPC-free approach)...');

      setCurrentStep('Executing database checks and migrations...');
      setProgress(30);

      // Execute direct migrations
      const migrationResult = await executeDirectMigrations();
      setMigrationResults(migrationResult.results);

      setProgress(80);
      setCurrentStep('Processing migration results...');

      // Process results
      const successfulSteps = migrationResult.results.filter(r => r.result.success);
      const failedSteps = migrationResult.results.filter(r => !r.result.success);

      // Update results display
      migrationResult.results.forEach(({ step, result }) => {
        if (result.success) {
          setResults(prev => [...prev, `✅ ${step} - SUCCESS: ${result.message}`]);
        } else {
          setResults(prev => [...prev, `❌ ${step} - FAILED: ${result.message}`]);
          setErrors(prev => [...prev, `${step}: ${result.message}`]);
        }
      });

      setProgress(100);

      // Determine final status
      if (successfulSteps.length === migrationResult.results.length) {
        setStatus('success');
        setCurrentStep('All migrations completed successfully!');
        toast.success('🎉 All database checks completed successfully!');
      } else if (successfulSteps.length > 0) {
        setStatus('manual-required');
        setCurrentStep('Some migrations require manual intervention');
        toast.warning('Some migrations need manual setup. See manual SQL option below.');
      } else {
        setStatus('error');
        setCurrentStep('Migrations failed - manual setup required');
        toast.error('Database setup requires manual SQL execution.');
      }

    } catch (error) {
      console.error('Migration process failed:', error);
      setStatus('error');
      setProgress(100);
      setCurrentStep('Migration process failed');
      setErrors(prev => [...prev, `Migration process error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      toast.error('Migration process failed. Manual setup may be required.');
    }
  };

  const copyManualSQL = () => {
    const sql = getManualMigrationSQL();
    navigator.clipboard.writeText(sql).then(() => {
      toast.success('SQL script copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy SQL script');
    });
  };

  useEffect(() => {
    // Auto-start migrations when component mounts
    runMigrations();
  }, []);

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Forcing Database Migrations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Migration Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
          {currentStep && (
            <p className="text-sm text-muted-foreground">{currentStep}</p>
          )}
        </div>

        {/* Status */}
        {status === 'running' && (
          <Alert>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertDescription>
              <strong>Migration in progress...</strong> Checking database tables and performing migrations without RPC dependencies.
            </AlertDescription>
          </Alert>
        )}

        {status === 'success' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>🎉 Success!</strong> All database checks completed successfully. Your system is ready to use!
            </AlertDescription>
          </Alert>
        )}

        {status === 'manual-required' && (
          <Alert className="border-warning bg-warning-light">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription>
              <strong>Manual Setup Required:</strong> Some database components need to be created manually via the Supabase dashboard.
              Use the SQL script below to complete the setup.
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Migration Issues:</strong> Database setup requires manual intervention.
              Use the manual SQL script below to complete the setup.
            </AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Migration Results:</h4>
            <div className="bg-muted p-3 rounded-lg space-y-1">
              {results.map((result, index) => (
                <div key={index} className="text-sm font-mono">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-destructive">Errors:</h4>
            <div className="bg-destructive/10 p-3 rounded-lg space-y-1">
              {errors.map((error, index) => (
                <div key={index} className="text-sm text-destructive">
                  {error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual SQL Script Section */}
        {(status === 'manual-required' || status === 'error') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Manual SQL Setup</h4>
              <div className="flex gap-2">
                <Button
                  onClick={copyManualSQL}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy SQL
                </Button>
                <Button
                  onClick={() => setShowManualSQL(!showManualSQL)}
                  variant="outline"
                  size="sm"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {showManualSQL ? 'Hide' : 'Show'} SQL
                </Button>
              </div>
            </div>

            <Alert className="border-info bg-info-light">
              <Database className="h-4 w-4 text-primary" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>To complete setup manually:</strong></p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary underline">Supabase Dashboard</a></li>
                    <li>Navigate to SQL Editor</li>
                    <li>Copy the SQL script below and execute it</li>
                    <li>Return here and click "Refresh Page" to verify setup</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>

            {showManualSQL && (
              <div className="space-y-2">
                <div className="bg-muted p-4 rounded-lg max-h-80 overflow-y-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {getManualMigrationSQL()}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        {(status === 'error' || status === 'manual-required') && (
          <div className="flex gap-2">
            <Button onClick={runMigrations} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Check
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Refresh Page
            </Button>
            <Button
              onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Supabase
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
