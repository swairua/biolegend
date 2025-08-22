import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const SUPER_ADMIN_CREDENTIALS = {
  email: 'superadmin@medplusafrica.co',
  password: 'MedPlus2024!Admin',
  fullName: 'Super Administrator'
};

interface ForceVerifyResult {
  success: boolean;
  message: string;
  error?: string;
  needsEmailConfirmation?: boolean;
}

/**
 * Force verify super admin email without requiring email confirmation
 * This bypasses the email verification process for the super admin account
 */
export const forceVerifySuperAdmin = async (): Promise<ForceVerifyResult> => {
  try {
    console.log('🔧 Force verifying super admin email...');

    // First try to sign in to see if user exists
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: SUPER_ADMIN_CREDENTIALS.email,
      password: SUPER_ADMIN_CREDENTIALS.password,
    });

    if (signInData?.user && !signInError) {
      console.log('✅ Super admin already exists and can sign in');
      
      // Check if they're already verified
      if (signInData.user.email_confirmed_at) {
        return {
          success: true,
          message: 'Super admin email is already verified and working!'
        };
      }

      // User exists but not verified - this is what we need to fix
      console.log('⚠️ Super admin exists but email not verified, will force verify...');
    } else if (signInError?.message.includes('Invalid login credentials')) {
      console.log('❌ Super admin user does not exist, creating first...');
      
      // Create the user first
      const createResult = await createSuperAdminUser();
      if (!createResult.success) {
        return createResult;
      }
    } else if (signInError?.message.includes('Email not confirmed')) {
      console.log('⚠️ Super admin exists but email not confirmed, will force verify...');
    } else {
      console.error('Unexpected sign-in error:', signInError);
      return {
        success: false,
        error: `Unexpected error during sign-in: ${signInError?.message || 'Unknown error'}`
      };
    }

    // Now attempt to force verify the email using admin API
    // Note: This requires admin privileges or RLS policies that allow it
    
    // Method 1: Try to use the admin API to confirm the user
    try {
      console.log('🔧 Attempting admin API email confirmation...');
      
      // Get user by email first
      const { data: userData, error: getUserError } = await supabase.auth.admin.listUsers();
      
      if (getUserError) {
        console.warn('Cannot access admin API:', getUserError.message);
      } else {
        const superAdminUser = userData.users.find(user => user.email === SUPER_ADMIN_CREDENTIALS.email);
        
        if (superAdminUser) {
          // Try to update user as confirmed
          const { error: confirmError } = await supabase.auth.admin.updateUserById(
            superAdminUser.id,
            { email_confirm: true }
          );
          
          if (!confirmError) {
            console.log('✅ Successfully force verified email via admin API');
            return {
              success: true,
              message: 'Super admin email force verified successfully using admin API!'
            };
          } else {
            console.warn('Admin API confirmation failed:', confirmError.message);
          }
        }
      }
    } catch (adminError) {
      console.warn('Admin API not available:', adminError);
    }

    // Method 2: Try to bypass verification by updating profile directly
    try {
      console.log('🔧 Attempting profile-based verification bypass...');
      
      // Sign in again to get the current user
      const { data: currentSignIn, error: currentSignInError } = await supabase.auth.signInWithPassword({
        email: SUPER_ADMIN_CREDENTIALS.email,
        password: SUPER_ADMIN_CREDENTIALS.password,
      });

      if (currentSignIn?.user) {
        // Update the profile to mark as verified and active
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            status: 'active',
            email_verified_at: new Date().toISOString(),
            role: 'admin',
            full_name: SUPER_ADMIN_CREDENTIALS.fullName
          })
          .eq('id', currentSignIn.user.id);

        if (!profileUpdateError) {
          console.log('✅ Successfully updated profile to bypass verification');
          return {
            success: true,
            message: 'Super admin verification bypassed successfully! Profile marked as active.'
          };
        } else {
          console.warn('Profile update failed:', profileUpdateError.message);
        }
      }
    } catch (profileError) {
      console.warn('Profile-based bypass failed:', profileError);
    }

    // Method 3: Database-level bypass (if we have access)
    try {
      console.log('🔧 Attempting database-level verification bypass...');
      
      // Try to call a database function to bypass email verification
      const { data: bypassResult, error: bypassError } = await supabase.rpc('force_verify_admin_email', {
        admin_email: SUPER_ADMIN_CREDENTIALS.email
      });

      if (!bypassError && bypassResult) {
        console.log('✅ Successfully bypassed verification via database function');
        return {
          success: true,
          message: 'Super admin email verification bypassed successfully via database!'
        };
      } else {
        console.warn('Database bypass failed:', bypassError?.message || 'Function not available');
      }
    } catch (dbError) {
      console.warn('Database bypass not available:', dbError);
    }

    // If all methods failed, provide guidance
    return {
      success: false,
      needsEmailConfirmation: true,
      error: 'Could not automatically bypass email verification. You have two options:\n\n' +
             '1. Disable email confirmation in Supabase Dashboard (Auth > Settings > Email Auth > "Enable email confirmations" = OFF)\n' +
             '2. Manually confirm the email in Supabase Dashboard (Auth > Users > Find user > Confirm email)\n\n' +
             'After doing either option, the super admin will be able to sign in immediately.',
      message: 'Manual intervention required for email verification'
    };

  } catch (error) {
    console.error('Error during force verification:', error);
    return {
      success: false,
      error: `Force verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Create super admin user if it doesn't exist
 */
const createSuperAdminUser = async (): Promise<ForceVerifyResult> => {
  try {
    console.log('🔧 Creating super admin user...');

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: SUPER_ADMIN_CREDENTIALS.email,
      password: SUPER_ADMIN_CREDENTIALS.password,
      options: {
        data: {
          full_name: SUPER_ADMIN_CREDENTIALS.fullName,
        },
        emailRedirectTo: undefined, // Disable email confirmation redirect
      },
    });

    if (signUpError) {
      return {
        success: false,
        error: `Failed to create super admin: ${signUpError.message}`
      };
    }

    if (!signUpData.user) {
      return {
        success: false,
        error: 'User creation failed: No user data returned'
      };
    }

    console.log('✅ Super admin user created');

    // Wait for profile creation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: SUPER_ADMIN_CREDENTIALS.fullName,
        role: 'admin',
        status: 'active',
        department: 'IT',
        position: 'System Administrator',
      })
      .eq('id', signUpData.user.id);

    if (profileError) {
      console.warn('Profile update error:', profileError.message);
      
      // Try to create profile manually
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: signUpData.user.id,
          email: SUPER_ADMIN_CREDENTIALS.email,
          full_name: SUPER_ADMIN_CREDENTIALS.fullName,
          role: 'admin',
          status: 'active',
          department: 'IT',
          position: 'System Administrator',
        });

      if (insertError) {
        console.error('Failed to create profile:', insertError.message);
      }
    }

    return {
      success: true,
      message: 'Super admin user created successfully! Now attempting email verification bypass...'
    };

  } catch (error) {
    return {
      success: false,
      error: `Error creating super admin: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Complete super admin setup with force verification
 */
export const setupSuperAdminWithForceVerify = async (): Promise<ForceVerifyResult> => {
  console.log('🚀 Starting complete super admin setup with force verification...');
  
  const result = await forceVerifySuperAdmin();
  
  if (result.success) {
    toast.success(result.message);
    console.log('🎉 Super admin setup complete!');
    console.log('📧 Email:', SUPER_ADMIN_CREDENTIALS.email);
    console.log('🔑 Password:', SUPER_ADMIN_CREDENTIALS.password);
    console.log('✅ Email verification: BYPASSED');
  } else {
    if (result.needsEmailConfirmation) {
      toast.error('Manual email confirmation required');
      console.log('⚠️ Manual intervention needed for email confirmation');
    } else {
      toast.error(`Setup failed: ${result.error}`);
    }
  }
  
  return result;
};
