import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle, 
  Wrench, 
  ExternalLink, 
  Info,
  Bug,
  Zap,
  Database
} from 'lucide-react';
import { QuickProformaTest } from './QuickProformaTest';
import { ImprovedAutoFixButton } from './ImprovedAutoFixButton';
import { ProformaErrorNotification } from './ProformaErrorNotification';

interface ProformaErrorSolutionProps {
  error?: string;
  onResolved?: () => void;
  showInstructions?: boolean;
  compact?: boolean;
}

export const ProformaErrorSolution = ({ 
  error, 
  onResolved, 
  showInstructions = true,
  compact = false 
}: ProformaErrorSolutionProps) => {
  const [hasError, setHasError] = useState(false);
  const [errorType, setErrorType] = useState<'object' | 'function' | 'creation' | 'other'>('other');

  useEffect(() => {
    if (error) {
      setHasError(true);
      
      // Detect specific error types
      if (error.includes('[object Object]') || error.includes('All function creation methods failed')) {
        setErrorType('object');
      } else if (error.includes('generate_proforma_number') || error.includes('schema cache')) {
        setErrorType('function');
      } else if (error.includes('creation') || error.includes('failed')) {
        setErrorType('creation');
      } else {
        setErrorType('other');
      }
    }
  }, [error]);

  const handleResolved = () => {
    setHasError(false);
    onResolved?.();
  };

  const getErrorInfo = () => {
    switch (errorType) {
      case 'object':
        return {
          title: 'Function Creation Error',
          description: 'The "[object Object]" error indicates that all database function creation methods failed. This is usually due to permission issues or database configuration.',
          severity: 'high' as const,
          canAutoFix: true
        };
      case 'function':
        return {
          title: 'Missing Database Function',
          description: 'The generate_proforma_number function is missing from the database schema.',
          severity: 'medium' as const,
          canAutoFix: true
        };
      case 'creation':
        return {
          title: 'Function Creation Failed',
          description: 'Automatic function creation failed. Manual intervention may be required.',
          severity: 'high' as const,
          canAutoFix: true
        };
      default:
        return {
          title: 'Proforma Error',
          description: 'There was an issue with the proforma invoice system.',
          severity: 'medium' as const,
          canAutoFix: false
        };
    }
  };

  const errorInfo = getErrorInfo();

  if (compact && hasError) {
    return (
      <ProformaErrorNotification
        error={error}
        onDismiss={() => setHasError(false)}
        onFixSuccess={handleResolved}
      />
    );
  }

  if (!hasError && !showInstructions) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Error Alert */}
      {hasError && (
        <Alert className={`${errorInfo.severity === 'high' ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
          <AlertTriangle className={`h-4 w-4 ${errorInfo.severity === 'high' ? 'text-red-600' : 'text-orange-600'}`} />
          <AlertDescription>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <strong className={errorInfo.severity === 'high' ? 'text-red-800' : 'text-orange-800'}>
                  {errorInfo.title}
                </strong>
                <Badge variant={errorInfo.severity === 'high' ? 'destructive' : 'secondary'}>
                  {errorInfo.severity.toUpperCase()} PRIORITY
                </Badge>
              </div>
              <p className={errorInfo.severity === 'high' ? 'text-red-700' : 'text-orange-700'}>
                {errorInfo.description}
              </p>
              {error && (
                <details className="text-xs">
                  <summary className="cursor-pointer">Show error details</summary>
                  <pre className="mt-1 p-2 bg-white border rounded overflow-auto max-h-20">
                    {error}
                  </pre>
                </details>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Solution Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Proforma Error Solution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="quick" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="quick" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Quick Fix
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Advanced
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Manual
              </TabsTrigger>
            </TabsList>

            {/* Quick Fix Tab */}
            <TabsContent value="quick" className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Recommended:</strong> Use the improved auto-fix system that specifically handles the "[object Object]" error.
                </AlertDescription>
              </Alert>
              
              <ImprovedAutoFixButton
                showDetails={false}
                onSuccess={handleResolved}
                onError={(error) => {
                  console.warn('Quick fix failed:', error);
                }}
              />
              
              <div className="text-sm text-muted-foreground">
                This will automatically detect the issue, try multiple fix methods, and provide fallback options if needed.
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <QuickProformaTest />
            </TabsContent>

            {/* Manual Tab */}
            <TabsContent value="manual" className="space-y-4">
              <Alert>
                <Bug className="h-4 w-4" />
                <AlertDescription>
                  If automatic fixes fail, use these manual tools for detailed analysis and manual intervention.
                </AlertDescription>
              </Alert>
              
              <div className="grid gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => window.open('/proforma-error-diagnostic', '_blank')}
                  className="flex items-center gap-2 justify-start"
                >
                  <Bug className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">Full Error Diagnostic</div>
                    <div className="text-xs text-muted-foreground">Comprehensive analysis of all proforma issues</div>
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.open('/proforma-function-fix', '_blank')}
                  className="flex items-center gap-2 justify-start"
                >
                  <Database className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">Manual Function Fix</div>
                    <div className="text-xs text-muted-foreground">Step-by-step function creation with SQL scripts</div>
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.open('/proforma-number-diagnostic', '_blank')}
                  className="flex items-center gap-2 justify-start"
                >
                  <CheckCircle className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">Number Generation Test</div>
                    <div className="text-xs text-muted-foreground">Test and verify proforma number generation</div>
                  </div>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Success Message */}
      {!hasError && showInstructions && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>All Good!</strong> The proforma system appears to be working correctly. 
            You can still use the tools above to test and verify functionality.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// Export a simple hook for detecting proforma errors
export const useProformaErrorDetection = (error?: string) => {
  const [hasProformaError, setHasProformaError] = useState(false);
  const [errorType, setErrorType] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      const isProformaError = 
        error.includes('proforma') ||
        error.includes('generate_proforma_number') ||
        error.includes('[object Object]') ||
        error.includes('schema cache') ||
        error.includes('function creation');

      setHasProformaError(isProformaError);
      
      if (isProformaError) {
        if (error.includes('[object Object]')) {
          setErrorType('object_error');
        } else if (error.includes('generate_proforma_number')) {
          setErrorType('function_missing');
        } else if (error.includes('creation')) {
          setErrorType('creation_failed');
        } else {
          setErrorType('generic_proforma');
        }
      }
    } else {
      setHasProformaError(false);
      setErrorType(null);
    }
  }, [error]);

  return { hasProformaError, errorType };
};
