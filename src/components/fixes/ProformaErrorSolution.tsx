import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wrench } from 'lucide-react';

export const ProformaErrorSolution = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Proforma Error Solution
        </CardTitle>
        <CardDescription>
          Automated proforma error detection and resolution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline">Fix Proforma Errors</Button>
      </CardContent>
    </Card>
  );
};
