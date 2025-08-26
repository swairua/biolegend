import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';

export const UserInvitationsTableFix = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          User Invitations Table Fix
        </CardTitle>
        <CardDescription>
          Fix user invitations table structure
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline">Fix Invitations Table</Button>
      </CardContent>
    </Card>
  );
};
