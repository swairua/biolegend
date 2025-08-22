import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { 
  Database, 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Copy,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { executeForcedDirectMigration, getCompleteMigrationSQL } from '@/utils/forcedDirectMigration';

export function DirectForceMigration() {
  const [status, setStatus] = useState<'ready' | 'running' | 'success' | 'failed' | 'manual'>('ready');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState<any>(null);
  const [showManualSQL, setShowManualSQL] = useState(false);

  const migrationSQL = getCompleteMigrationSQL();

  const executeForceMigration = async () => {
    setStatus('running');
    setProgress(10);
    setMessage('Attempting forced migration...');
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 15;
        });
      }, 300);

      const result = await executeForcedDirectMigration();
      
      clearInterval(progressInterval);
      setProgress(100);
      setDetails(result.details);

      if (result.success) {
        setStatus('success');
        setMessage(result.message);
        toast.success('🎉 Force migration completed successfully!');
        
        // Auto-refresh after successful migration
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else if (result.details?.needsManualSQL) {
        setStatus('manual');
        setMessage('Automatic migration not available. Manual SQL execution required.');
        setShowManualSQL(true);
        toast.warning('Manual SQL execution required');
      } else {
        setStatus('failed');
        setMessage(result.message);
        toast.error('Force migration failed');
      }
    } catch (error) {
      setProgress(100);
      setStatus('failed');
      setMessage(`Migration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Migration execution failed');
    }
  };

  const copySQL = () => {
    navigator.clipboard.writeText(migrationSQL);
    toast.success('Migration SQL copied to clipboard!');
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard', '_blank');
    toast.info('Opening Supabase dashboard. Navigate to your project and SQL Editor.');
  };

  useEffect(() => {
    // Auto-execute force migration when component mounts
    executeForceMigration();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Force Migration: LPO Tables & Tax Columns
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress */}
          {status === 'running' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Migration Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          )}

          {/* Status Messages */}
          {status === 'ready' && (
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                <strong>Ready to force migrate LPO tables</strong><br />
                This will attempt to create all necessary database tables and columns automatically.
              </AlertDescription>
            </Alert>
          )}

          {status === 'running' && (
            <Alert>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertDescription>
                <strong>Force migration in progress...</strong><br />
                Attempting multiple methods to execute SQL migration directly.
              </AlertDescription>
            </Alert>
          )}

          {status === 'success' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>🎉 Force Migration Successful!</strong><br />
                {message}<br />
                <span className="text-sm text-muted-foreground">
                  Page will refresh automatically in 3 seconds to load the updated interface.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {status === 'failed' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Force Migration Failed</strong><br />
                {message}
              </AlertDescription>
            </Alert>
          )}

          {status === 'manual' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Manual Migration Required</strong><br />
                {message} Please use the SQL provided below.
              </AlertDescription>
            </Alert>
          )}

          {/* Manual SQL Section */}
          {(showManualSQL || status === 'manual') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Manual Migration Steps:</h3>
                <div className="flex gap-2">
                  <Button onClick={openSupabase} variant="outline" size="sm">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open Supabase
                  </Button>
                  <Button onClick={copySQL} variant="outline" size="sm">
                    <Copy className="h-3 w-3 mr-1" />
                    Copy SQL
                  </Button>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-lg text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">1</span>
                  <span>Open your Supabase project dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">2</span>
                  <span>Navigate to SQL Editor</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">3</span>
                  <span>Copy and paste the SQL below, then run it</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">4</span>
                  <span>Return here and refresh the page</span>
                </div>
              </div>

              <Textarea
                value={migrationSQL}
                readOnly
                className="font-mono text-xs h-64"
                placeholder="Migration SQL will appear here..."
              />
            </div>
          )}

          {/* Retry Options */}
          {(status === 'failed' || status === 'manual') && (
            <div className="flex gap-2">
              <Button onClick={executeForceMigration} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Force Migration
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline">
                Refresh Page
              </Button>
            </div>
          )}

          {/* Technical Details */}
          {details && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium">Technical Details</summary>
              <div className="mt-2 bg-muted p-3 rounded text-xs">
                <pre>{JSON.stringify(details, null, 2)}</pre>
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
