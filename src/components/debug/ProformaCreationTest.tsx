import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  Database,
  FileText,
  Bug,
  Zap
} from 'lucide-react';
import { useCreateProforma, type ProformaItem, type ProformaInvoice } from '@/hooks/useProforma';
import { autoFixImproved } from '@/utils/improvedProformaFix';
import { calculateDocumentTotals, type TaxableItem } from '@/utils/taxCalculation';
import { ProformaErrorSolution } from '@/components/fixes/ProformaErrorSolution';
import { toast } from 'sonner';

export const ProformaCreationTest = () => {
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'success' | 'error' | 'running';
    message: string;
    details?: any;
  }>>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [createError, setCreateError] = useState<string>('');

  const createProforma = useCreateProforma();

  const addResult = (result: { test: string; status: 'success' | 'error' | 'running'; message: string; details?: any }) => {
    setTestResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setTestResults([]);
    setCreateError('');
  };

  const testProformaNumberGeneration = async () => {
    addResult({ test: 'Proforma Number Generation', status: 'running', message: 'Testing number generation...' });
    
    try {
      const result = await autoFixImproved();
      
      if (result.success) {
        addResult({ 
          test: 'Proforma Number Generation', 
          status: 'success', 
          message: `Generated: ${result.number}`,
          details: result
        });
        return result.number;
      } else {
        addResult({ 
          test: 'Proforma Number Generation', 
          status: 'error', 
          message: `Failed: ${result.error}. Using fallback: ${result.number}`,
          details: result
        });
        return result.number;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addResult({ 
        test: 'Proforma Number Generation', 
        status: 'error', 
        message: `Error: ${errorMessage}`,
        details: error
      });
      return `PF-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    }
  };

  const testProformaCreation = async (proformaNumber: string) => {
    addResult({ test: 'Proforma Creation', status: 'running', message: 'Creating test proforma...' });
    
    try {
      // Create test data
      const testItems: ProformaItem[] = [
        {
          id: 'test-1',
          product_id: '550e8400-e29b-41d4-a716-446655440001',
          product_name: 'Test Product 1',
          description: 'Test description 1',
          quantity: 2,
          unit_price: 100,
          discount_percentage: 0,
          discount_amount: 0,
          tax_percentage: 18,
          tax_amount: 36,
          tax_inclusive: true,
          line_total: 236,
        },
        {
          id: 'test-2', 
          product_id: '550e8400-e29b-41d4-a716-446655440002',
          product_name: 'Test Product 2',
          description: 'Test description 2',
          quantity: 1,
          unit_price: 50,
          discount_percentage: 10,
          discount_amount: 5,
          tax_percentage: 18,
          tax_amount: 8.1,
          tax_inclusive: true,
          line_total: 53.1,
        }
      ];

      // Calculate totals
      const taxableItems: TaxableItem[] = testItems.map(item => ({
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_percentage: item.tax_percentage,
        tax_inclusive: item.tax_inclusive,
        discount_percentage: item.discount_percentage,
        discount_amount: item.discount_amount,
      }));

      const totals = calculateDocumentTotals(taxableItems);

      const proformaData: ProformaInvoice = {
        company_id: '550e8400-e29b-41d4-a716-446655440000',
        customer_id: '550e8400-e29b-41d4-a716-446655440010',
        proforma_number: proformaNumber,
        proforma_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        subtotal: totals.subtotal,
        tax_amount: totals.tax_total,
        total_amount: totals.total_amount,
        notes: 'Test proforma created by diagnostic tool',
        terms_and_conditions: 'Test terms and conditions',
      };

      await createProforma.mutateAsync({
        proforma: proformaData,
        items: testItems
      });

      addResult({ 
        test: 'Proforma Creation', 
        status: 'success', 
        message: `Successfully created proforma: ${proformaNumber}`,
        details: { proforma: proformaData, items: testItems, totals }
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addResult({ 
        test: 'Proforma Creation', 
        status: 'error', 
        message: `Failed: ${errorMessage}`,
        details: error
      });
      
      setCreateError(errorMessage);
      return false;
    }
  };

  const runFullTest = async () => {
    setIsRunning(true);
    clearResults();

    try {
      addResult({ test: 'Full Test', status: 'running', message: 'Starting comprehensive proforma test...' });

      // Step 1: Test number generation
      const proformaNumber = await testProformaNumberGeneration();

      // Step 2: Test proforma creation
      const creationSuccess = await testProformaCreation(proformaNumber);

      // Final result
      if (creationSuccess) {
        addResult({ 
          test: 'Full Test', 
          status: 'success', 
          message: 'All tests passed! Proforma creation is working correctly.'
        });
        toast.success('Proforma creation test completed successfully!');
      } else {
        addResult({ 
          test: 'Full Test', 
          status: 'error', 
          message: 'Proforma creation failed. Check error details above.'
        });
        toast.error('Proforma creation test failed. Check the diagnostic results.');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addResult({ 
        test: 'Full Test', 
        status: 'error', 
        message: `Test process failed: ${errorMessage}`,
        details: error
      });
      toast.error('Test process failed unexpectedly');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'default',
      error: 'destructive',
      running: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Proforma Creation Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <strong>Purpose:</strong> Test the complete proforma creation flow to identify and fix any "[object Object]" errors.
              This will test number generation, database operations, and error handling.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={runFullTest} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'Running Test...' : 'Run Full Test'}
            </Button>
            
            <Button 
              onClick={testProformaNumberGeneration} 
              variant="outline"
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Test Number Generation
            </Button>
            
            <Button 
              onClick={clearResults} 
              variant="ghost"
              disabled={isRunning}
            >
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Solution */}
      {createError && (
        <ProformaErrorSolution 
          error={createError}
          onResolved={() => setCreateError('')}
        />
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.test}</span>
                    </div>
                    {getStatusBadge(result.status)}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
                  
                  {result.details && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Show technical details
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-40">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Test Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Full Test:</strong> Runs complete proforma creation flow including number generation and database operations.
            </div>
            <div>
              <strong>Number Generation Test:</strong> Only tests the proforma number generation function.
            </div>
            <div>
              <strong>Expected Results:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Number generation should return a valid proforma number (PF-YYYY-NNNN format)</li>
                <li>Proforma creation should succeed without "[object Object]" errors</li>
                <li>Any errors should show clear, readable error messages</li>
                <li>Auto-fix mechanisms should activate if database functions are missing</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
