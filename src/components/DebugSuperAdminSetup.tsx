import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, Key, Mail, Copy, CheckCircle, AlertTriangle, Bug, Database } from 'lucide-react';
import { createSuperAdmin, SUPER_ADMIN_CREDENTIALS } from '@/utils/createSuperAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function DebugSuperAdminSetup() {
  const [isCreating, setIsCreating] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupResult, setSetupResult] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const runDatabaseChecks = async () => {
    const checks = {
      authConnection: false,
      profilesTable: false,
      userPermissionsTable: false,
      existingUser: null,
      errors: [] as string[]
    };

    try {
      // Test auth connection
      const { data: authData } = await supabase.auth.getSession();
      checks.authConnection = true;
    } catch (error) {
      checks.errors.push(`Auth connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // Test profiles table
      await supabase.from('profiles').select('id').limit(1);
      checks.profilesTable = true;
    } catch (error) {
      checks.errors.push(`Profiles table check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // Test user_permissions table
      await supabase.from('user_permissions').select('id').limit(1);
      checks.userPermissionsTable = true;
    } catch (error) {
      checks.errors.push(`User permissions table check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // Check if admin user already exists
      const { data: existingUser, error } = await supabase
        .from('profiles')
        .select('id, email, role, status')
        .eq('email', SUPER_ADMIN_CREDENTIALS.email)
        .single();

      if (!error && existingUser) {
        checks.existingUser = existingUser;
      }
    } catch (error) {
      // User doesn't exist, which is fine
    }

    return checks;
  };

  const handleCreateSuperAdmin = async () => {
    setIsCreating(true);
    setSetupResult(null);
    setDebugInfo(null);

    try {
      // Run database checks first
      console.log('🔍 Running pre-creation database checks...');
      const preChecks = await runDatabaseChecks();
      
      console.log('📊 Database checks result:', preChecks);
      setDebugInfo({ preChecks });

      // Attempt super admin creation
      console.log('🚀 Creating super admin...');
      const result = await createSuperAdmin();
      
      console.log('📋 Super admin creation result:', result);
      setSetupResult(result);

      if (result.success) {
        setSetupComplete(true);
        toast.success('Super admin created successfully!');
        
        // Run post-creation checks
        console.log('🔍 Running post-creation verification...');
        const postChecks = await runDatabaseChecks();
        setDebugInfo(prev => ({ ...prev, postChecks }));
      } else {
        toast.error(`Setup failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Setup error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSetupResult({ success: false, error: errorMessage });
      toast.error('An unexpected error occurred during setup');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    }).catch(() => {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    });
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bug className="h-6 w-6 text-primary" />
          <span>Debug Super Admin Setup</span>
          {setupComplete && (
            <Badge variant="outline" className="bg-success-light text-success border-success/20">
              <CheckCircle className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Enhanced super admin creation with detailed debugging information and error reporting.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Debug Information */}
        {debugInfo && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Status
            </h3>
            
            {/* Pre-creation checks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Database Connectivity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Auth Connection</span>
                    <Badge variant={debugInfo.preChecks.authConnection ? "default" : "destructive"}>
                      {debugInfo.preChecks.authConnection ? 'OK' : 'Failed'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Profiles Table</span>
                    <Badge variant={debugInfo.preChecks.profilesTable ? "default" : "destructive"}>
                      {debugInfo.preChecks.profilesTable ? 'OK' : 'Missing'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Permissions Table</span>
                    <Badge variant={debugInfo.preChecks.userPermissionsTable ? "default" : "destructive"}>
                      {debugInfo.preChecks.userPermissionsTable ? 'OK' : 'Missing'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Existing User Check</CardTitle>
                </CardHeader>
                <CardContent>
                  {debugInfo.preChecks.existingUser ? (
                    <div className="space-y-2">
                      <Badge variant="outline" className="bg-warning-light text-warning">
                        User Exists
                      </Badge>
                      <div className="text-xs space-y-1">
                        <div>ID: {debugInfo.preChecks.existingUser.id}</div>
                        <div>Role: {debugInfo.preChecks.existingUser.role}</div>
                        <div>Status: {debugInfo.preChecks.existingUser.status}</div>
                      </div>
                    </div>
                  ) : (
                    <Badge variant="default">No Existing User</Badge>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Errors */}
            {debugInfo.preChecks.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div>
                    <strong>Database Issues Found:</strong>
                    <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                      {debugInfo.preChecks.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Setup Result */}
        {setupResult && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Setup Result</h3>
            
            {setupResult.success ? (
              <Alert className="border-success bg-success-light">
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  <strong>Success!</strong> {setupResult.message}
                  {setupResult.details && (
                    <div className="mt-2 text-sm">
                      <div>User ID: {setupResult.details.userId}</div>
                      <div>Email: {setupResult.details.email}</div>
                      <div>Permissions: {setupResult.details.permissionsGranted} granted</div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Setup Failed:</strong> {setupResult.error}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Credentials Display */}
        {setupComplete && setupResult?.success && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-destructive">
              🔐 Super Admin Credentials
            </h3>
            
            <Alert className="border-destructive bg-destructive-light">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                <strong>IMPORTANT:</strong> Save these credentials securely and change the password after first login!
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="font-mono text-sm">{SUPER_ADMIN_CREDENTIALS.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(SUPER_ADMIN_CREDENTIALS.email, 'Email')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Password</label>
                  <p className="font-mono text-sm">{SUPER_ADMIN_CREDENTIALS.password}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(SUPER_ADMIN_CREDENTIALS.password, 'Password')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button
              onClick={() => window.location.href = '/'}
              className="w-full"
              size="lg"
            >
              Go to Dashboard & Sign In
            </Button>
          </div>
        )}

        {/* Action Button */}
        {!setupComplete && (
          <Button 
            onClick={handleCreateSuperAdmin}
            disabled={isCreating}
            className="w-full"
            size="lg"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creating Super Admin...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Create Super Admin (Debug Mode)
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
