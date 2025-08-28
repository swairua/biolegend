import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Wifi, 
  Shield,
  Database,
  RefreshCw,
  Activity
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { clearAuthTokens } from '@/utils/authHelpers';
import { toast } from 'sonner';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'warning' | 'error' | 'pending';
  message: string;
  details?: string;
  duration?: number;
}

export const AuthDiagnostics = () => {
  const { user, session, loading, isAuthenticated } = useAuth();
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];
    const startTime = Date.now();

    try {
      // 1. Check Supabase connectivity
      const connectivityStart = Date.now();
      try {
        const response = await fetch(supabase.supabaseUrl + '/rest/v1/', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        
        const connectivityDuration = Date.now() - connectivityStart;
        
        if (response.ok) {
          results.push({
            name: 'Supabase Connectivity',
            status: connectivityDuration > 2000 ? 'warning' : 'success',
            message: `Connected (${connectivityDuration}ms)`,
            details: connectivityDuration > 2000 ? 'Slow response time detected' : undefined,
            duration: connectivityDuration
          });
        } else {
          results.push({
            name: 'Supabase Connectivity',
            status: 'error',
            message: `Connection failed (HTTP ${response.status})`,
            details: 'Unable to reach Supabase servers',
            duration: connectivityDuration
          });
        }
      } catch (error) {
        results.push({
          name: 'Supabase Connectivity',
          status: 'error',
          message: 'Connection failed',
          details: error instanceof Error ? error.message : 'Network error'
        });
      }

      // 2. Check auth session status
      const sessionStart = Date.now();
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const sessionDuration = Date.now() - sessionStart;

        if (sessionError) {
          results.push({
            name: 'Auth Session Check',
            status: 'error',
            message: 'Session check failed',
            details: sessionError.message,
            duration: sessionDuration
          });
        } else if (sessionData.session) {
          results.push({
            name: 'Auth Session Check',
            status: 'success',
            message: `Valid session found (${sessionDuration}ms)`,
            details: `User: ${sessionData.session.user.email}`,
            duration: sessionDuration
          });
        } else {
          results.push({
            name: 'Auth Session Check',
            status: 'warning',
            message: `No session found (${sessionDuration}ms)`,
            details: 'User not authenticated',
            duration: sessionDuration
          });
        }
      } catch (error) {
        results.push({
          name: 'Auth Session Check',
          status: 'error',
          message: 'Session check error',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // 3. Check localStorage tokens
      try {
        const projectRef = supabase.supabaseUrl.split('//')[1].split('.')[0];
        const storageKey = `sb-${projectRef}-auth-token`;
        const tokenData = localStorage.getItem(storageKey);

        if (tokenData) {
          try {
            const parsedToken = JSON.parse(tokenData);
            const expiresAt = parsedToken.expires_at;
            const isExpired = expiresAt && Date.now() > expiresAt * 1000;

            results.push({
              name: 'Local Storage Tokens',
              status: isExpired ? 'warning' : 'success',
              message: isExpired ? 'Tokens expired' : 'Valid tokens found',
              details: expiresAt ? `Expires: ${new Date(expiresAt * 1000).toLocaleString()}` : undefined
            });
          } catch (parseError) {
            results.push({
              name: 'Local Storage Tokens',
              status: 'error',
              message: 'Invalid token format',
              details: 'Token data is corrupted'
            });
          }
        } else {
          results.push({
            name: 'Local Storage Tokens',
            status: 'warning',
            message: 'No tokens found',
            details: 'User needs to sign in'
          });
        }
      } catch (error) {
        results.push({
          name: 'Local Storage Tokens',
          status: 'error',
          message: 'Storage access error',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // 4. Check profiles table access (if authenticated)
      if (user) {
        const profileStart = Date.now();
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, role')
            .eq('id', user.id)
            .maybeSingle();

          const profileDuration = Date.now() - profileStart;

          if (profileError) {
            results.push({
              name: 'Profile Database Access',
              status: 'error',
              message: 'Profile access failed',
              details: profileError.message,
              duration: profileDuration
            });
          } else if (profileData) {
            results.push({
              name: 'Profile Database Access',
              status: 'success',
              message: `Profile loaded (${profileDuration}ms)`,
              details: `Role: ${profileData.role || 'undefined'}`,
              duration: profileDuration
            });
          } else {
            results.push({
              name: 'Profile Database Access',
              status: 'warning',
              message: `No profile found (${profileDuration}ms)`,
              details: 'Profile may need to be created',
              duration: profileDuration
            });
          }
        } catch (error) {
          results.push({
            name: 'Profile Database Access',
            status: 'error',
            message: 'Profile check error',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        results.push({
          name: 'Profile Database Access',
          status: 'warning',
          message: 'Skipped (not authenticated)',
          details: 'User must be signed in to check profile access'
        });
      }

      // 5. Check auth context state
      results.push({
        name: 'Auth Context State',
        status: loading ? 'warning' : (isAuthenticated ? 'success' : 'warning'),
        message: loading ? 'Still loading' : (isAuthenticated ? 'Authenticated' : 'Not authenticated'),
        details: `User: ${user?.email || 'none'}, Session: ${session ? 'active' : 'none'}`
      });

    } catch (error) {
      results.push({
        name: 'Diagnostic Error',
        status: 'error',
        message: 'Diagnostic check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const totalDuration = Date.now() - startTime;
    results.unshift({
      name: 'Overall Performance',
      status: totalDuration > 5000 ? 'warning' : 'success',
      message: `All checks completed in ${totalDuration}ms`,
      details: totalDuration > 5000 ? 'Slower than expected' : 'Within normal range',
      duration: totalDuration
    });

    setDiagnostics(results);
    setLastRunTime(new Date());
    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">OK</Badge>;
      case 'warning':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Warning</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Error</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Pending</Badge>;
    }
  };

  const clearTokensAndRefresh = () => {
    clearAuthTokens();
    toast.success('Tokens cleared. Page will refresh...');
    setTimeout(() => window.location.reload(), 1000);
  };

  // Auto-run diagnostics on component mount
  useEffect(() => {
    runDiagnostics();
  }, []);

  const successCount = diagnostics.filter(d => d.status === 'success').length;
  const warningCount = diagnostics.filter(d => d.status === 'warning').length;
  const errorCount = diagnostics.filter(d => d.status === 'error').length;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Authentication Diagnostics
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Last run: {lastRunTime?.toLocaleTimeString() || 'Never'}</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700">{successCount} OK</Badge>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">{warningCount} Warnings</Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700">{errorCount} Errors</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runDiagnostics} disabled={isRunning} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running Diagnostics...' : 'Run Diagnostics'}
          </Button>
          <Button variant="outline" onClick={clearTokensAndRefresh} className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Clear Tokens & Refresh
          </Button>
        </div>

        {errorCount > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {errorCount} error{errorCount > 1 ? 's' : ''} detected. Review the details below and consider clearing tokens if authentication issues persist.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          {diagnostics.map((result, index) => (
            <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
              {getStatusIcon(result.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{result.name}</span>
                  {getStatusBadge(result.status)}
                  {result.duration && (
                    <Badge variant="outline" className="text-xs">
                      {result.duration}ms
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {result.message}
                </div>
                {result.details && (
                  <div className="text-xs text-muted-foreground mt-1 opacity-75">
                    {result.details}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-xs text-muted-foreground">
          <p><strong>Quick Fixes:</strong></p>
          <ul className="mt-1 space-y-1">
            <li>• If connectivity fails: Check network connection and Supabase status</li>
            <li>• If session errors persist: Clear tokens and sign in again</li>
            <li>• If profile access fails: Verify database permissions and RLS policies</li>
            <li>• If performance is slow: Check network quality and Supabase region</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
