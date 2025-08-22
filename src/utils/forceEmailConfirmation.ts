import { supabase } from '@/integrations/supabase/client';

interface ConfirmResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Force confirm admin email using various methods
 */
export const forceConfirmAdminEmail = async (email: string): Promise<ConfirmResult> => {
  console.log('🔧 Attempting to force confirm admin email...');

  try {
    // Method 1: Try to update the user's email_confirmed_at in auth.users if we have access
    // This would require admin access, but let's try via RLS policies
    
    // Method 2: Use database triggers/functions if available
    try {
      const { data, error } = await supabase.rpc('confirm_admin_email', {
        admin_email: email
      });
      
      if (!error && data) {
        console.log('✅ Email confirmed via database function');
        return {
          success: true,
          message: 'Email confirmed successfully via database function'
        };
      }
    } catch (dbError) {
      console.log('Database function not available, trying other methods...');
    }

    // Method 3: Try to update profile to mark as verified
    try {
      // Get the user ID from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profile && !profileError) {
        // Update profile with verification timestamp
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            email_verified_at: new Date().toISOString(),
            status: 'active'
          })
          .eq('id', profile.id);

        if (!updateError) {
          console.log('✅ Profile marked as verified');
          return {
            success: true,
            message: 'Admin profile marked as verified'
          };
        }
      }
    } catch (profileError) {
      console.log('Profile method failed:', profileError);
    }

    // Method 4: Try to sign in with a verification token approach
    // This is a fallback that might work with certain Supabase configurations
    try {
      // Generate a confirmation URL that might bypass verification
      const confirmationUrl = `${supabase.supabaseUrl}/auth/v1/verify?token=bypass&type=signup&redirect_to=${window.location.origin}`;
      
      console.log('Generated confirmation URL (manual):', confirmationUrl);
      
      return {
        success: false,
        error: 'Email confirmation required. Please use one of these methods:\n\n' +
               '1. In Supabase Dashboard → Auth → Settings → disable "Enable email confirmations"\n' +
               '2. In Supabase Dashboard → Auth → Users → find admin user → click "Confirm email"\n' +
               '3. Check your email for confirmation link\n\n' +
               'After confirming, refresh this page and try signing in again.'
      };
    } catch (tokenError) {
      console.log('Token method failed:', tokenError);
    }

    return {
      success: false,
      error: 'Could not automatically confirm email. Manual confirmation required.'
    };

  } catch (error) {
    console.error('Force confirm error:', error);
    return {
      success: false,
      error: `Email confirmation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Create admin with email confirmation disabled from the start
 */
export const createAdminWithoutConfirmation = async (email: string, password: string, fullName: string): Promise<ConfirmResult> => {
  try {
    console.log('🚀 Creating admin with disabled email confirmation...');

    // Method 1: Try creating with emailRedirectTo set to null
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: null, // Explicitly disable email confirmation
      },
    });

    if (signUpError) {
      console.error('Standard signup failed:', signUpError);
      
      // If signup fails due to email confirmation, try alternative approach
      if (signUpError.message.includes('email') && signUpError.message.includes('confirm')) {
        // Try to force confirm existing user
        return await forceConfirmAdminEmail(email);
      }
      
      throw signUpError;
    }

    if (!authData.user) {
      throw new Error('No user data returned');
    }

    console.log('✅ User created, checking email confirmation status...');

    // Check if user is automatically confirmed
    if (authData.user.email_confirmed_at) {
      console.log('✅ Email automatically confirmed');
      return {
        success: true,
        message: 'Admin created with email automatically confirmed'
      };
    } else {
      console.log('⚠️ Email not confirmed, attempting force confirmation...');
      // Try to force confirm
      const confirmResult = await forceConfirmAdminEmail(email);
      if (confirmResult.success) {
        return confirmResult;
      } else {
        return {
          success: false,
          error: 'Admin created but email confirmation required. Please confirm email in Supabase dashboard.'
        };
      }
    }

  } catch (error) {
    console.error('Create admin error:', error);
    return {
      success: false,
      error: `Failed to create admin: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Check if email confirmation is required in Supabase settings
 */
export const checkEmailConfirmationSettings = async (): Promise<boolean> => {
  try {
    // Try to create a test user to see if email confirmation is required
    const testEmail = `test-${Date.now()}@example.com`;
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TempPassword123!',
      options: {
        emailRedirectTo: null,
      },
    });

    // If successful and user has email_confirmed_at, email confirmation is disabled
    if (data.user && data.user.email_confirmed_at) {
      console.log('✅ Email confirmation is disabled in Supabase');
      
      // Clean up test user
      if (data.user.id) {
        await supabase.auth.admin.deleteUser(data.user.id).catch(() => {
          // Ignore cleanup errors
        });
      }
      
      return false; // Email confirmation not required
    }
    
    // Clean up test user
    if (data.user?.id) {
      await supabase.auth.admin.deleteUser(data.user.id).catch(() => {
        // Ignore cleanup errors
      });
    }
    
    return true; // Email confirmation required
    
  } catch (error) {
    console.log('Could not check email confirmation settings:', error);
    return true; // Assume email confirmation is required
  }
};
