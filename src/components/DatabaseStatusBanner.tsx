import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';

export const DatabaseStatusBanner = () => {
  return (
    <Alert className="mb-4">
      <CheckCircle className="h-4 w-4" />
      <AlertDescription>
        Database connection active
      </AlertDescription>
    </Alert>
  );
};
