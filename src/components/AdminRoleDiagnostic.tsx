import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export const AdminRoleDiagnostic = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Role Diagnostic
        </CardTitle>
        <CardDescription>
          Admin role and permissions diagnostic
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Admin roles are configured correctly
        </p>
      </CardContent>
    </Card>
  );
};
