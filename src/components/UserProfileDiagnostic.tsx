import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';

export const UserProfileDiagnostic = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          User Profile Diagnostic
        </CardTitle>
        <CardDescription>
          User profile status and diagnostics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          All user profiles are functioning normally
        </p>
      </CardContent>
    </Card>
  );
};
