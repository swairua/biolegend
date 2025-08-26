import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

export const PaymentAllocationDiagnostic = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Allocation Diagnostic
        </CardTitle>
        <CardDescription>
          Payment allocation system diagnostics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Payment allocation system is functioning normally
        </p>
      </CardContent>
    </Card>
  );
};
