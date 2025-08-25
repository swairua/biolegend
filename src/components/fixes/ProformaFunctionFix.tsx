import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  CheckCircle, 
  Copy, 
  Database, 
  Play,
  ExternalLink,
  Code
} from 'lucide-react';
import { setupProformaFunction } from '@/utils/createProformaFunction';
import { useGenerateProformaNumber } from '@/hooks/useProforma';
import { toast } from 'sonner';

interface FixResult {
  step: string;
  success: boolean;
  message: string;
  details?: any;
}

export const ProformaFunctionFix = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<FixResult[]>([]);
  const [showManualSQL, setShowManualSQL] = useState(false);
  const [generatedNumber, setGeneratedNumber] = useState<string>('');
  
  const generateProformaNumber = useGenerateProformaNumber();
  const companyId = '550e8400-e29b-41d4-a716-446655440000';

  // Manual SQL script for creating the function
  const manualSQL = `-- Create the generate_proforma_number function
-- Copy and paste this into your Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.generate_proforma_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_part TEXT;
    proforma_number TEXT;
BEGIN
    -- Get current year
    year_part := EXTRACT(year FROM CURRENT_DATE)::TEXT;
    
    -- Get the next number for this year and company
    SELECT COALESCE(MAX(
        CASE 
            WHEN proforma_number ~ ('^PF-' || year_part || '-[0-9]+$') 
            THEN CAST(SPLIT_PART(proforma_number, '-', 3) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO next_number
    FROM proforma_invoices 
    WHERE company_id = company_uuid
    AND proforma_number LIKE 'PF-' || year_part || '-%';
    
    -- If no records found, start with 1
    IF NOT FOUND THEN
        next_number := 1;
    END IF;
    
    -- Format as PF-YYYY-NNNN
    proforma_number := 'PF-' || year_part || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN proforma_number;
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback: return a timestamp-based number if anything fails
        RETURN 'PF-' || year_part || '-' || LPAD(EXTRACT(epoch FROM CURRENT_TIMESTAMP)::TEXT, 10, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_proforma_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_proforma_number(UUID) TO anon;

-- Test the function
SELECT public.generate_proforma_number('550e8400-e29b-41d4-a716-446655440000'::UUID);`;

  const addResult = (result: FixResult) => {
    setResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setResults([]);
    setGeneratedNumber('');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('SQL copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const runAutomaticFix = async () => {
    setIsRunning(true);
    clearResults();

    try {
      addResult({ 
        step: 'Starting automatic fix', 
        success: true, 
        message: 'Initializing proforma function setup...' 
      });

      const setupResult = await setupProformaFunction();
      
      // Add results for each step
      setupResult.steps.forEach(step => {
        addResult({
          step: step.step,
          success: step.success,
          message: step.error || 'Completed successfully',
          details: step.details
        });
      });

      if (setupResult.success) {
        addResult({ 
          step: 'Overall result', 
          success: true, 
          message: `Function setup completed! ${setupResult.functionCreated ? 'Function was created.' : 'Function already existed.'} Test result: ${setupResult.testResult}` 
        });
        
        if (setupResult.testResult) {
          setGeneratedNumber(setupResult.testResult);
        }
        
        toast.success('Proforma function fix completed successfully!');
      } else {
        addResult({ 
          step: 'Overall result', 
          success: false, 
          message: 'Automatic fix failed. Manual intervention required.' 
        });
        
        setShowManualSQL(true);
        toast.warning('Automatic fix failed. Please use the manual SQL script.');
      }

    } catch (error) {
      addResult({ 
        step: 'Fix process error', 
        success: false, 
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error 
      });
      
      setShowManualSQL(true);
      toast.error('Fix process failed. Please use manual SQL script.');
    } finally {
      setIsRunning(false);
    }
  };

  const testFunction = async () => {
    try {
      generateProformaNumber.mutate(companyId, {
        onSuccess: (number) => {
          setGeneratedNumber(number);
          addResult({ 
            step: 'Function test', 
            success: true, 
            message: `Function test successful: ${number}` 
          });
          toast.success(`Function works! Generated: ${number}`);
        },
        onError: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          addResult({ 
            step: 'Function test', 
            success: false, 
            message: `Function test failed: ${errorMessage}` 
          });
          toast.error('Function test failed');
          setShowManualSQL(true);
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addResult({ 
        step: 'Function test', 
        success: false, 
        message: `Test error: ${errorMessage}` 
      });
      toast.error('Could not test function');
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (success: boolean) => {
    return <Badge variant={success ? "default" : "destructive"}>
      {success ? "SUCCESS" : "FAILED"}
    </Badge>;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Proforma Function Fix
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> Could not find the function public.generate_proforma_number(company_uuid) in the schema cache. 
              This function is required for generating proforma invoice numbers.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={runAutomaticFix} disabled={isRunning} className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              {isRunning ? 'Running Fix...' : 'Run Automatic Fix'}
            </Button>
            
            <Button onClick={testFunction} variant="outline" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Test Function
            </Button>
            
            <Button onClick={() => setShowManualSQL(!showManualSQL)} variant="outline" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              {showManualSQL ? 'Hide' : 'Show'} Manual SQL
            </Button>
            
            <Button onClick={clearResults} variant="ghost" disabled={isRunning}>
              Clear Results
            </Button>
          </div>

          {generatedNumber && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Success!</strong> Function is working. Generated proforma number: 
                <code className="bg-green-100 px-2 py-1 rounded ml-2">{generatedNumber}</code>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Manual SQL Script */}
      {showManualSQL && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Manual SQL Fix
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <ExternalLink className="h-4 w-4" />
              <AlertDescription>
                If the automatic fix failed, copy the SQL below and execute it in your Supabase Dashboard → SQL Editor.
              </AlertDescription>
            </Alert>
            
            <div className="relative">
              <Textarea
                value={manualSQL}
                readOnly
                className="font-mono text-xs min-h-[400px] resize-none"
              />
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(manualSQL)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Steps:</h4>
              <ol className="list-decimal list-inside text-sm space-y-1">
                <li>Copy the SQL above</li>
                <li>Go to your Supabase Dashboard</li>
                <li>Navigate to SQL Editor</li>
                <li>Paste and run the SQL</li>
                <li>Come back and click "Test Function"</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fix Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.success)}
                      <span className="font-medium">{result.step}</span>
                    </div>
                    {getStatusBadge(result.success)}
                  </div>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  {result.details && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Show details
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
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
    </div>
  );
};
