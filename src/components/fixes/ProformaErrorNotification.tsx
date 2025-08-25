import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink, X, AlertCircle } from 'lucide-react';
import { ImprovedAutoFixButton } from './ImprovedAutoFixButton';

interface ProformaErrorNotificationProps {
  error?: string;
  onDismiss?: () => void;
  onFixSuccess?: (number: string) => void;
}

export const ProformaErrorNotification = ({ error, onDismiss, onFixSuccess }: ProformaErrorNotificationProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [errorType, setErrorType] = useState<'function' | 'creation' | 'generic'>('generic');

  useEffect(() => {
    // Detect different types of proforma errors
    if (error) {
      if (
        error.includes('generate_proforma_number') ||
        error.includes('schema cache') ||
        error.includes('function not found')
      ) {
        setErrorType('function');
        setIsVisible(true);
      } else if (
        error.includes('All function creation methods failed') ||
        error.includes('[object Object]') ||
        error.includes('creation methods failed')
      ) {
        setErrorType('creation');
        setIsVisible(true);
      } else if (
        error.toLowerCase().includes('proforma') ||
        error.toLowerCase().includes('invoice')
      ) {
        setErrorType('generic');
        setIsVisible(true);
      }
    }
  }, [error]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const openFix = () => {
    window.open('/proforma-function-fix', '_blank');
  };

  if (!isVisible) return null;

  const getErrorMessage = () => {
    switch (errorType) {
      case 'function':
        return {
          title: 'Database Function Missing',
          description: 'The proforma number generator function needs to be created in the database.',
          icon: <AlertTriangle className="h-4 w-4 text-orange-600" />,
          severity: 'warning' as const
        };
      case 'creation':
        return {
          title: 'Function Creation Failed',
          description: 'All automatic methods to create the database function have failed. Manual intervention may be required.',
          icon: <AlertCircle className="h-4 w-4 text-red-600" />,
          severity: 'error' as const
        };
      default:
        return {
          title: 'Proforma Error',
          description: 'There was an issue with the proforma invoice system.',
          icon: <AlertTriangle className="h-4 w-4 text-orange-600" />,
          severity: 'warning' as const
        };
    }
  };

  const errorInfo = getErrorMessage();
  const alertClass = errorInfo.severity === 'error'
    ? 'border-red-200 bg-red-50'
    : 'border-orange-200 bg-orange-50';
  const textClass = errorInfo.severity === 'error'
    ? 'text-red-800'
    : 'text-orange-800';
  const buttonClass = errorInfo.severity === 'error'
    ? 'text-red-700 border-red-300 hover:bg-red-100'
    : 'text-orange-700 border-orange-300 hover:bg-orange-100';

  return (
    <div className="space-y-3">
      <Alert className={alertClass}>
        {errorInfo.icon}
        <AlertDescription>
          <div className="space-y-3">
            <div>
              <strong className={textClass}>{errorInfo.title}:</strong>
              <span className="ml-1">{errorInfo.description}</span>
              {error && (
                <details className="mt-2">
                  <summary className={`cursor-pointer text-xs ${textClass} hover:underline`}>
                    Show error details
                  </summary>
                  <pre className="text-xs mt-1 p-2 bg-white border rounded overflow-auto max-h-20">
                    {error}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <ImprovedAutoFixButton
                onSuccess={(number) => {
                  onFixSuccess?.(number);
                  handleDismiss();
                }}
                onError={(error) => {
                  console.warn('Auto-fix failed:', error);
                  // Don't auto-open manual fix, let user choose
                }}
                variant="outline"
                className={buttonClass}
                showDetails={errorType === 'creation'}
              />

              <Button
                size="sm"
                variant="outline"
                onClick={openFix}
                className={buttonClass}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Manual Fix
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className={`${textClass} hover:bg-opacity-20`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};
