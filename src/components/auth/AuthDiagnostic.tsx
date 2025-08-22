import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ADMIN_CREDENTIALS } from '@/utils/createStreamlinedSuperAdmin';
import { createSimpleAdminProfile } from '@/utils/simpleAdminProfileCreator';
import { checkProfilesSchema, getWorkingProfileFields } from '@/utils/schemaChecker';
import { toast } from 'sonner';

interface AuthDiagnosticProps {
  onBack?: () => void;
}

export function AuthDiagnostic({ onBack }: AuthDiagnosticProps) {
  const { signIn, user, profile, isAuthenticated, loading } = useAuth();
  const [diagnostics, setDiagnostics] = useState<any>({});
  const [isRunning, setIsRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isFixingProfile, setIsFixingProfile] = useState(false);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: any = {};

    try {
      // Test 1: Check Supabase connection
      console.log('🔍 Testing Supabase connection...');
      try {
        const { data, error } = await supabase.from('profiles').select('id').limit(1);
        results.connection = { success: !error, error: error?.message, data: data?.length || 0 };
      } catch (err) {
        results.connection = { success: false, error: String(err) };
      }

      // Test 2: Check if admin user exists in profiles
      console.log('🔍 Checking if admin profile exists...');
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', ADMIN_CREDENTIALS.email)
          .maybeSingle(); // Use maybeSingle to handle 0 results gracefully

        results.adminProfile = {
          exists: !!data && !error,
          error: error?.message,
          data: data ? {
            id: data.id,
            email: data.email,
            role: data.role,
            status: data.status
          } : null
        };

        console.log('Admin profile check result:', {
          exists: !!data && !error,
          data: data ? 'Found' : 'Not found',
          error: error?.message
        });
      } catch (err) {
        console.error('Admin profile check exception:', err);
        results.adminProfile = { exists: false, error: String(err) };
      }

      // Test 3: Try to get current session
      console.log('🔍 Checking current session...');
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        results.session = {
          exists: !!sessionData.session,
          error: sessionError?.message,
          user: sessionData.session?.user ? {
            id: sessionData.session.user.id,
            email: sessionData.session.user.email,
            email_confirmed_at: sessionData.session.user.email_confirmed_at
          } : null
        };
      } catch (err) {
        results.session = { exists: false, error: String(err) };
      }

      // Test 4: Try auth check without actual sign in (to avoid redirects)
      console.log('🔍 Testing auth credentials...');
      try {
        // Check if we can attempt sign in (this will tell us about email confirmation issues)
        const { error } = await supabase.auth.signInWithPassword({
          email: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });

        results.signIn = {
          success: !error,
          error: error?.message
        };

        // If successful, immediately sign out to avoid staying logged in during diagnostic
        if (!error) {
          await supabase.auth.signOut();
        }
      } catch (err) {
        results.signIn = { success: false, error: String(err) };
      }

      // Test 5: Check profiles table schema
      console.log('🔍 Checking profiles table schema...');
      try {
        const schemaData = await checkProfilesSchema();
        results.schema = {
          success: !!schemaData,
          columns: schemaData || [],
          columnCount: schemaData?.length || 0
        };
      } catch (err) {
        results.schema = { success: false, error: String(err) };
      }

      setDiagnostics(results);
      console.log('🔍 Diagnostic results:', results);

    } catch (error) {
      console.error('Diagnostic error:', error);
      toast.error('Diagnostic failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleFixProfile = async () => {
    setIsFixingProfile(true);
    try {
      console.log('🔧 Starting profile fix with schema awareness...');

      // First check what fields work with the current schema
      if (diagnostics.schema?.success) {
        console.log('Using schema-aware profile creation...');
        const workingFields = await getWorkingProfileFields('26387426-a501-4398-90a7-7a7815c2217a');
        console.log('Working fields for profile:', workingFields);
      }

      const result = await createSimpleAdminProfile();
      if (result.success) {
        toast.success('Admin profile created! Running diagnostics again...');
        // Wait a moment then re-run diagnostics
        setTimeout(() => {
          runDiagnostics();
        }, 1000);
      } else {
        toast.error(`Profile fix failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Profile fix error:', error);
      toast.error('Failed to fix admin profile');
    } finally {
      setIsFixingProfile(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (success: boolean) => {
    return (
      <Badge variant={success ? "default" : "destructive"}>
        {success ? "PASS" : "FAIL"}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Authentication Diagnostics
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Diagnosing authentication issues to identify the root cause
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Current Auth State */}
          <Alert className={user ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <AlertTriangle className={`h-4 w-4 ${user ? "text-green-600" : "text-red-600"}`} />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Current Authentication State:</p>
                <p>Loading: {loading ? "Yes" : "No"}</p>
                <p>Authenticated: {isAuthenticated ? "Yes" : "No"}</p>
                <p>User: {user ? user.email : "None"}</p>
                <p>Profile: {profile ? `${profile.role} (${profile.status})` : "None"}</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Diagnostic Results */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Diagnostic Tests</h3>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowDetails(!showDetails)}
                  variant="outline"
                  size="sm"
                >
                  {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showDetails ? "Hide" : "Show"} Details
                </Button>
                <Button
                  onClick={runDiagnostics}
                  disabled={isRunning}
                  size="sm"
                >
                  {isRunning ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Run Tests
                </Button>
              </div>
            </div>

            {Object.keys(diagnostics).length > 0 && (
              <div className="space-y-3">
                {/* Connection Test */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.connection?.success)}
                    <span className="font-medium">Database Connection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(diagnostics.connection?.success)}
                    {showDetails && diagnostics.connection?.error && (
                      <span className="text-xs text-red-600">{diagnostics.connection.error}</span>
                    )}
                  </div>
                </div>

                {/* Admin Profile Test */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.adminProfile?.exists)}
                    <span className="font-medium">Admin Profile Exists</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(diagnostics.adminProfile?.exists)}
                    {showDetails && diagnostics.adminProfile?.data && (
                      <div className="text-xs text-gray-600">
                        Role: {diagnostics.adminProfile.data.role}, 
                        Status: {diagnostics.adminProfile.data.status}
                      </div>
                    )}
                  </div>
                </div>

                {/* Session Test */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.session?.exists)}
                    <span className="font-medium">Current Session</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(diagnostics.session?.exists)}
                    {showDetails && diagnostics.session?.user && (
                      <div className="text-xs text-gray-600">
                        Email: {diagnostics.session.user.email}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sign In Test */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.signIn?.success)}
                    <span className="font-medium">Sign In Test</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(diagnostics.signIn?.success)}
                    {showDetails && diagnostics.signIn?.error && (
                      <span className="text-xs text-red-600">{diagnostics.signIn.error}</span>
                    )}
                  </div>
                </div>

                {/* Schema Test */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.schema?.success)}
                    <span className="font-medium">Profiles Schema</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(diagnostics.schema?.success)}
                    {showDetails && diagnostics.schema?.columnCount && (
                      <div className="text-xs text-gray-600">
                        {diagnostics.schema.columnCount} columns found
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {/* Specific Error Guidance */}
            {diagnostics.signIn?.error?.includes('Email not confirmed') && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  <div className="space-y-2">
                    <p><strong>🔧 Fix Required: Email Confirmation</strong></p>
                    <p className="text-sm">Go to Supabase Dashboard → Auth → Users → Find "{ADMIN_CREDENTIALS.email}" → Click "Confirm email"</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {!diagnostics.connection?.success && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  <strong>🚫 Database Connection Failed:</strong> Check your Supabase configuration and network connection.
                </AlertDescription>
              </Alert>
            )}

            {!diagnostics.adminProfile?.exists && diagnostics.connection?.success && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 space-y-3">
                  <div>
                    <p><strong>👤 Admin Profile Missing:</strong> The admin user exists in Supabase Auth but not in the profiles table.</p>
                    <p className="text-sm">This is the exact cause of the "Error fetching profile" and "0 rows" errors you're seeing.</p>
                    <div className="text-xs bg-blue-100 p-2 rounded mt-2">
                      <p><strong>What happens when you click fix:</strong></p>
                      <ol className="mt-1 space-y-1">
                        <li>1. Get the admin user ID from Supabase Auth</li>
                        <li>2. Create the missing profile record in profiles table</li>
                        <li>3. Set role=admin, status=active, email={ADMIN_CREDENTIALS.email}</li>
                        <li>4. Grant basic admin permissions</li>
                        <li>5. Re-run diagnostics to confirm success</li>
                      </ol>
                    </div>
                  </div>
                  <Button
                    onClick={handleFixProfile}
                    disabled={isFixingProfile}
                    size="sm"
                    className="w-full"
                  >
                    {isFixingProfile ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Creating Admin Profile...
                      </>
                    ) : (
                      '🔧 Fix: Create Admin Profile'
                    )}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {onBack && (
                <Button
                  onClick={onBack}
                  variant="outline"
                  className="w-full"
                >
                  ← Back to Login
                </Button>
              )}
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Refresh & Retry
              </Button>
            </div>
          </div>

          {showDetails && diagnostics && (
            <details className="text-xs bg-gray-50 p-3 rounded">
              <summary className="cursor-pointer font-medium">Raw Diagnostic Data</summary>
              <pre className="mt-2 whitespace-pre-wrap">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
