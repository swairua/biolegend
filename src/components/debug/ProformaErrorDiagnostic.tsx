import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, FileX, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProformaError {
  type: string;
  message: string;
  timestamp: Date;
}

interface ProformaErrorDiagnosticProps {
  errors?: ProformaError[];
  onClearErrors?: () => void;
  onRetry?: () => void;
}

export function ProformaErrorDiagnostic({ 
  errors = [], 
  onClearErrors,
  onRetry 
}: ProformaErrorDiagnosticProps) {
  const hasErrors = errors.length > 0;
  const recentErrors = errors.filter(error => 
    Date.now() - error.timestamp.getTime() < 300000 // Last 5 minutes
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileX className="h-5 w-5" />
          Proforma Error Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span>Total Errors:</span>
              <Badge variant={hasErrors ? 'destructive' : 'default'}>
                {errors.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span>Recent Errors:</span>
              <Badge variant={recentErrors.length > 0 ? 'destructive' : 'default'}>
                {recentErrors.length}
              </Badge>
            </div>
          </div>
          
          {!hasErrors && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>No errors found</span>
            </div>
          )}
          
          {hasErrors && (
            <div className="space-y-2">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {errors.length} proforma error(s) detected. Check the details below.
                </AlertDescription>
              </Alert>
              
              <div className="max-h-32 overflow-y-auto space-y-1">
                {errors.slice(0, 5).map((error, index) => (
                  <div key={index} className="text-sm text-muted-foreground border rounded p-2">
                    <div className="font-medium">{error.type}</div>
                    <div>{error.message}</div>
                    <div className="text-xs">{error.timestamp.toLocaleString()}</div>
                  </div>
                ))}
                {errors.length > 5 && (
                  <div className="text-xs text-muted-foreground">
                    ...and {errors.length - 5} more errors
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            {onRetry && (
              <Button onClick={onRetry} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
            {onClearErrors && hasErrors && (
              <Button onClick={onClearErrors} variant="outline" size="sm">
                Clear Errors
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
