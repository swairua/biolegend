import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  CheckCircle, 
  Database, 
  Play, 
  RefreshCw,
  AlertCircle,
  Info,
  Bug,
  Wrench
} from 'lucide-react';
import { 
  setupProformaFunctionImproved,
  checkFunctionExistsImproved,
  testFunctionImproved,
  autoFixImproved
} from '@/utils/improvedProformaFix';
import { ImprovedAutoFixButton } from '@/components/fixes/ImprovedAutoFixButton';
import { toast } from 'sonner';

interface DiagnosticResult {
  test: string;
  status: 'running' | 'success' | 'warning' | 'error' | 'pending';
  message: string;
  details?: any;
  timestamp: Date;
}

export const ProformaErrorDiagnostic = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    success: number;
    warnings: number;
    errors: number;
    overallStatus: 'healthy' | 'issues' | 'critical';
  } | null>(null);

  const addResult = (result: Omit<DiagnosticResult, 'timestamp'>) => {
    setResults(prev => [...prev, { ...result, timestamp: new Date() }]);
  };

  const updateResult = (testName: string, updates: Partial<DiagnosticResult>) => {
    setResults(prev => prev.map(result => 
      result.test === testName 
        ? { ...result, ...updates, timestamp: new Date() }
        : result
    ));
  };

  const clearResults = () => {
    setResults([]);
    setSummary(null);
  };

  const runComprehensiveDiagnostic = async () => {
    setIsRunning(true);
    clearResults();

    try {
      // Test 1: Basic connectivity
      addResult({
        test: 'Database Connectivity',
        status: 'running',
        message: 'Testing database connection...'
      });

      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .limit(1);

        if (error) {
          updateResult('Database Connectivity', {
            status: 'error',
            message: `Database connection failed: ${error.message}`,
            details: error
          });
        } else {
          updateResult('Database Connectivity', {
            status: 'success',
            message: 'Database connection successful'
          });
        }
      } catch (error) {
        updateResult('Database Connectivity', {
          status: 'error',
          message: `Connection error: ${error instanceof Error ? error.message : String(error)}`,
          details: error
        });
      }

      // Test 2: Function existence check
      addResult({
        test: 'Function Existence Check',
        status: 'running',
        message: 'Checking if generate_proforma_number function exists...'
      });

      const functionCheck = await checkFunctionExistsImproved();
      
      updateResult('Function Existence Check', {
        status: functionCheck.exists ? 'success' : 'warning',
        message: functionCheck.exists 
          ? 'Function exists in database'
          : `Function does not exist: ${functionCheck.error || 'Not found'}`,
        details: functionCheck.details
      });

      // Test 3: Function testing (if it exists)
      if (functionCheck.exists) {
        addResult({
          test: 'Function Testing',
          status: 'running',
          message: 'Testing function with sample data...'
        });

        const functionTest = await testFunctionImproved();
        
        updateResult('Function Testing', {
          status: functionTest.success ? 'success' : 'error',
          message: functionTest.success 
            ? `Function works correctly. Generated: ${functionTest.result}`
            : `Function test failed: ${functionTest.error}`,
          details: functionTest.details
        });
      } else {
        addResult({
          test: 'Function Testing',
          status: 'pending',
          message: 'Skipped - function does not exist'
        });
      }

      // Test 4: Complete setup process
      addResult({
        test: 'Complete Setup Process',
        status: 'running',
        message: 'Running complete function setup...'
      });

      const setupResult = await setupProformaFunctionImproved();
      
      updateResult('Complete Setup Process', {
        status: setupResult.success ? 'success' : 'error',
        message: setupResult.success 
          ? `Setup completed successfully. Test result: ${setupResult.testResult}`
          : `Setup failed. Errors: ${setupResult.errors?.join(', ') || 'Unknown errors'}`,
        details: {
          steps: setupResult.steps,
          functionCreated: setupResult.functionCreated,
          errors: setupResult.errors
        }
      });

      // Test 5: Auto-fix capabilities
      addResult({
        test: 'Auto-Fix Capabilities',
        status: 'running',
        message: 'Testing auto-fix system...'
      });

      const autoFixResult = await autoFixImproved();
      
      updateResult('Auto-Fix Capabilities', {
        status: autoFixResult.success ? 'success' : 'warning',
        message: autoFixResult.success 
          ? `Auto-fix successful. Generated: ${autoFixResult.number}`
          : `Auto-fix used fallback. Number: ${autoFixResult.number}. Error: ${autoFixResult.error}`,
        details: autoFixResult
      });

      // Calculate summary
      const finalResults = results.filter(r => r.status !== 'running');
      const successCount = finalResults.filter(r => r.status === 'success').length;
      const warningCount = finalResults.filter(r => r.status === 'warning').length;
      const errorCount = finalResults.filter(r => r.status === 'error').length;
      
      let overallStatus: 'healthy' | 'issues' | 'critical';
      if (errorCount > 2) {
        overallStatus = 'critical';
      } else if (errorCount > 0 || warningCount > 1) {
        overallStatus = 'issues';
      } else {
        overallStatus = 'healthy';
      }

      setSummary({
        total: finalResults.length,
        success: successCount,
        warnings: warningCount,
        errors: errorCount,
        overallStatus
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addResult({
        test: 'Diagnostic Process',
        status: 'error',
        message: `Diagnostic failed: ${errorMessage}`,
        details: error
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Info className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    const variants = {
      success: 'default',
      warning: 'secondary',
      error: 'destructive',
      running: 'outline',
      pending: 'outline'
    } as const;

    return (
      <Badge variant={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  // Auto-run diagnostic on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      runComprehensiveDiagnostic();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Proforma Error Diagnostic
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error Being Diagnosed:</strong> "All function creation methods failed: [object Object]"
              <br />
              This diagnostic will check database connectivity, function existence, and test all fix methods.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={runComprehensiveDiagnostic} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'Running Diagnostic...' : 'Run Full Diagnostic'}
            </Button>
            
            <Button 
              onClick={clearResults} 
              variant="outline"
              disabled={isRunning}
            >
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Diagnostic Summary</span>
              <Badge 
                variant={
                  summary.overallStatus === 'healthy' ? 'default' :
                  summary.overallStatus === 'issues' ? 'secondary' : 'destructive'
                }
              >
                {summary.overallStatus.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-muted-foreground">Total Tests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.success}</div>
                <div className="text-muted-foreground">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{summary.warnings}</div>
                <div className="text-muted-foreground">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.errors}</div>
                <div className="text-muted-foreground">Errors</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-Fix Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Automated Fix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Try the improved auto-fix system that handles the "[object Object]" error properly.
            </AlertDescription>
          </Alert>
          
          <div className="mt-4">
            <ImprovedAutoFixButton
              showDetails={true}
              onSuccess={(number) => {
                toast.success(`Fix successful! Generated: ${number}`);
                // Re-run diagnostic to verify
                setTimeout(() => runComprehensiveDiagnostic(), 2000);
              }}
              onError={(error) => {
                toast.error(`Fix failed: ${error}`);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Diagnostic Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <div>
                        <div className="font-medium">{result.test}</div>
                        <div className="text-sm text-muted-foreground">{result.message}</div>
                        <div className="text-xs text-muted-foreground">
                          {result.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(result.status)}
                  </div>
                  
                  {result.details && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                        Show technical details
                      </summary>
                      <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                  
                  {index < results.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
