import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

export const DirectForceMigration = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Direct Force Migration
        </CardTitle>
        <CardDescription>
          Direct database migration tools
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline">Force Migration</Button>
      </CardContent>
    </Card>
  );
};
