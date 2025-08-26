import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export const ForceCreditNoteMigration = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Force Credit Note Migration
        </CardTitle>
        <CardDescription>
          Force migrate credit note data structures
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline">Force Migration</Button>
      </CardContent>
    </Card>
  );
};
