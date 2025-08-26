import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function AdminRoleDiagnostic() {
  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkCurrentRole = async () => {
    setIsChecking(true);
    try {
      if (!user) {
        toast.error('No user logged in');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, status, company_id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to check profile');
        return;
      }

      console.log('Current profile data:', data);
      toast.success('Profile check completed - see console for details');
      
      // Refresh the profile in context
      await refreshProfile();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to check profile');
    } finally {
      setIsChecking(false);
    }
  };

  const makeCurrentUserAdmin = async () => {
    if (!user) {
      toast.error('No user logged in');
      return;
    }

    setIsUpdating(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          role: 'admin',
          status: 'active'
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        toast.error(`Failed to update role: ${error.message}`);
        return;
      }

      console.log('Profile updated:', data);
      toast.success('Successfully set admin role!');
      
      // Refresh the profile in context
      await refreshProfile();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to update role');
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleColor = (role: string | undefined) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive-light text-destructive border-destructive/20';
      case 'accountant':
        return 'bg-primary-light text-primary border-primary/20';
      case 'stock_manager':
        return 'bg-warning-light text-warning border-warning/20';
      case 'user':
        return 'bg-success-light text-success border-success/20';
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground/20';
    }
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'active':
        return 'bg-success-light text-success border-success/20';
      case 'pending':
        return 'bg-warning-light text-warning border-warning/20';
      case 'inactive':
        return 'bg-muted text-muted-foreground border-muted-foreground/20';
      default:
        return 'bg-destructive-light text-destructive border-destructive/20';
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary" />
          <span>Admin Role Diagnostic</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Button onClick={checkCurrentRole} disabled={isChecking} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Check Current Role'}
          </Button>
          
          {!isAdmin && (
            <Button onClick={makeCurrentUserAdmin} disabled={isUpdating} className="bg-destructive hover:bg-destructive/90">
              <UserCheck className="h-4 w-4 mr-2" />
              {isUpdating ? 'Setting Admin...' : 'Make Me Admin'}
            </Button>
          )}
        </div>

        {user && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Current User Info</span>
                </h4>
                <div className="text-sm space-y-1">
                  <div><strong>Email:</strong> {user.email}</div>
                  <div><strong>User ID:</strong> {user.id}</div>
                  <div><strong>Full Name:</strong> {profile?.full_name || 'Not set'}</div>
                  <div><strong>Company ID:</strong> {profile?.company_id || 'Not set'}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center space-x-2">
                  <UserCheck className="h-4 w-4" />
                  <span>Role & Permissions</span>
                </h4>
                <div className="text-sm space-y-2">
                  <div className="flex items-center space-x-2">
                    <strong>Role:</strong>
                    <Badge variant="outline" className={getRoleColor(profile?.role)}>
                      {profile?.role || 'Not Set'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <strong>Status:</strong>
                    <Badge variant="outline" className={getStatusColor(profile?.status)}>
                      {profile?.status || 'Not Set'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <strong>Admin Access:</strong>
                    {isAdmin ? (
                      <Badge variant="outline" className="bg-success-light text-success border-success/20">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Granted
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-destructive-light text-destructive border-destructive/20">
                        <XCircle className="h-3 w-3 mr-1" />
                        Denied
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {!isAdmin && (
              <Alert className="border-warning/20 bg-warning-light">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning">
                  You don't have admin privileges. Click "Make Me Admin" to grant yourself admin access, 
                  or ask an existing administrator to update your role.
                </AlertDescription>
              </Alert>
            )}

            {isAdmin && (
              <Alert className="border-success/20 bg-success-light">
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  You have admin privileges and can access user management features.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
