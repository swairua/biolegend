import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Hash, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProformaNumberDiagnosticProps {
  currentNumber?: string;
  nextNumber?: string;
  isSequenceValid?: boolean;
  onGenerateNext?: () => void;
  onValidateSequence?: () => void;
}

export function ProformaNumberDiagnostic({ 
  currentNumber = '',
  nextNumber = '',
  isSequenceValid = true,
  onGenerateNext,
  onValidateSequence
}: ProformaNumberDiagnosticProps) {
  const hasCurrentNumber = currentNumber.length > 0;
  const hasNextNumber = nextNumber.length > 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Proforma Number Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">Current Number:</span>
              <Badge variant={hasCurrentNumber ? 'default' : 'outline'}>
                {currentNumber || 'Not Set'}
              </Badge>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Next Number:</span>
              <Badge variant={hasNextNumber ? 'default' : 'outline'}>
                {nextNumber || 'Not Generated'}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span>Sequence Status:</span>
            <Badge variant={isSequenceValid ? 'default' : 'destructive'}>
              {isSequenceValid ? 'Valid' : 'Invalid'}
            </Badge>
          </div>
          
          {!isSequenceValid && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Number sequence validation failed. Check for duplicates or gaps.
              </AlertDescription>
            </Alert>
          )}
          
          {isSequenceValid && hasCurrentNumber && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Number sequence is valid</span>
            </div>
          )}
          
          <div className="flex gap-2">
            {onGenerateNext && (
              <Button onClick={onGenerateNext} variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-1" />
                Generate Next
              </Button>
            )}
            {onValidateSequence && (
              <Button onClick={onValidateSequence} variant="outline" size="sm">
                Validate Sequence
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
