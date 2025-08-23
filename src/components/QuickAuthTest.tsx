import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Key } from 'lucide-react';
import { toast } from 'sonner';

export function QuickAuthTest() {
  const { signIn, isAuthenticated, user, loading } = useAuth();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const adminCredentials = {
    email: 'admin@biolegendscientific.co.ke',
    password: 'Biolegend2024!Admin'
  };

  const runDiagnostics = async () => {
    setTesting(true);
    setResults(null);

    const diagnostics = {
      supabaseConnection: false,
      authProvider: false,
      adminLogin: false,
      error: null as any
    };

    try {
      // Test 1: Supabase connection
      const { data: healthCheck } = await supabase.from('profiles').select('count').limit(1);
      diagnostics.supabaseConnection = true;
      console.log('✅ Supabase connection successful');

      // Test 2: Try admin login
      const { error: loginError } = await signIn(adminCredentials.email, adminCredentials.password);
      
      if (loginError) {
        diagnostics.error = loginError;
        console.error('❌ Admin login failed:', loginError.message);
        
        if (loginError.message.includes('Email logins are disabled')) {
          diagnostics.authProvider = false;
          toast.error('Email authentication is disabled in Supabase');
        } else if (loginError.message.includes('Invalid login credentials')) {
          diagnostics.authProvider = true; // Provider works, just wrong credentials
          toast.error('Admin user might not exist or wrong credentials');
        }
      } else {
        diagnostics.authProvider = true;
        diagnostics.adminLogin = true;
        console.log('✅ Admin login successful');
        toast.success('Admin login successful!');
      }

    } catch (error: any) {
      diagnostics.error = error;
      console.error('❌ Diagnostics failed:', error);
      toast.error('Diagnostics failed: ' + error.message);
    }

    setResults(diagnostics);
    setTesting(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Quick Authentication Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="space-y-2">
          <h3 className="font-semibold">Current Status:</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant={isAuthenticated ? "default" : "secondary"}>
              {isAuthenticated ? "Authenticated" : "Not Authenticated"}
            </Badge>
            <Badge variant={loading ? "outline" : "secondary"}>
              {loading ? "Loading..." : "Ready"}
            </Badge>
            {user && (
              <Badge variant="outline">
                {user.email}
              </Badge>
            )}
          </div>
        </div>

        {/* Admin Credentials */}
        <Alert>
          <Key className="h-4 w-4" />
          <AlertDescription>
            <strong>Admin Credentials:</strong><br />
            Email: {adminCredentials.email}<br />
            Password: {adminCredentials.password}
          </AlertDescription>
        </Alert>

        {/* Test Button */}
        <Button 
          onClick={runDiagnostics} 
          disabled={testing || loading}
          className="w-full"
        >
          {testing ? "Running Diagnostics..." : "Test Authentication"}
        </Button>

        {/* Results */}
        {results && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold">Diagnostic Results:</h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {results.supabaseConnection ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Supabase Connection</span>
              </div>

              <div className="flex items-center gap-2">
                {results.authProvider ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Email Authentication Provider</span>
              </div>

              <div className="flex items-center gap-2">
                {results.adminLogin ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Admin Login</span>
              </div>
            </div>

            {results.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error:</strong> {results.error.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Recommendations */}
            <div className="mt-4 p-3 bg-background rounded border">
              <h4 className="font-semibold mb-2">Next Steps:</h4>
              {results.error?.message.includes('Email logins are disabled') && (
                <p className="text-sm text-muted-foreground">
                  ❌ Email authentication is disabled in Supabase. Go to: 
                  <br />Supabase Dashboard → Authentication → Settings → Auth Providers → Enable Email
                </p>
              )}
              {results.error?.message.includes('Invalid login credentials') && (
                <p className="text-sm text-muted-foreground">
                  ⚠️ Email auth is enabled but admin user doesn't exist or credentials are wrong.
                  <br />Create admin user in Supabase Dashboard → Authentication → Users
                </p>
              )}
              {results.adminLogin && (
                <p className="text-sm text-green-600">
                  ✅ Everything is working! You should be logged in now.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
