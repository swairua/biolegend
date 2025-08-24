import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const ADMIN_CREDENTIALS = {
  email: 'admin@biolegendscientific.co.ke',
  password: 'Biolegend2024!Admin',
  fullName: 'System Administrator'
};

interface SetupStatus {
  checking: boolean;
  adminExists: boolean;
  canCreateAdmin: boolean;
  creating: boolean;
  error: string | null;
  success: boolean;
}

export function AutoAdminSetup() {
  const [status, setStatus] = useState<SetupStatus>({
    checking: true,
    adminExists: false,
    canCreateAdmin: false,
    creating: false,
    error: null,
    success: false
  });

  const checkAdminExists = async () => {
    try {
      setStatus(prev => ({ ...prev, checking: true, error: null }));

      // Try to sign in with admin credentials to check if admin exists
      const { data, error } = await supabase.auth.signInWithPassword({
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password,
      });

      if (data?.user && !error) {
        // Admin exists and can sign in
        await supabase.auth.signOut(); // Sign out after check
        setStatus(prev => ({ 
          ...prev, 
          checking: false, 
          adminExists: true,
          canCreateAdmin: false 
        }));
        return;
      }

      // Check if user exists but can't sign in (email confirmation issue)
      if (error?.message?.includes('Invalid login credentials')) {
        // Admin might not exist, we can try to create
        setStatus(prev => ({ 
          ...prev, 
          checking: false, 
          adminExists: false,
          canCreateAdmin: true 
        }));
      } else {
        throw error;
      }

    } catch (error) {
      console.error('Admin check failed:', error);
      setStatus(prev => ({ 
        ...prev, 
        checking: false, 
        error: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        canCreateAdmin: true 
      }));
    }
  };

  const createAdmin = async () => {
    try {
      setStatus(prev => ({ ...prev, creating: true, error: null }));

      // Step 1: Create the admin user
      console.log('Creating admin user...');
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password,
        options: {
          data: {
            full_name: ADMIN_CREDENTIALS.fullName,
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          // User exists but needs confirmation - try alternative approach
          toast.info('Admin user already exists but may need email confirmation');
          setStatus(prev => ({ 
            ...prev, 
            creating: false, 
            error: 'Admin user exists but cannot sign in. Email confirmation may be required.',
            adminExists: true,
            canCreateAdmin: false
          }));
          return;
        }
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('User creation failed - no user data returned');
      }

      // Step 2: Create profile entry
      console.log('Creating admin profile...');
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: ADMIN_CREDENTIALS.email,
          full_name: ADMIN_CREDENTIALS.fullName,
          department: 'Administration',
          position: 'System Administrator',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.warn('Profile creation failed (may not exist yet):', profileError);
        // Don't fail the whole process if profiles table doesn't exist
      }

      // Step 3: Sign out after creation
      await supabase.auth.signOut();

      setStatus(prev => ({ 
        ...prev, 
        creating: false, 
        success: true,
        adminExists: true,
        canCreateAdmin: false 
      }));

      toast.success('Admin user created successfully! You can now log in.');

    } catch (error) {
      console.error('Admin creation failed:', error);
      setStatus(prev => ({ 
        ...prev, 
        creating: false, 
        error: `Creation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
      toast.error('Failed to create admin user');
    }
  };

  useEffect(() => {
    checkAdminExists();
  }, []);

  if (status.checking) {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>
          Checking if admin user exists...
        </AlertDescription>
      </Alert>
    );
  }

  if (status.adminExists && !status.error) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Admin user is ready!</strong> You can log in with:<br />
          <code className="text-sm bg-green-100 px-1 rounded">admin@biolegendscientific.co.ke</code>
        </AlertDescription>
      </Alert>
    );
  }

  if (status.canCreateAdmin) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Admin Setup Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No admin user found. Create the admin account to access the system.
          </p>
          
          {status.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{status.error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={createAdmin}
            disabled={status.creating}
            className="w-full"
          >
            {status.creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Admin User...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Admin User
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Email:</strong> admin@biolegendscientific.co.ke</p>
            <p><strong>Password:</strong> Biolegend2024!Admin</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status.success) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Success!</strong> Admin user created. You can now log in with the credentials above.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
