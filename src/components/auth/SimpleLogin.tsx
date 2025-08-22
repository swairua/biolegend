import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Eye, EyeOff, Mail, Lock, Shield, AlertTriangle } from 'lucide-react';
import { BiolegendLogo } from '@/components/ui/biolegend-logo';
import { ADMIN_CREDENTIALS, executeStreamlinedSetup } from '@/utils/createStreamlinedSuperAdmin';
import { forceConfirmAdminEmail } from '@/utils/forceEmailConfirmation';
import { QuickEmailFix } from './QuickEmailFix';
import { AuthDiagnostic } from './AuthDiagnostic';
import { fixAuthenticationLoop, diagnoseAuthState } from '@/utils/fixAuthenticationLoop';
import { performCompleteLogin } from '@/utils/testLogin';
import { toast } from 'sonner';

export function SimpleLogin() {
  const { signIn, loading, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupAttempted, setSetupAttempted] = useState(false);
  const [emailConfirmationNeeded, setEmailConfirmationNeeded] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [isFixingAuth, setIsFixingAuth] = useState(false);
  const [isTestingLogin, setIsTestingLogin] = useState(false);

  // Auto-setup on component mount - only once
  useEffect(() => {
    const hasSetupAttempted = localStorage.getItem('admin_setup_attempted');

    if (!hasSetupAttempted && !setupAttempted && !isAuthenticated && !setupComplete) {
      setSetupAttempted(true);
      localStorage.setItem('admin_setup_attempted', 'true');
      handleAutoSetup();
    } else if (hasSetupAttempted) {
      setSetupAttempted(true);
      setSetupComplete(true);
      // Pre-fill the form with admin credentials
      setFormData({
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password
      });
    }
  }, [isAuthenticated, setupComplete, setupAttempted]);

  const handleAutoSetup = async () => {
    setIsSettingUp(true);
    try {
      console.log('🚀 Starting one-time admin setup...');
      const result = await executeStreamlinedSetup();
      if (result.success) {
        setSetupComplete(true);
        localStorage.setItem('admin_setup_complete', 'true');
        // Pre-fill the form with admin credentials for convenience
        setFormData({
          email: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password
        });
        toast.success('Admin account ready! You can now sign in.');
      } else {
        toast.error(`Setup issue: ${result.error}`);
        // Still allow manual sign-in attempt
        setSetupComplete(true);
        setFormData({
          email: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password
        });
      }
    } catch (error) {
      console.error('Auto-setup error:', error);
      toast.error('Setup encountered an issue, but you can still try to sign in');
      setSetupComplete(true);
      setFormData({
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const { error } = await signIn(formData.email, formData.password);
    
    if (error) {
      console.error('Sign in error:', error);

      // Handle email confirmation error specifically for admin
      if (error.message.includes('Email not confirmed') && formData.email === ADMIN_CREDENTIALS.email) {
        setEmailConfirmationNeeded(true);
        toast.error('Email confirmation required - showing fix instructions');
      } else {
        toast.error('Sign in failed. Please check your credentials or try the setup button below.');
      }
    } else {
      toast.success('Welcome to Biolegend Scientific!');
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const fillAdminCredentials = () => {
    setFormData({
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password
    });
    setFormErrors({});
  };

  const handleFixAuthentication = async () => {
    setIsFixingAuth(true);
    try {
      console.log('🔧 Starting authentication fix...');

      // Diagnose current state
      const diagnosis = await diagnoseAuthState();
      console.log('🔍 Auth diagnosis:', diagnosis);

      if (diagnosis.isAuthenticated) {
        toast.success('Authentication is already working! Refreshing page...');
        setTimeout(() => window.location.reload(), 1000);
        return;
      }

      // Apply fix
      const result = await fixAuthenticationLoop();

      if (result.success) {
        toast.success(result.message);
        if (result.needsReload) {
          toast.info('Refreshing page to apply changes...');
          setTimeout(() => window.location.reload(), 2000);
        }
      } else {
        toast.error(`Fix failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Authentication fix error:', error);
      toast.error('Authentication fix failed. Check console for details.');
    } finally {
      setIsFixingAuth(false);
    }
  };

  const handleTestLogin = async () => {
    setIsTestingLogin(true);
    try {
      console.log('🧪 Starting test login process...');
      toast.info('Testing login flow...');

      const result = await performCompleteLogin();

      if (result.success) {
        toast.success(result.message);
        if (result.authenticated) {
          toast.info('Login successful! Refreshing to show dashboard...');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          toast.info('Profile ready! Now try clicking Sign In button.');
        }
      } else {
        toast.error(`Test login failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Test login error:', error);
      toast.error('Test login failed. Check console for details.');
    } finally {
      setIsTestingLogin(false);
    }
  };

  if (isSettingUp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Setting up Biolegend Scientific</h3>
              <p className="text-sm text-muted-foreground">
                Creating admin account and configuring system...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showDiagnostic) {
    return (
      <AuthDiagnostic
        onBack={() => setShowDiagnostic(false)}
      />
    );
  }

  if (emailConfirmationNeeded) {
    return (
      <QuickEmailFix
        onRetry={() => {
          setEmailConfirmationNeeded(false);
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <BiolegendLogo size="lg" showText={false} />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold biolegend-brand">Biolegend Scientific Ltd</CardTitle>
            <p className="text-sm text-muted-foreground">
              Sign in to access your business management system
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {setupComplete && !isSettingUp && (
            <div className="bg-success-light border border-success/20 rounded-lg p-3 text-center">
              <p className="text-sm text-success">
                ✅ System ready! Use admin credentials to sign in.
              </p>
            </div>
          )}

          {isSettingUp && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-sm text-blue-700">
                ⚙️ Setting up admin account... This may take a moment.
              </p>
            </div>
          )}


          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  className={`pl-10 ${formErrors.email ? 'border-destructive' : ''}`}
                  disabled={loading}
                />
              </div>
              {formErrors.email && (
                <p className="text-sm text-destructive">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  className={`pl-10 pr-10 ${formErrors.password ? 'border-destructive' : ''}`}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {formErrors.password && (
                <p className="text-sm text-destructive">{formErrors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="space-y-2">
              {!isSettingUp && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={fillAdminCredentials}
                  disabled={loading}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Use Admin Credentials
                </Button>
              )}

              {setupComplete && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-700">
                    💡 If sign-in keeps returning to this form, click "Fix Authentication Loop"
                  </p>
                </div>
              )}

              {setupComplete && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    localStorage.removeItem('admin_setup_attempted');
                    localStorage.removeItem('admin_setup_complete');
                    setSetupAttempted(false);
                    setSetupComplete(false);
                    handleAutoSetup();
                  }}
                  disabled={loading || isSettingUp}
                >
                  {isSettingUp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up admin...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Retry Admin Setup
                    </>
                  )}
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowDiagnostic(true)}
                disabled={loading}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Run Authentication Diagnostics
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                onClick={handleFixAuthentication}
                disabled={loading || isFixingAuth || isTestingLogin}
              >
                {isFixingAuth ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fixing Authentication...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Fix Authentication Loop
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="default"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={handleTestLogin}
                disabled={loading || isFixingAuth || isTestingLogin}
              >
                {isTestingLogin ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing Login...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Test Complete Login Flow
                  </>
                )}
              </Button>
            </div>
          </form>

          {setupComplete && (
            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p>Admin Email: {ADMIN_CREDENTIALS.email}</p>
              <Button
                variant="link"
                size="sm"
                onClick={fillAdminCredentials}
                className="h-auto p-0 text-xs"
              >
                Fill credentials
              </Button>
            </div>
          )}

          <div className="text-center text-xs text-muted-foreground">
            <p>Only administrators can create new user accounts.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
