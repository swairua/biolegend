import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInvoices, useCompanies } from '@/hooks/useDatabase';
import { parseErrorMessage } from '@/utils/errorHelpers';
import { toast } from 'sonner';

export function InvoiceErrorTest() {
  const [testResult, setTestResult] = useState<string>('');
  
  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];
  const { data: invoices, isLoading, error, refetch } = useInvoices(currentCompany?.id);

  const runErrorTest = () => {
    if (error) {
      // Test error display
      const rawError = String(error);
      const parsedError = parseErrorMessage(error);
      
      setTestResult(`
Raw error: ${rawError}
Parsed error: ${parsedError}
Error type: ${typeof error}
      `);
      
      // Test toast with parsed error
      toast.error(`Invoice Error (Parsed): ${parsedError}`);
      
      // This would cause [object Object] - DON'T do this:
      // toast.error(`Invoice Error (Raw): ${error}`);
    } else {
      setTestResult('No error detected. Invoice hook is working fine.');
      toast.success('No invoice errors detected');
    }
  };

  const forceError = () => {
    // Force refetch with invalid company ID to trigger an error
    refetch();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Error Handling Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Button onClick={runErrorTest} variant="outline">
            Test Error Display
          </Button>
          <Button onClick={forceError} variant="outline">
            Force Refetch
          </Button>
        </div>

        {isLoading && <p>Loading invoices...</p>}
        
        {error && (
          <div className="p-4 border border-destructive/50 bg-destructive-light rounded">
            <h4 className="font-medium text-destructive">Error Detected:</h4>
            <p className="text-sm text-destructive-foreground mt-1">
              {parseErrorMessage(error)}
            </p>
          </div>
        )}

        {invoices && (
          <div className="p-4 border border-success/50 bg-success-light rounded">
            <h4 className="font-medium text-success">Success:</h4>
            <p className="text-sm text-success-foreground mt-1">
              Loaded {invoices.length} invoices successfully
            </p>
          </div>
        )}

        {testResult && (
          <div className="p-4 border rounded bg-muted">
            <h4 className="font-medium">Test Result:</h4>
            <pre className="text-xs mt-2 whitespace-pre-wrap">{testResult}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
