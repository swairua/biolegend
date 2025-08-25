import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Database, 
  Settings,
  Play,
  RefreshCw
} from 'lucide-react';
import { useGenerateProformaNumber } from '@/hooks/useProforma';
import { checkProformaNumberFunction, createProformaNumberFunction } from '@/utils/databaseFunctionChecker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiagnosticResult {
  step: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

export const ProformaNumberDiagnostic = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [generatedNumber, setGeneratedNumber] = useState<string>('');
  
  const generateProformaNumber = useGenerateProformaNumber();
  const companyId = '550e8400-e29b-41d4-a716-446655440000'; // Default company ID

  const addResult = (result: DiagnosticResult) => {
    setResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setResults([]);
    setGeneratedNumber('');
  };

  const runDiagnostic = async () => {
    setIsRunning(true);
    clearResults();

    try {
      // Step 1: Check if proforma_invoices table exists
      addResult({ 
        step: 'Check proforma_invoices table', 
        status: 'info', 
        message: 'Checking if proforma_invoices table exists...' 
      });

      try {
        const { error: tableError } = await supabase
          .from('proforma_invoices')
          .select('id')
          .limit(1);

        if (tableError) {
          addResult({ 
            step: 'Check proforma_invoices table', 
            status: 'error', 
            message: 'proforma_invoices table not accessible',
            details: tableError.message
          });
        } else {
          addResult({ 
            step: 'Check proforma_invoices table', 
            status: 'success', 
            message: 'proforma_invoices table exists and is accessible' 
          });
        }
      } catch (error) {
        addResult({ 
          step: 'Check proforma_invoices table', 
          status: 'error', 
          message: 'Error checking table',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Step 2: Check if function exists
      addResult({ 
        step: 'Check function existence', 
        status: 'info', 
        message: 'Checking if generate_proforma_number function exists...' 
      });

      const functionCheck = await checkProformaNumberFunction();
      
      if (!functionCheck.exists) {
        addResult({ 
          step: 'Check function existence', 
          status: 'error', 
          message: 'generate_proforma_number function not found',
          details: functionCheck.error
        });

        // Step 3: Try to create the function
        addResult({ 
          step: 'Create function', 
          status: 'info', 
          message: 'Attempting to create generate_proforma_number function...' 
        });

        const createResult = await createProformaNumberFunction();
        if (createResult.success) {
          addResult({ 
            step: 'Create function', 
            status: 'success', 
            message: 'Function created successfully!' 
          });
        } else {
          addResult({ 
            step: 'Create function', 
            status: 'error', 
            message: 'Failed to create function',
            details: createResult.error
          });
        }
      } else {
        addResult({ 
          step: 'Check function existence', 
          status: functionCheck.canGenerate ? 'success' : 'warning', 
          message: functionCheck.canGenerate 
            ? 'Function exists and is callable' 
            : 'Function exists but may have issues',
          details: functionCheck.error
        });
      }

      // Step 4: Test direct function call
      addResult({ 
        step: 'Test direct function call', 
        status: 'info', 
        message: 'Testing direct RPC call to generate_proforma_number...' 
      });

      try {
        const { data: directResult, error: directError } = await supabase.rpc('generate_proforma_number', {
          company_uuid: companyId
        });

        if (directError) {
          addResult({ 
            step: 'Test direct function call', 
            status: 'error', 
            message: 'Direct RPC call failed',
            details: JSON.stringify(directError, null, 2)
          });
        } else {
          addResult({ 
            step: 'Test direct function call', 
            status: 'success', 
            message: `Direct RPC call successful: ${directResult}`,
            details: `Generated number: ${directResult}`
          });
        }
      } catch (error) {
        addResult({ 
          step: 'Test direct function call', 
          status: 'error', 
          message: 'Direct RPC call threw exception',
          details: error instanceof Error ? error.message : String(error)
        });
      }

      // Step 5: Test using the React hook
      addResult({ 
        step: 'Test React hook', 
        status: 'info', 
        message: 'Testing proforma number generation using React hook...' 
      });

      generateProformaNumber.mutate(companyId, {
        onSuccess: (number) => {
          setGeneratedNumber(number);
          addResult({ 
            step: 'Test React hook', 
            status: 'success', 
            message: `Hook call successful: ${number}`,
            details: `Generated via hook: ${number}`
          });
        },
        onError: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          addResult({ 
            step: 'Test React hook', 
            status: 'error', 
            message: 'Hook call failed',
            details: errorMessage
          });
        }
      });

    } catch (error) {
      addResult({ 
        step: 'Diagnostic error', 
        status: 'error', 
        message: 'Diagnostic process failed',
        details: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <RefreshCw className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    const variants = {
      success: 'default',
      error: 'destructive',
      warning: 'secondary', 
      info: 'outline'
    } as const;
    
    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Proforma Number Generation Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runDiagnostic} disabled={isRunning} className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            {isRunning ? 'Running Diagnostic...' : 'Run Diagnostic'}
          </Button>
          <Button onClick={clearResults} variant="outline" disabled={isRunning}>
            Clear Results
          </Button>
        </div>

        {generatedNumber && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Success!</strong> Generated proforma number: <code className="bg-green-100 px-2 py-1 rounded">{generatedNumber}</code>
            </AlertDescription>
          </Alert>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Diagnostic Results:</h3>
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.step}</span>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
                <p className="text-sm text-muted-foreground">{result.message}</p>
                {result.details && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Show details
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {result.details}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && !isRunning && (
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              Click "Run Diagnostic" to check the proforma number generation system and identify any issues.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
