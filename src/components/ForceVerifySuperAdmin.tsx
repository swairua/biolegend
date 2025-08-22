import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, AlertTriangle, Zap, Key, Mail, Copy } from 'lucide-react';
import { forceVerifySuperAdmin, setupSuperAdminWithForceVerify, SUPER_ADMIN_CREDENTIALS } from '@/utils/forceVerifySuperAdmin';
import { toast } from 'sonner';

export function ForceVerifySuperAdmin() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [needsManualIntervention, setNeedsManualIntervention] = useState(false);
  const [manualInstructions, setManualInstructions] = useState('');

  const handleForceVerify = async () => {
    setIsProcessing(true);
    setNeedsManualIntervention(false);
    
    try {
      const result = await setupSuperAdminWithForceVerify();
      
      if (result.success) {
        setVerificationComplete(true);
        setShowCredentials(true);
        toast.success('Super admin verified and ready to use!');
      } else if (result.needsEmailConfirmation) {
        setNeedsManualIntervention(true);
        setManualInstructions(result.error || '');
        toast.warning('Manual email confirmation required');
      } else {
        toast.error(`Force verification failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Force verification error:', error);
      toast.error('An unexpected error occurred during force verification');
    } finally {
      setIsProcessing(false);
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
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-6 w-6 text-primary" />
          <span>Force Verify Super Admin</span>
          {verificationComplete && (
            <Badge variant="outline" className="bg-success-light text-success border-success/20">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Bypass email verification for the super admin account to get immediate access to the system.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!verificationComplete && !needsManualIntervention ? (
          <>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                This will create or force verify the super administrator account, bypassing email verification requirements.
                The super admin will be able to sign in immediately.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">What this will do:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Create super admin if it doesn't exist</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Force verify email without confirmation link</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span>Set admin role with full system permissions</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Key className="h-4 w-4 text-purple-500" />
                  <span>Enable immediate sign-in capability</span>
                </li>
              </ul>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Super Admin Credentials:</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Email:</strong> {SUPER_ADMIN_CREDENTIALS.email}</p>
                <p><strong>Password:</strong> {SUPER_ADMIN_CREDENTIALS.password}</p>
              </div>
            </div>

            <Button 
              onClick={handleForceVerify}
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Force Verifying Super Admin...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Force Verify Super Admin
                </>
              )}
            </Button>
          </>
        ) : needsManualIntervention ? (
          <div className="space-y-6">
            <Alert className="border-warning bg-warning-light">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning">
                <strong>Manual Email Confirmation Required</strong>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Manual Steps Required:</h3>
              
              <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-line">
                {manualInstructions}
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Option 1: Disable Email Confirmation (Recommended)</h4>
                <ol className="text-sm text-muted-foreground space-y-1 pl-4">
                  <li>1. Go to your Supabase Dashboard</li>
                  <li>2. Navigate to Authentication → Settings</li>
                  <li>3. Scroll to "Email Auth"</li>
                  <li>4. Turn OFF "Enable email confirmations"</li>
                  <li>5. Save settings</li>
                  <li>6. Click "Try Again" below</li>
                </ol>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Option 2: Manually Confirm Email</h4>
                <ol className="text-sm text-muted-foreground space-y-1 pl-4">
                  <li>1. Go to your Supabase Dashboard</li>
                  <li>2. Navigate to Authentication → Users</li>
                  <li>3. Find user: {SUPER_ADMIN_CREDENTIALS.email}</li>
                  <li>4. Click on the user</li>
                  <li>5. Click "Confirm email"</li>
                  <li>6. Click "Try Again" below</li>
                </ol>
              </div>

              <Button 
                onClick={handleForceVerify}
                disabled={isProcessing}
                className="w-full"
                variant="outline"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Retrying...
                  </>
                ) : (
                  'Try Again After Manual Steps'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Alert className="border-success bg-success-light">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                Super admin email has been force verified successfully! You can now sign in immediately.
              </AlertDescription>
            </Alert>

            {showCredentials && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-success">
                  ✅ Super Admin Ready!
                </h3>
                
                <Alert className="border-primary bg-primary-light">
                  <Shield className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-primary">
                    <strong>SUCCESS:</strong> Super admin can now sign in without email verification!
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

                <div className="pt-4 border-t space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-green-600">✅ Status</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Email verified</li>
                        <li>• Admin role assigned</li>
                        <li>• Full permissions granted</li>
                        <li>• Ready to sign in</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-blue-600">🚀 Next Steps</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Sign in with credentials above</li>
                        <li>• Change password (recommended)</li>
                        <li>• Set up company information</li>
                        <li>• Create additional users</li>
                      </ul>
                    </div>
                  </div>

                  <Button
                    onClick={() => window.location.href = '/'}
                    className="w-full"
                    size="lg"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Go to Dashboard & Sign In
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
