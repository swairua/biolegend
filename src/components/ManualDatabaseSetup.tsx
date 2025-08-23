import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, User, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { createSuperAdmin } from '@/utils/createSuperAdmin';
import { forceAllMigrations } from '@/utils/forceAllMigrations';
import { forceInitialSetup } from '@/utils/forceInitialSetup';

export function ManualDatabaseSetup() {
  const [isRunning, setIsRunning] = useState(false);
  const [setupResults, setSetupResults] = useState<any>(null);
  const [step, setStep] = useState<string>('');

  const runCompleteSetup = async () => {
    setIsRunning(true);
    setSetupResults(null);
    
    try {
      // Step 1: Force all migrations
      setStep('Creating database tables...');
      console.log('🚀 Running complete database migration...');
      const migrationResult = await forceAllMigrations();
      
      if (!migrationResult.success) {
        throw new Error(`Migration failed: ${migrationResult.message}`);
      }

      // Step 2: Run initial setup (creates super admin)
      setStep('Creating super admin account...');
      console.log('👤 Creating super admin...');
      const setupResult = await forceInitialSetup();
      
      setSetupResults({
        migration: migrationResult,
        setup: setupResult,
        success: true
      });

      toast.success('🎉 Database setup completed successfully!');
      
    } catch (error) {
      console.error('❌ Setup failed:', error);
      setSetupResults({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
      toast.error('Setup failed. Check console for details.');
    } finally {
      setIsRunning(false);
      setStep('');
    }
  };

  const runTablesOnly = async () => {
    setIsRunning(true);
    setStep('Creating database tables...');
    
    try {
      const result = await forceAllMigrations();
      setSetupResults({ migration: result, success: result.success });
      
      if (result.success) {
        toast.success('Database tables created successfully!');
      } else {
        toast.error('Failed to create tables. Check console for details.');
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
      setSetupResults({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
      toast.error('Migration failed. Check console for details.');
    } finally {
      setIsRunning(false);
      setStep('');
    }
  };

  const runAdminOnly = async () => {
    setIsRunning(true);
    setStep('Creating super admin account...');
    
    try {
      const result = await createSuperAdmin();
      setSetupResults({ admin: result, success: result.success });
      
      if (result.success) {
        toast.success('Super admin created successfully!');
      } else {
        toast.error('Failed to create admin. Check console for details.');
      }
    } catch (error) {
      console.error('❌ Admin creation failed:', error);
      setSetupResults({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
      toast.error('Admin creation failed. Check console for details.');
    } finally {
      setIsRunning(false);
      setStep('');
    }
  };

  const copyCredentials = () => {
    const credentials = `Email: superadmin@medplusafrica.co\nPassword: MedPlus2024!Admin`;
    navigator.clipboard.writeText(credentials);
    toast.success('Credentials copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Database Setup</h1>
          <p className="text-muted-foreground">
            Manual database initialization for Biolegend Scientific Ltd
          </p>
        </div>

        {/* Setup Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Database Setup Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Button
                onClick={runCompleteSetup}
                disabled={isRunning}
                className="h-auto p-4 flex flex-col items-center space-y-2"
                variant="default"
              >
                {isRunning ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                <span className="font-medium">Complete Setup</span>
                <span className="text-xs text-center">
                  Create tables + admin account
                </span>
              </Button>

              <Button
                onClick={runTablesOnly}
                disabled={isRunning}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2"
              >
                {isRunning ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Database className="h-5 w-5" />
                )}
                <span className="font-medium">Tables Only</span>
                <span className="text-xs text-center">
                  Create database schema
                </span>
              </Button>

              <Button
                onClick={runAdminOnly}
                disabled={isRunning}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2"
              >
                {isRunning ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <User className="h-5 w-5" />
                )}
                <span className="font-medium">Admin Only</span>
                <span className="text-xs text-center">
                  Create super admin account
                </span>
              </Button>
            </div>

            {isRunning && step && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>{step}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Default Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Default Admin Credentials</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Email:</span>
                  <code className="text-sm">superadmin@medplusafrica.co</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Password:</span>
                  <code className="text-sm">MedPlus2024!Admin</code>
                </div>
              </div>
            </div>
            <Button onClick={copyCredentials} variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Copy Credentials
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {setupResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {setupResults.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span>Setup Results</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {setupResults.success ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Setup completed successfully!</strong>
                    <br />
                    You can now log in with the admin credentials above.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>Setup failed:</strong>
                    <br />
                    {setupResults.error}
                  </AlertDescription>
                </Alert>
              )}

              {setupResults.migration && (
                <div className="space-y-2">
                  <Badge variant={setupResults.migration.success ? "default" : "destructive"}>
                    Tables: {setupResults.migration.success ? "Created" : "Failed"}
                  </Badge>
                  {setupResults.migration.tablesCreated && (
                    <p className="text-sm text-muted-foreground">
                      Created {setupResults.migration.tablesCreated.length} tables
                    </p>
                  )}
                </div>
              )}

              {setupResults.setup && (
                <div className="space-y-2">
                  <Badge variant={setupResults.setup.adminCreated ? "default" : "destructive"}>
                    Admin: {setupResults.setup.adminCreated ? "Created" : "Failed"}
                  </Badge>
                  {setupResults.setup.errors?.length > 0 && (
                    <div className="text-sm text-red-600">
                      Errors: {setupResults.setup.errors.join(', ')}
                    </div>
                  )}
                </div>
              )}

              {setupResults.admin && (
                <div className="space-y-2">
                  <Badge variant={setupResults.admin.success ? "default" : "destructive"}>
                    Admin: {setupResults.admin.success ? "Created" : "Failed"}
                  </Badge>
                  {setupResults.admin.error && (
                    <div className="text-sm text-red-600">
                      Error: {setupResults.admin.error}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              1. Run "Complete Setup" to create all database tables and admin account
            </p>
            <p className="text-sm text-muted-foreground">
              2. Navigate back to the login page and sign in with the admin credentials
            </p>
            <p className="text-sm text-muted-foreground">
              3. Go to Company Settings to set up your company information
            </p>
            <p className="text-sm text-muted-foreground">
              4. Start creating customers, products, and invoices
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
