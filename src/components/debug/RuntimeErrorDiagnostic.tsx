import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Clock, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const RuntimeErrorDiagnostic = () => {
  const { loading, isAuthenticated, user, profile } = useAuth();
  const [mountTime] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const elapsedSeconds = Math.floor((currentTime - mountTime) / 1000);
  
  const getStatusBadge = (condition: boolean, trueText: string, falseText: string) => {
    return (
      <Badge variant={condition ? "default" : "destructive"}>
        {condition ? trueText : falseText}
      </Badge>
    );
  };

  const getLoadingStatus = () => {
    if (!loading && isAuthenticated) return { type: 'success', message: 'Authenticated and ready' };
    if (!loading && !isAuthenticated) return { type: 'warning', message: 'Not authenticated' };
    if (loading && elapsedSeconds < 5) return { type: 'info', message: 'Normal loading' };
    if (loading && elapsedSeconds < 15) return { type: 'warning', message: 'Extended loading' };
    if (loading && elapsedSeconds >= 15) return { type: 'error', message: 'Stuck loading - emergency reset available' };
    return { type: 'info', message: 'Unknown state' };
  };

  const status = getLoadingStatus();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
          {status.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
          {status.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-500" />}
          {status.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
          Runtime Status Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>Status:</strong> {status.message} 
            <span className="ml-2 text-sm text-muted-foreground">
              (Elapsed: {elapsedSeconds}s)
            </span>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Authentication State</h4>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">Loading:</span>
                {getStatusBadge(loading, "True", "False")}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Authenticated:</span>
                {getStatusBadge(isAuthenticated, "Yes", "No")}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">User Present:</span>
                {getStatusBadge(!!user, "Yes", "No")}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Profile Loaded:</span>
                {getStatusBadge(!!profile, "Yes", "No")}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Timeline</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span>Mount Time:</span>
                <span className="text-muted-foreground">
                  {new Date(mountTime).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Elapsed:</span>
                <span className="font-mono">{elapsedSeconds}s</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Expected Load:</span>
                <span className="text-muted-foreground">&lt; 5s</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Emergency Reset:</span>
                <span className="text-muted-foreground">@ 15s</span>
              </div>
            </div>
          </div>
        </div>

        {user && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">User Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-mono">{user.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">ID:</span>
                <p className="font-mono text-xs">{user.id}</p>
              </div>
            </div>
          </div>
        )}

        {profile && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Profile Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Full Name:</span>
                <p>{profile.full_name || 'Not set'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Company ID:</span>
                <p className="font-mono text-xs">{profile.company_id || 'Not set'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">System Health</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">App Loading State:</span>
              <Badge variant={loading ? "destructive" : "default"}>
                {loading ? "Loading" : "Ready"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Performance:</span>
              <Badge variant={elapsedSeconds < 5 ? "default" : elapsedSeconds < 15 ? "secondary" : "destructive"}>
                {elapsedSeconds < 5 ? "Good" : elapsedSeconds < 15 ? "Slow" : "Poor"}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
