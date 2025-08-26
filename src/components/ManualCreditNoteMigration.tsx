import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

export const ManualCreditNoteMigration = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Manual Credit Note Migration
        </CardTitle>
        <CardDescription>
          Manually migrate credit note data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline">Start Migration</Button>
      </CardContent>
    </Card>
  );
};
