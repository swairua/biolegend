import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Database, 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Copy,
  ExternalLink,
  Play
} from 'lucide-react';
import { forceAllMigrations, type CompleteMigrationResult } from '@/utils/forceAllMigrations';
import { toast } from 'sonner';

export function ForceMigrationInterface() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<CompleteMigrationResult | null>(null);
  const [showSQL, setShowSQL] = useState(false);

  const executeForceMigration = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      console.log('🚀 Starting complete force migration...');
      toast.info('Starting complete database migration...');

      const migrationResult = await forceAllMigrations();
      setResult(migrationResult);

      if (migrationResult.success) {
        toast.success(`🎉 All ${migrationResult.tablesCreated.length} tables created successfully!`);
      } else if (migrationResult.needsManualSQL) {
        toast.warning('Manual SQL execution required. Check the details below.');
        setShowSQL(true);
      } else {
        toast.error('Migration failed. Check the error details.');
      }
    } catch (error) {
      console.error('Force migration error:', error);
      toast.error('Migration execution failed. Check console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  const copySQL = () => {
    if (result?.manualSQL) {
      navigator.clipboard.writeText(result.manualSQL);
      toast.success('Complete migration SQL copied to clipboard!');
    }
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard', '_blank');
    toast.info('Opening Supabase dashboard. Navigate to SQL Editor.');
  };

  const refreshPage = () => {
    toast.info('Refreshing page to load updated database...');
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Complete Database Migration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Alert */}
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Force Migration Tool</strong></p>
                <p>This will create ALL necessary database tables for the Biolegend Scientific application.</p>
                <p><strong>Tables to create:</strong> Companies, Profiles, Customers, Products, Quotations, Invoices, LPOs, Credit Notes, Stock Movements, and more.</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Execution Button */}
          {!isRunning && !result && (
            <div className="text-center">
              <Button 
                onClick={executeForceMigration}
                size="lg"
                className="w-full max-w-md"
              >
                <Zap className="h-5 w-5 mr-2" />
                Force Create All Tables
              </Button>
            </div>
          )}

          {/* Progress */}
          {isRunning && (
            <div className="space-y-4">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="font-medium">Creating database tables...</p>
                <p className="text-sm text-muted-foreground">This may take a moment</p>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
                <AlertDescription>
                  <div className="space-y-2">
                    <p className={result.success ? 'text-green-700' : 'text-yellow-700'}>
                      <strong>{result.message}</strong>
                    </p>
                    {result.tablesCreated.length > 0 && (
                      <p className="text-sm">
                        Tables created: {result.tablesCreated.length}
                      </p>
                    )}
                    {result.errors.length > 0 && (
                      <p className="text-sm text-red-600">
                        Errors: {result.errors.length}
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {/* Tables Created */}
              {result.tablesCreated.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-green-700">✅ Tables Created Successfully:</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.tablesCreated.map((table) => (
                      <Badge key={table} className="bg-green-100 text-green-800">
                        {table}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-red-700">❌ Errors:</h3>
                  <div className="space-y-1 text-sm text-red-600">
                    {result.errors.map((error, index) => (
                      <p key={index}>• {error}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual SQL Section */}
              {result.needsManualSQL && result.manualSQL && (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p><strong>Manual SQL Execution Required</strong></p>
                        <p>Some tables couldn't be created automatically. Please execute the SQL manually in Supabase.</p>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2">
                    <Button onClick={openSupabase} variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Supabase
                    </Button>
                    <Button onClick={copySQL} variant="outline">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy SQL
                    </Button>
                    <Button onClick={() => setShowSQL(!showSQL)} variant="outline">
                      {showSQL ? 'Hide SQL' : 'Show SQL'}
                    </Button>
                  </div>

                  {showSQL && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Complete Migration SQL:</h4>
                      <Textarea
                        value={result.manualSQL}
                        readOnly
                        className="font-mono text-xs h-64"
                        placeholder="Migration SQL will appear here..."
                      />
                      <div className="text-xs text-muted-foreground">
                        Copy this SQL and execute it in your Supabase SQL Editor
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Success Actions */}
              {result.success && (
                <div className="space-y-3">
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      <strong>🎉 Migration Complete!</strong><br />
                      All database tables have been created successfully. The application is now ready to use.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2 justify-center">
                    <Button onClick={refreshPage}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Application
                    </Button>
                  </div>
                </div>
              )}

              {/* Retry Options */}
              {!result.success && (
                <div className="flex gap-2 justify-center">
                  <Button onClick={executeForceMigration} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Migration
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Manual Instructions */}
          <div className="space-y-3">
            <h3 className="font-medium">Manual Migration Steps (if needed):</h3>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p>1. Click "Open Supabase" to access your dashboard</p>
              <p>2. Navigate to SQL Editor</p>
              <p>3. Click "Copy SQL" and paste the migration script</p>
              <p>4. Execute the SQL script</p>
              <p>5. Return here and click "Refresh Application"</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
