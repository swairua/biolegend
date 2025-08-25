import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import { AutoFixProformaButton } from './AutoFixProformaButton';

interface ProformaErrorNotificationProps {
  error?: string;
  onDismiss?: () => void;
  onFixSuccess?: (number: string) => void;
}

export const ProformaErrorNotification = ({ error, onDismiss, onFixSuccess }: ProformaErrorNotificationProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show notification if there's a function not found error
    if (error && (
      error.includes('generate_proforma_number') ||
      error.includes('schema cache') ||
      error.includes('function not found')
    )) {
      setIsVisible(true);
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

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <strong className="text-orange-800">Database Function Missing:</strong> 
          <span className="ml-1">The proforma number generator needs to be set up.</span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <AutoFixProformaButton
            onSuccess={(number) => {
              onFixSuccess?.(number);
              handleDismiss();
            }}
            onError={() => {
              // If auto-fix fails, suggest manual fix
              openFix();
            }}
            variant="outline"
            className="text-orange-700 border-orange-300 hover:bg-orange-100"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={openFix}
            className="text-orange-700 border-orange-300 hover:bg-orange-100"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Manual Fix
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="text-orange-700 hover:bg-orange-100"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
