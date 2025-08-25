import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertTriangle, 
  Wrench, 
  Loader2, 
  ExternalLink,
  Copy,
  Database,
  AlertCircle
} from 'lucide-react';
import { autoFixImproved, setupProformaFunctionImproved } from '@/utils/improvedProformaFix';
import { toast } from 'sonner';

interface ImprovedAutoFixButtonProps {
  onSuccess?: (generatedNumber: string) => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  showDetails?: boolean;
}

interface FixStep {
  step: string;
  success: boolean;
  details?: any;
  error?: string;
}

export const ImprovedAutoFixButton = ({ 
  onSuccess, 
  onError, 
  className = "",
  variant = "default",
  showDetails = false
}: ImprovedAutoFixButtonProps) => {
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<{
    success: boolean;
    message: string;
    number?: string;
    method?: string;
    steps?: FixStep[];
    errors?: string[];
  } | null>(null);
  const [showFullDetails, setShowFullDetails] = useState(false);

  const handleAutoFix = async () => {
    setIsFixing(true);
    setFixResult(null);
    
    try {
      console.log('🔧 Starting improved auto-fix process...');
      
      // Show progress toast
      const progressToast = toast.loading('Analyzing and fixing proforma function...');
      
      // First, try the complete setup process to get detailed information
      const setupResult = await setupProformaFunctionImproved();
      
      if (setupResult.success && setupResult.testResult) {
        // Complete success
        setFixResult({ 
          success: true, 
          message: `Fix successful! Function is working properly.`,
          number: setupResult.testResult,
          method: 'function',
          steps: setupResult.steps
        });
        
        onSuccess?.(setupResult.testResult);
        toast.dismiss(progressToast);
        toast.success(`Proforma function fixed! Generated: ${setupResult.testResult}`);
        
      } else {
        // Setup failed, try auto-fix with fallback
        console.log('🔄 Setup failed, trying auto-fix with fallback...');
        const autoFixResult = await autoFixImproved();
        
        if (autoFixResult.method === 'function') {
          // Function method worked
          setFixResult({ 
            success: true, 
            message: `Fix successful! Function created and tested.`,
            number: autoFixResult.number,
            method: 'function',
            steps: setupResult.steps,
            errors: setupResult.errors
          });
          
          onSuccess?.(autoFixResult.number);
          toast.dismiss(progressToast);
          toast.success(`Proforma function fixed! Generated: ${autoFixResult.number}`);
          
        } else {
          // Fallback method used
          setFixResult({ 
            success: false, 
            message: `Automatic fix failed. Using fallback number: ${autoFixResult.number}`,
            number: autoFixResult.number,
            method: 'fallback',
            steps: setupResult.steps,
            errors: setupResult.errors
          });
          
          onError?.(autoFixResult.error || 'Function creation failed');
          toast.dismiss(progressToast);
          toast.warning(`Function fix failed. Using fallback number: ${autoFixResult.number}`);
        }
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Improved auto-fix process failed:', error);
      
      setFixResult({ 
        success: false, 
        message: `Fix process failed: ${errorMessage}`,
        errors: [errorMessage]
      });
      
      onError?.(errorMessage);
      toast.error('Auto-fix process failed. Please try manual method.');
      
    } finally {
      setIsFixing(false);
    }
  };

  const copyErrorsToClipboard = async () => {
    if (!fixResult?.errors) return;
    
    const errorText = fixResult.errors.join('\n\n');
    try {
      await navigator.clipboard.writeText(errorText);
      toast.success('Error details copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const openManualFix = () => {
    window.open('/proforma-function-fix', '_blank');
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Button 
        onClick={handleAutoFix} 
        disabled={isFixing}
        variant={variant}
        className="flex items-center gap-2"
      >
        {isFixing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wrench className="h-4 w-4" />
        )}
        {isFixing ? 'Fixing...' : 'Auto-Fix Function'}
      </Button>
      
      {fixResult && (
        <Card className={`${fixResult.success ? "border-green-200" : "border-orange-200"}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {fixResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                )}
                Fix Result
              </div>
              <Badge variant={fixResult.success ? "default" : "secondary"}>
                {fixResult.success ? "SUCCESS" : fixResult.method === 'fallback' ? "FALLBACK" : "FAILED"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert className={fixResult.success ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
              <AlertDescription className={fixResult.success ? "text-green-800" : "text-orange-800"}>
                {fixResult.message}
                {fixResult.number && (
                  <div className="mt-2">
                    <strong>Generated Number:</strong> 
                    <code className="ml-2 px-2 py-1 bg-white rounded border">{fixResult.number}</code>
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {/* Action buttons for failed cases */}
            {!fixResult.success && (
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={openManualFix}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Manual Fix
                </Button>
                {fixResult.errors && (
                  <Button size="sm" variant="ghost" onClick={copyErrorsToClipboard}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Errors
                  </Button>
                )}
              </div>
            )}

            {/* Show details option */}
            {(showDetails || fixResult.steps?.length) && (
              <div className="space-y-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setShowFullDetails(!showFullDetails)}
                  className="text-xs"
                >
                  {showFullDetails ? 'Hide' : 'Show'} Technical Details
                </Button>
                
                {showFullDetails && fixResult.steps && (
                  <div className="space-y-2 text-xs">
                    <h4 className="font-medium flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      Fix Steps:
                    </h4>
                    {fixResult.steps.map((step, index) => (
                      <div key={index} className={`border rounded p-2 ${step.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          {step.success ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-red-600" />
                          )}
                          <span className="font-medium">{step.step}</span>
                        </div>
                        {step.error && (
                          <div className="text-red-700 text-xs mt-1">
                            <strong>Error:</strong> {step.error}
                          </div>
                        )}
                        {step.details && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                              Show details
                            </summary>
                            <pre className="text-xs mt-1 p-1 bg-gray-100 rounded overflow-auto max-h-20">
                              {JSON.stringify(step.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {showFullDetails && fixResult.errors && fixResult.errors.length > 0 && (
                  <div className="space-y-2 text-xs">
                    <h4 className="font-medium text-red-700">All Errors:</h4>
                    <div className="space-y-1">
                      {fixResult.errors.map((error, index) => (
                        <div key={index} className="border border-red-200 bg-red-50 p-2 rounded text-red-700">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
