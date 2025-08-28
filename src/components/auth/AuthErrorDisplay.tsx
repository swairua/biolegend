import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUserFriendlyErrorMessage, isErrorType } from '@/utils/errorLogger';
import { useState } from 'react';

interface AuthErrorDisplayProps {
  error: unknown;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  context?: string;
}

export const AuthErrorDisplay = ({ 
  error, 
  onRetry, 
  onDismiss, 
  showDetails = false,
  context = 'Authentication'
}: AuthErrorDisplayProps) => {
  const [showFullError, setShowFullError] = useState(false);
  
  if (!error) return null;

  const userMessage = getUserFriendlyErrorMessage(error);
  const isAuthError = isErrorType(error, 'auth');
  const isNetworkError = isErrorType(error, 'network');
  const isPermissionError = isErrorType(error, 'permission');

  const getErrorIcon = () => {
    if (isNetworkError) {
      return <RefreshCw className="h-4 w-4" />;
    }
    return <AlertTriangle className="h-4 w-4" />;
  };

  const getErrorTitle = () => {
    if (isAuthError) {
      return 'Authentication Error';
    }
    if (isNetworkError) {
      return 'Connection Error';
    }
    if (isPermissionError) {
      return 'Permission Error';
    }
    return `${context} Error`;
  };

  const getSuggestion = () => {
    if (isAuthError) {
      return 'Please sign in again or clear your authentication tokens.';
    }
    if (isNetworkError) {
      return 'Please check your internet connection and try again.';
    }
    if (isPermissionError) {
      return 'You may not have permission to perform this action.';
    }
    return 'Please try again or contact support if the problem persists.';
  };

  const errorDetails = showDetails && error && typeof error === 'object' ? {
    message: (error as any).message,
    code: (error as any).code,
    details: (error as any).details,
    hint: (error as any).hint,
    timestamp: new Date().toISOString()
  } : null;

  return (
    <Alert className="mt-4">
      <div className="flex items-start gap-2">
        {getErrorIcon()}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{getErrorTitle()}</h4>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-auto p-0 hover:bg-transparent"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <AlertDescription className="mt-1">
            <div className="space-y-2">
              <p>{userMessage}</p>
              <p className="text-xs text-muted-foreground">{getSuggestion()}</p>
              
              {showDetails && (
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullError(!showFullError)}
                    className="h-auto p-0 text-xs hover:bg-transparent"
                  >
                    {showFullError ? 'Hide' : 'Show'} technical details
                  </Button>
                  
                  {showFullError && errorDetails && (
                    <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(errorDetails, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
              
              {onRetry && (
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};

export default AuthErrorDisplay;
