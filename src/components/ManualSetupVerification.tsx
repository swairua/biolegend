import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, RefreshCw, User, Copy } from 'lucide-react';
import { verifyManualSetup, testCoreSystemAfterSetup } from '@/utils/verifyManualSetup';
import { createSuperAdmin, SUPER_ADMIN_CREDENTIALS } from '@/utils/createSuperAdmin';
import { toast } from 'sonner';

export function ManualSetupVerification() {
  const [verification, setVerification] = useState<any>(null);
  const [coreTests, setCoreTests] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [adminCreated, setAdminCreated] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState(SUPER_ADMIN_CREDENTIALS);

  const runVerification = async () => {
    setIsVerifying(true);
    try {
      console.log('🔍 Verifying manual setup...');
      
      const verifyResult = await verifyManualSetup();
      setVerification(verifyResult);
      
      const testResult = await testCoreSystemAfterSetup();
      setCoreTests(testResult);
      
      if (verifyResult.systemReady && testResult.allWorking) {
        toast.success('🎉 System is fully operational!');
      } else if (verifyResult.databaseWorking) {
        toast.success('✅ Database is working! Ready for admin creation.');
      } else {
        toast.warning('⚠️ Some issues found - check details below');
      }
    } catch (error) {
      console.error('Verification failed:', error);
      toast.error('Verification failed - check console');
    } finally {
      setIsVerifying(false);
    }
  };

  const createAdmin = async () => {
    setIsCreatingAdmin(true);
    try {
      const result = await createSuperAdmin();

      if (result.success) {
        setAdminCreated(true);
        // Update credentials with the successful email
        if (result.credentials) {
          setAdminCredentials(result.credentials);
        }
        toast.success('Super admin created successfully!');
        // Re-run verification to update status
        await runVerification();
      } else {
        // Check if this is an email confirmation issue
        if (result.errorType === 'EMAIL_CONFIRMATION_REQUIRED') {
          toast.error('Email confirmation required');
          setTimeout(() => {
            window.location.href = '/email-confirmation';
          }, 2000);
        } else {
          toast.error(`Admin creation failed: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Admin creation failed:', error);
      toast.error('Admin creation failed');
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const copyCredentials = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Auto-run verification on mount with delay to prevent setState during render
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only run if component is still mounted and no verification is running
      if (!isVerifying && !verification) {
        runVerification();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [isVerifying, verification]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            Manual Setup Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-green-600">
              Checking the status after your manual SQL execution...
            </p>
            <Button 
              onClick={runVerification} 
              disabled={isVerifying}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isVerifying ? 'animate-spin' : ''}`} />
              {isVerifying ? 'Checking...' : 'Re-check'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Verification Results */}
      {verification && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Database Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Database Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Quotation Tax Columns</span>
                  <Badge variant={verification.databaseStatus.quotationTaxColumns ? 'default' : 'destructive'}>
                    {verification.databaseStatus.quotationTaxColumns ? '✅ Working' : '❌ Missing'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Invoice Tax Columns</span>
                  <Badge variant={verification.databaseStatus.invoiceTaxColumns ? 'default' : 'destructive'}>
                    {verification.databaseStatus.invoiceTaxColumns ? '✅ Working' : '❌ Missing'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">LPO Tables</span>
                  <Badge variant={verification.databaseStatus.lpoTables ? 'default' : 'secondary'}>
                    {verification.databaseStatus.lpoTables ? '✅ Working' : '➖ Optional'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">RPC Functions</span>
                  <Badge variant={verification.databaseStatus.rpcFunctions ? 'default' : 'secondary'}>
                    {verification.databaseStatus.rpcFunctions ? '✅ Working' : '➖ Optional'}
                  </Badge>
                </div>
              </div>
              
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Overall Database</span>
                  <Badge variant={verification.databaseWorking ? 'default' : 'destructive'}>
                    {verification.databaseWorking ? '✅ Working' : '❌ Needs fixes'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auth & Admin Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Authentication Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Auth Connection</span>
                  <Badge variant={verification.authStatus.connectionWorking ? 'default' : 'destructive'}>
                    {verification.authStatus.connectionWorking ? '✅ Working' : '❌ Failed'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Super Admin User</span>
                  <Badge variant={verification.authStatus.adminUserExists ? 'default' : 'destructive'}>
                    {verification.authStatus.adminUserExists ? '✅ Exists' : '❌ Missing'}
                  </Badge>
                </div>
              </div>
              
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-medium">System Ready</span>
                  <Badge variant={verification.systemReady ? 'default' : 'destructive'}>
                    {verification.systemReady ? '✅ Ready' : '❌ Needs setup'}
                  </Badge>
                </div>
              </div>

              {!verification.authStatus.adminUserExists && (
                <div className="pt-3">
                  <Button 
                    onClick={createAdmin}
                    disabled={isCreatingAdmin}
                    className="w-full"
                    size="sm"
                  >
                    <User className="h-4 w-4 mr-2" />
                    {isCreatingAdmin ? 'Creating...' : 'Create Super Admin'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Core System Tests */}
      {coreTests && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Core System Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <Badge variant={coreTests.quotationCreation ? 'default' : 'destructive'} className="w-full">
                  {coreTests.quotationCreation ? '✅' : '❌'} Quotations
                </Badge>
              </div>
              <div className="text-center">
                <Badge variant={coreTests.inventoryAccess ? 'default' : 'destructive'} className="w-full">
                  {coreTests.inventoryAccess ? '✅' : '❌'} Inventory
                </Badge>
              </div>
              <div className="text-center">
                <Badge variant={coreTests.customerAccess ? 'default' : 'destructive'} className="w-full">
                  {coreTests.customerAccess ? '✅' : '❌'} Customers
                </Badge>
              </div>
            </div>
            
            <div className="text-center text-sm text-gray-600">
              {coreTests.summary} • {coreTests.allWorking ? 'All systems operational!' : 'Some systems need attention'}
            </div>

            {coreTests.errors.length > 0 && (
              <div className="mt-4 space-y-1">
                <h4 className="font-medium text-red-700">Issues Found:</h4>
                {coreTests.errors.map((error: string, index: number) => (
                  <div key={index} className="text-sm text-red-600">• {error}</div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Success Messages */}
      {verification && verification.successes.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700">✅ Working Systems</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {verification.successes.map((success: string, index: number) => (
                <div key={index} className="text-sm text-green-700">{success}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issues & Next Steps */}
      {verification && verification.issues.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">❌ Issues Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              {verification.issues.map((issue: string, index: number) => (
                <div key={index} className="text-sm text-red-700">{issue}</div>
              ))}
            </div>

            {verification.nextSteps.length > 0 && (
              <div>
                <h4 className="font-medium text-red-700 mb-2">Next Steps:</h4>
                <div className="space-y-1">
                  {verification.nextSteps.map((step: string, index: number) => (
                    <div key={index} className="text-sm text-red-600">• {step}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin Credentials */}
      {adminCreated && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-700">🔐 Super Admin Credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Save these credentials:</strong> You'll need them to sign in to the system.
              </AlertDescription>
            </Alert>

            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 bg-white border rounded">
                <div>
                  <label className="text-xs font-medium text-gray-500">Email</label>
                  <p className="font-mono text-sm">{adminCredentials.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyCredentials(adminCredentials.email, 'Email')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-white border rounded">
                <div>
                  <label className="text-xs font-medium text-gray-500">Password</label>
                  <p className="font-mono text-sm">{adminCredentials.password}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyCredentials(adminCredentials.password, 'Password')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Status */}
      {verification && verification.systemReady && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700">🎉 Setup Complete!</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-green-200 bg-white">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Excellent! Your manual SQL execution was successful and the system is now fully operational.
                You can start using all features including quotations, invoices, and inventory management.
              </AlertDescription>
            </Alert>
            
            <div className="mt-4">
              <Button
                onClick={() => window.location.href = '/'}
                className="w-full"
                size="lg"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
