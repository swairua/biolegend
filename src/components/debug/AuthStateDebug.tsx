import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { NetworkDiagnostics } from './NetworkDiagnostics';
import { Badge } from '@/components/ui/badge';
import { User, Shield } from 'lucide-react';

export function AuthStateDebug() {
  const { user, isLoading } = useAuth();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Auth State Debug
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>User Status:</span>
            <Badge variant={user ? 'default' : 'destructive'}>
              {isLoading ? 'Loading...' : user ? 'Authenticated' : 'Not Authenticated'}
            </Badge>
          </div>
          {user && (
            <div className="text-sm text-muted-foreground">
              <div>User ID: {user.id}</div>
              <div>Email: {user.email}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AuthStateDebugWithNetwork() {
  return (
    <div className="space-y-4">
      <AuthStateDebug />
      <NetworkDiagnostics />
    </div>
  );
}
