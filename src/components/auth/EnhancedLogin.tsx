import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  Shield, 
  AlertTriangle,
  Settings,
  Database
} from 'lucide-react';
import { BiolegendLogo } from '@/components/ui/biolegend-logo';
import { SupabaseConfigGuide } from './SupabaseConfigGuide';
import { toast } from 'sonner';

const ADMIN_CREDENTIALS = {
  email: 'admin@biolegendscientific.co.ke',
  password: 'Biolegend2024!Admin'
};

export function EnhancedLogin() {
  const { signIn, loading, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  // Auto-fill admin credentials
  useEffect(() => {
    setFormData({
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password
    });
  }, []);

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
      
      // Check for specific authentication errors
      if (error.message.includes('Email logins are disabled')) {
        setSignupError('Email/password authentication is disabled in Supabase');
        setShowConfigGuide(true);
        toast.error('Email logins are disabled. Check the Configuration Guide tab.');
      } else if (error.message.includes('Email signups are disabled') ||
          error.message.includes('Signups not allowed') ||
          error.message.includes('signup') && error.message.includes('disabled')) {
        setSignupError('Email signups are disabled in Supabase configuration');
        setShowConfigGuide(true);
        toast.error('Email signups are disabled. Check the Configuration Guide tab.');
      } else if (error.message.includes('Email not confirmed')) {
        setSignupError('Email confirmation required');
        setShowConfigGuide(true);
        toast.error('Email confirmation required. Check the Configuration Guide tab.');
      } else if (error.message.includes('Invalid login credentials')) {
        setSignupError('Admin user does not exist');
        setShowConfigGuide(true);
        toast.error('Admin user not found. Check the Configuration Guide tab.');
      } else {
        toast.error(`Sign in failed: ${error.message}`);
      }
    } else {
      setSignupError(null);
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

  if (showConfigGuide) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <div className="w-full max-w-4xl">
          <div className="mb-6 text-center">
            <BiolegendLogo size="lg" showText={false} />
            <h1 className="text-2xl font-bold mt-4 biolegend-brand">Biolegend Scientific Ltd</h1>
            <p className="text-muted-foreground">Configuration Required</p>
          </div>
          
          <Tabs defaultValue="guide" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="guide" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuration Guide
              </TabsTrigger>
              <TabsTrigger value="login" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Try Login Again
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="guide">
              <SupabaseConfigGuide />
              <div className="mt-6 text-center">
                <Button 
                  onClick={() => setShowConfigGuide(false)}
                  variant="outline"
                >
                  Return to Login
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Try Login Again</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        If you've completed the configuration steps, try logging in again with the admin credentials.
                      </AlertDescription>
                    </Alert>
                    
                    <LoginForm
                      formData={formData}
                      showPassword={showPassword}
                      formErrors={formErrors}
                      loading={loading}
                      onSubmit={handleSubmit}
                      onInputChange={handleInputChange}
                      onTogglePassword={() => setShowPassword(!showPassword)}
                      onFillCredentials={fillAdminCredentials}
                    />
                    
                    <div className="text-center">
                      <Button 
                        onClick={() => setShowConfigGuide(false)}
                        variant="outline"
                      >
                        Return to Login
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
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
          {signupError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Configuration Issue:</strong> {signupError}</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowConfigGuide(true)}
                    className="w-full"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Open Configuration Guide
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <LoginForm
            formData={formData}
            showPassword={showPassword}
            formErrors={formErrors}
            loading={loading}
            onSubmit={handleSubmit}
            onInputChange={handleInputChange}
            onTogglePassword={() => setShowPassword(!showPassword)}
            onFillCredentials={fillAdminCredentials}
          />

          <div className="space-y-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setShowConfigGuide(true)}
              disabled={loading}
            >
              <Settings className="mr-2 h-4 w-4" />
              Supabase Configuration Help
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>Admin Email: {ADMIN_CREDENTIALS.email}</p>
            <p>Having issues? Click "Configuration Help" above.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface LoginFormProps {
  formData: { email: string; password: string };
  showPassword: boolean;
  formErrors: Record<string, string>;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange: (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTogglePassword: () => void;
  onFillCredentials: () => void;
}

function LoginForm({
  formData,
  showPassword,
  formErrors,
  loading,
  onSubmit,
  onInputChange,
  onTogglePassword,
  onFillCredentials
}: LoginFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={onInputChange('email')}
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
            onChange={onInputChange('password')}
            className={`pl-10 pr-10 ${formErrors.password ? 'border-destructive' : ''}`}
            disabled={loading}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
            onClick={onTogglePassword}
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

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onFillCredentials}
        disabled={loading}
      >
        <Shield className="mr-2 h-4 w-4" />
        Use Admin Credentials
      </Button>
    </form>
  );
}
