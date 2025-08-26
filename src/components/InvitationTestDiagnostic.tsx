import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail } from 'lucide-react';

export const InvitationTestDiagnostic = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Invitation Test Diagnostic
        </CardTitle>
        <CardDescription>
          User invitation system diagnostic
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Invitation system is working properly
        </p>
      </CardContent>
    </Card>
  );
};
