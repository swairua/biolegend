import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  Shield,
  Database
} from 'lucide-react';

export function AuthFlowTest() {
  const { user, profile, session, loading, isAuthenticated } = useAuth();
  const [testResult, setTestResult] = useState<string>('');
  const [authMetrics, setAuthMetrics] = useState<any>(null);

  const testAuthFlow = async () => {
    const startTime = Date.now();
    setTestResult('Testing authentication flow...');
    
    try {
      // Test 1: Check current auth state
      const authState = {
        hasUser: !!user,
        hasProfile: !!profile, 
        hasSession: !!session,
        isAuthenticated,
        isLoading: loading
      };

      // Test 2: Test session validity
      let sessionValid = false;
      try {
        const { data: { user: currentUser }, error } = await supabase.auth.getUser();
        sessionValid = !!currentUser && !error;
      } catch (err) {
        sessionValid = false;
      }

      // Test 3: Test database connectivity with auth
      let dbConnected = false;
      try {
        const { error } = await supabase.from('profiles').select('id').limit(0);
        dbConnected = !error;
      } catch (err) {
        dbConnected = false;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      setAuthMetrics({
        authState,
        sessionValid,
        dbConnected,
        duration,
        timestamp: new Date().toISOString()
      });

      const status = authState.isAuthenticated ? 'AUTHENTICATED' : 'NOT_AUTHENTICATED';
      setTestResult(`Auth test completed in ${duration}ms - Status: ${status}`);

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      setTestResult(`Auth test failed after ${duration}ms: ${error}`);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? <CheckCircle className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />;
  };

  const getStatusBadge = (status: boolean) => {
    return (
      <Badge variant={status ? "default" : "destructive"} className="text-xs">
        {status ? 'YES' : 'NO'}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary" />
          <span>Authentication Flow Test</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Button onClick={testAuthFlow} variant="outline">
            <Clock className="mr-2 h-4 w-4" />
            Test Auth Flow
          </Button>
        </div>

        {/* Current Auth State */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted rounded">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">User Authenticated</span>
              {getStatusBadge(isAuthenticated)}
            </div>
          </div>
          <div className="p-3 bg-muted rounded">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Loading State</span>
              {getStatusBadge(loading)}
            </div>
          </div>
        </div>

        {user && (
          <Alert className="border-success/20 bg-success-light/10">
            <User className="h-4 w-4 text-success" />
            <AlertDescription>
              <strong>User Info:</strong><br />
              Email: {user.email}<br />
              ID: {user.id.substring(0, 8)}...<br />
              {profile && `Name: ${profile.full_name || 'Not set'}`}
            </AlertDescription>
          </Alert>
        )}

        {authMetrics && (
          <div className="space-y-2">
            <h4 className="font-medium">Test Results:</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded border">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(authMetrics.authState.hasUser)}
                  <span className="text-sm">Has User Object</span>
                </div>
                {getStatusBadge(authMetrics.authState.hasUser)}
              </div>
              
              <div className="flex items-center justify-between p-2 rounded border">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(authMetrics.authState.hasSession)}
                  <span className="text-sm">Has Session</span>
                </div>
                {getStatusBadge(authMetrics.authState.hasSession)}
              </div>
              
              <div className="flex items-center justify-between p-2 rounded border">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(authMetrics.authState.hasProfile)}
                  <span className="text-sm">Has Profile</span>
                </div>
                {getStatusBadge(authMetrics.authState.hasProfile)}
              </div>
              
              <div className="flex items-center justify-between p-2 rounded border">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(authMetrics.sessionValid)}
                  <span className="text-sm">Session Valid</span>
                </div>
                {getStatusBadge(authMetrics.sessionValid)}
              </div>
              
              <div className="flex items-center justify-between p-2 rounded border">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(authMetrics.dbConnected)}
                  <span className="text-sm">Database Connected</span>
                </div>
                {getStatusBadge(authMetrics.dbConnected)}
              </div>
            </div>
            
            <div className="p-3 bg-muted rounded text-sm">
              <strong>Performance:</strong> Auth check completed in {authMetrics.duration}ms<br />
              <strong>Timestamp:</strong> {new Date(authMetrics.timestamp).toLocaleString()}
            </div>
          </div>
        )}

        {testResult && (
          <div className="p-3 bg-primary-light/10 border border-primary/20 rounded">
            <p className="text-sm font-mono">{testResult}</p>
          </div>
        )}

        <div className="p-3 bg-muted rounded text-sm">
          <h4 className="font-medium mb-2">About Auth Timeouts:</h4>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>• Auth initialization timeout reduced to 5 seconds</li>
            <li>• Profile loading moved to background (non-blocking)</li>
            <li>• Safety timeout reduced to 8 seconds</li>
            <li>• Improved error messages and user feedback</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
