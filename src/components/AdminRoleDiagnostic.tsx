import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Users, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AdminRoleData {
  totalUsers: number;
  adminUsers: number;
  superAdminUsers: number;
  userUsers: number;
  noRoleUsers: number;
  currentUserRole: string;
  currentUserIsAdmin: boolean;
}

export function AdminRoleDiagnostic() {
  const { user } = useAuth();
  const [isChecking, setIsChecking] = React.useState(false);
  const [roleData, setRoleData] = React.useState<AdminRoleData | null>(null);
  const [lastCheck, setLastCheck] = React.useState<Date | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const checkAdminRoles = async () => {
    if (!user) {
      setError('No authenticated user');
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      // Get current user's role
      const currentUserRole = user.user_metadata?.role || 'user';
      const currentUserIsAdmin = currentUserRole === 'admin' || currentUserRole === 'super_admin';

      // Try to get user data (this might fail if user doesn't have permissions)
      let userData = null;
      try {
        const { data, error: usersError } = await supabase
          .from('auth.users')
          .select('user_metadata');
        
        if (!usersError) {
          userData = data;
        }
      } catch (err) {
        // User might not have permission to access this table
      }

      let roleStats = {
        totalUsers: 1, // At least current user
        adminUsers: currentUserIsAdmin ? 1 : 0,
        superAdminUsers: currentUserRole === 'super_admin' ? 1 : 0,
        userUsers: currentUserRole === 'user' ? 1 : 0,
        noRoleUsers: !currentUserRole ? 1 : 0
      };

      if (userData && userData.length > 0) {
        roleStats = userData.reduce((stats, user) => {
          const role = user.user_metadata?.role || '';
          stats.totalUsers++;
          
          switch (role) {
            case 'admin':
              stats.adminUsers++;
              break;
            case 'super_admin':
              stats.superAdminUsers++;
              break;
            case 'user':
              stats.userUsers++;
              break;
            default:
              stats.noRoleUsers++;
          }
          
          return stats;
        }, {
          totalUsers: 0,
          adminUsers: 0,
          superAdminUsers: 0,
          userUsers: 0,
          noRoleUsers: 0
        });
      }

      setRoleData({
        ...roleStats,
        currentUserRole,
        currentUserIsAdmin
      });

      setLastCheck(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check failed');
    } finally {
      setIsChecking(false);
    }
  };

  React.useEffect(() => {
    checkAdminRoles();
  }, [user]);

  if (!user) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Role Diagnostic
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>No user is currently authenticated</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const hasRoleIssues = roleData && (
    roleData.noRoleUsers > 0 || 
    (roleData.adminUsers === 0 && roleData.superAdminUsers === 0)
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Role Diagnostic
          </div>
          <Button 
            onClick={checkAdminRoles} 
            variant="outline" 
            size="sm"
            disabled={isChecking}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Check'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {roleData && (
            <>
              <div className="space-y-2">
                <h4 className="font-medium">Current User Status:</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <span>Your Role:</span>
                    <Badge variant={roleData.currentUserIsAdmin ? 'default' : 'secondary'}>
                      <Shield className="h-3 w-3 mr-1" />
                      {roleData.currentUserRole || 'none'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Admin Access:</span>
                    <Badge variant={roleData.currentUserIsAdmin ? 'default' : 'outline'}>
                      {roleData.currentUserIsAdmin ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">System Role Statistics:</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <span>Total Users:</span>
                    <Badge variant="outline">
                      <Users className="h-3 w-3 mr-1" />
                      {roleData.totalUsers}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Super Admins:</span>
                    <Badge variant={roleData.superAdminUsers > 0 ? 'default' : 'destructive'}>
                      {roleData.superAdminUsers}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Admins:</span>
                    <Badge variant={roleData.adminUsers > 0 ? 'default' : 'secondary'}>
                      {roleData.adminUsers}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Regular Users:</span>
                    <Badge variant="outline">{roleData.userUsers}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>No Role Assigned:</span>
                    <Badge variant={roleData.noRoleUsers > 0 ? 'destructive' : 'default'}>
                      {roleData.noRoleUsers}
                    </Badge>
                  </div>
                </div>
              </div>

              {lastCheck && (
                <div className="text-xs text-muted-foreground">
                  Last check: {lastCheck.toLocaleString()}
                </div>
              )}

              {!hasRoleIssues && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Admin role configuration looks healthy</span>
                </div>
              )}

              {roleData.superAdminUsers === 0 && roleData.adminUsers === 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No admin or super admin users found. This could prevent system administration.
                  </AlertDescription>
                </Alert>
              )}

              {roleData.noRoleUsers > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {roleData.noRoleUsers} user(s) don't have a role assigned. Consider assigning appropriate roles.
                  </AlertDescription>
                </Alert>
              )}

              {!roleData.currentUserIsAdmin && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You currently don't have admin privileges. Some diagnostic information may be limited.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
