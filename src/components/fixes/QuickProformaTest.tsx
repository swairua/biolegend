import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  Database,
  Zap
} from 'lucide-react';
import { autoFixImproved } from '@/utils/improvedProformaFix';
import { ImprovedAutoFixButton } from './ImprovedAutoFixButton';
import { useGenerateProformaNumber } from '@/hooks/useProforma';
import { toast } from 'sonner';

export const QuickProformaTest = () => {
  const [testResult, setTestResult] = useState<{
    success: boolean;
    number?: string;
    error?: string;
    method?: string;
  } | null>(null);
  const [isTestingFunction, setIsTestingFunction] = useState(false);
  
  const generateProformaNumber = useGenerateProformaNumber();

  const testProformaFunction = async () => {
    setIsTestingFunction(true);
    setTestResult(null);

    try {
      generateProformaNumber.mutate('550e8400-e29b-41d4-a716-446655440000', {
        onSuccess: (number) => {
          setTestResult({
            success: true,
            number,
            method: 'direct'
          });
          toast.success(`Function works! Generated: ${number}`);
        },
        onError: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          setTestResult({
            success: false,
            error: errorMessage,
            method: 'direct'
          });
          toast.error('Function test failed');
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setTestResult({
        success: false,
        error: errorMessage,
        method: 'direct'
      });
      toast.error('Could not test function');
    } finally {
      setIsTestingFunction(false);
    }
  };

  const runQuickAutoFix = async () => {
    try {
      const result = await autoFixImproved();
      setTestResult({
        success: result.success,
        number: result.number,
        error: result.error,
        method: result.method
      });

      if (result.success) {
        toast.success(`Auto-fix successful! Generated: ${result.number}`);
      } else {
        toast.warning(`Auto-fix used fallback. Generated: ${result.number}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setTestResult({
        success: false,
        error: errorMessage,
        method: 'autofix'
      });
      toast.error('Auto-fix failed');
    }
  };

  const openDiagnostic = () => {
    window.open('/proforma-error-diagnostic', '_blank');
  };

  const openManualFix = () => {
    window.open('/proforma-function-fix', '_blank');
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Proforma Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick test buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={testProformaFunction}
            disabled={isTestingFunction}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Test Function
          </Button>
          
          <Button 
            onClick={runQuickAutoFix}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            Quick Auto-Fix
          </Button>
          
          <Button 
            onClick={openDiagnostic}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Full Diagnostic
          </Button>
          
          <Button 
            onClick={openManualFix}
            variant="ghost"
            className="flex items-center gap-2"
          >
            Manual Fix
          </Button>
        </div>

        {/* Improved Auto-Fix Button */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Improved Auto-Fix (Recommended)</h4>
          <ImprovedAutoFixButton
            showDetails={false}
            onSuccess={(number) => {
              setTestResult({
                success: true,
                number,
                method: 'improved'
              });
            }}
            onError={(error) => {
              setTestResult({
                success: false,
                error,
                method: 'improved'
              });
            }}
          />
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="border-t pt-4">
            <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className={testResult.success ? "text-green-800" : "text-red-800"}>
                      {testResult.success ? 'Test Successful' : 'Test Failed'}
                    </strong>
                    <Badge variant={testResult.success ? "default" : "destructive"}>
                      {testResult.method?.toUpperCase()}
                    </Badge>
                  </div>
                  
                  {testResult.number && (
                    <div>
                      <strong>Generated Number:</strong> 
                      <code className="ml-2 px-2 py-1 bg-white rounded border">{testResult.number}</code>
                    </div>
                  )}
                  
                  {testResult.error && (
                    <div className="text-sm">
                      <strong>Error:</strong> {testResult.error}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Help text */}
        <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
          <strong>Troubleshooting:</strong>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            <li>If "Test Function" works, your issue is resolved</li>
            <li>If it fails, try "Improved Auto-Fix" to create the function</li>
            <li>For persistent errors, use "Full Diagnostic" for detailed analysis</li>
            <li>For manual intervention, use "Manual Fix" with SQL scripts</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
