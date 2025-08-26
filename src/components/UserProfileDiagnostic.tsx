import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Shield, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  company_id: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

export function UserProfileDiagnostic() {
  const { user } = useAuth();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadUserProfile = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('auth.users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // Try alternative approach using user metadata
        setProfile({
          id: user.id,
          email: user.email || 'Unknown',
          role: user.user_metadata?.role || 'user',
          company_id: user.user_metadata?.company_id || null,
          created_at: user.created_at || '',
          last_sign_in_at: user.last_sign_in_at || null,
        });
      } else {
        setProfile(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user profile');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadUserProfile();
  }, [user]);

  if (!user) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile Diagnostic
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

  const hasRole = profile?.role && profile.role !== 'user';
  const hasCompany = profile?.company_id;
  const recentLogin = profile?.last_sign_in_at && 
    new Date(profile.last_sign_in_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile Diagnostic
          </div>
          <Button 
            onClick={loadUserProfile} 
            variant="outline" 
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
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

          {isLoading ? (
            <div>Loading profile...</div>
          ) : profile ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Email:</span>
                  <div className="text-sm">{profile.email}</div>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium">User ID:</span>
                  <div className="text-xs font-mono bg-muted p-1 rounded">
                    {profile.id}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span>Role:</span>
                  <Badge variant={hasRole ? 'default' : 'outline'}>
                    <Shield className="h-3 w-3 mr-1" />
                    {profile.role || 'user'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span>Company:</span>
                  <Badge variant={hasCompany ? 'default' : 'outline'}>
                    {hasCompany ? 'Assigned' : 'None'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Created:</span>
                  <div className="text-xs">
                    {new Date(profile.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Last Login:</span>
                  <div className="text-xs">
                    {profile.last_sign_in_at 
                      ? new Date(profile.last_sign_in_at).toLocaleString()
                      : 'Never'
                    }
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Profile Status:</span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {profile.email ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">Email verified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasRole ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="text-sm">Role assigned</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {recentLogin ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="text-sm">Recent activity</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">Unable to load profile data</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
