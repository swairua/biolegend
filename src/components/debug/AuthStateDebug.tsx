import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function AuthStateDebug() {
  const { user, profile, session, loading, isAuthenticated, signOut } = useAuth();

  const refreshPage = () => {
    window.location.reload();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Authentication State Debug</CardTitle>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={refreshPage}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {isAuthenticated && (
            <Button variant="destructive" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">States</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Loading:</span>
                <Badge variant={loading ? "destructive" : "success"}>
                  {loading ? "True" : "False"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Authenticated:</span>
                <Badge variant={isAuthenticated ? "success" : "destructive"}>
                  {isAuthenticated ? "True" : "False"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Has User:</span>
                <Badge variant={!!user ? "success" : "destructive"}>
                  {!!user ? "True" : "False"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Has Profile:</span>
                <Badge variant={!!profile ? "success" : "destructive"}>
                  {!!profile ? "True" : "False"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Has Session:</span>
                <Badge variant={!!session ? "success" : "destructive"}>
                  {!!session ? "True" : "False"}
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">User Info</h4>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground">Email:</span>
                <div className="font-mono break-all">{user?.email || 'None'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">User ID:</span>
                <div className="font-mono break-all">{user?.id || 'None'}</div>
              </div>
            </div>
          </div>
        </div>

        {profile && (
          <div>
            <h4 className="font-medium mb-2">Profile Info</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Full Name:</span>
                <div>{profile.full_name || 'None'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Role:</span>
                <div>
                  <Badge variant="outline" className="text-xs">
                    {profile.role}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <div>
                  <Badge 
                    variant={profile.status === 'active' ? 'success' : 'destructive'}
                    className="text-xs"
                  >
                    {profile.status}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Department:</span>
                <div>{profile.department || 'None'}</div>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
          <strong>Expected Behavior:</strong> If authenticated = true, you should see the dashboard with header containing sign out button.
          If loading = true and won't clear, there's a loading state bug.
        </div>
      </CardContent>
    </Card>
  );
}
