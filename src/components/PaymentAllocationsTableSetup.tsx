import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';

export const PaymentAllocationsTableSetup = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Allocations Setup
        </CardTitle>
        <CardDescription>
          Configure payment allocation tracking table
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline">Setup Payment Allocations</Button>
      </CardContent>
    </Card>
  );
};
