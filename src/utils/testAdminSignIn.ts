import { supabase } from '@/integrations/supabase/client';
import { ADMIN_CREDENTIALS } from './createStreamlinedSuperAdmin';

export interface SignInTestResult {
  canSignIn: boolean;
  isConfirmed: boolean;
  error?: string;
  userDetails?: any;
  profileExists?: boolean;
}

/**
 * Test if the admin can sign in successfully
 */
export const testAdminSignIn = async (): Promise<SignInTestResult> => {
  try {
    console.log('🧪 Testing admin sign in...');

    // Attempt sign in
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
    });

    if (signInError) {
      console.log('❌ Sign in failed:', signInError.message);
      
      if (signInError.message.includes('Email not confirmed')) {
        return {
          canSignIn: false,
          isConfirmed: false,
          error: 'Email confirmation required',
          userDetails: null
        };
      }
      
      if (signInError.message.includes('Invalid login credentials')) {
        return {
          canSignIn: false,
          isConfirmed: false,
          error: 'User does not exist or wrong credentials',
          userDetails: null
        };
      }

      return {
        canSignIn: false,
        isConfirmed: false,
        error: signInError.message,
        userDetails: null
      };
    }

    if (!authData.user) {
      return {
        canSignIn: false,
        isConfirmed: false,
        error: 'No user data returned',
        userDetails: null
      };
    }

    console.log('✅ Sign in successful!');

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    return {
      canSignIn: true,
      isConfirmed: !!authData.user.email_confirmed_at,
      userDetails: {
        id: authData.user.id,
        email: authData.user.email,
        emailConfirmedAt: authData.user.email_confirmed_at,
        createdAt: authData.user.created_at,
        lastSignInAt: authData.user.last_sign_in_at
      },
      profileExists: !profileError && !!profile
    };

  } catch (error) {
    console.error('❌ Sign in test error:', error);
    return {
      canSignIn: false,
      isConfirmed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      userDetails: null
    };
  }
};

/**
 * Get detailed admin user status from database
 */
export const getAdminUserStatus = async (): Promise<{
  authUser?: any;
  profile?: any;
  status: string;
}> => {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', ADMIN_CREDENTIALS.email)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile query error:', profileError);
    }

    let status = 'Unknown';
    
    if (profile) {
      status = `Profile exists with email: ${profile.email}`;
    } else {
      status = 'No profile found';
    }

    return {
      profile: profile || null,
      status
    };

  } catch (error) {
    console.error('Status check error:', error);
    return {
      status: 'Error checking status'
    };
  }
};

/**
 * Run a comprehensive admin diagnostic
 */
export const runAdminDiagnostic = async () => {
  console.log('🔍 Running Admin Diagnostic...');
  console.log('============================');
  
  // Test sign in
  const signInResult = await testAdminSignIn();
  console.log('Sign In Test:', signInResult);
  
  // Get user status
  const statusResult = await getAdminUserStatus();
  console.log('User Status:', statusResult);
  
  // Summary
  console.log('\n📋 Diagnostic Summary:');
  console.log('======================');
  console.log(`Can Sign In: ${signInResult.canSignIn ? '✅' : '❌'}`);
  console.log(`Email Confirmed: ${signInResult.isConfirmed ? '✅' : '❌'}`);
  console.log(`Profile Exists: ${signInResult.profileExists ? '✅' : '❌'}`);
  
  if (!signInResult.canSignIn) {
    console.log(`❌ Issue: ${signInResult.error}`);
    
    if (signInResult.error?.includes('Email not confirmed')) {
      console.log('\n🔧 Next Steps:');
      console.log('1. Disable email confirmations in Supabase Auth settings');
      console.log('2. Or manually confirm in Supabase Dashboard');
      console.log('3. Admin email:', ADMIN_CREDENTIALS.email);
    }
  } else {
    console.log('🎉 Admin is ready to use!');
  }
  
  console.log('============================');
  
  return {
    signInResult,
    statusResult,
    ready: signInResult.canSignIn && signInResult.isConfirmed
  };
};

// Make functions available in browser console for testing
if (typeof window !== 'undefined') {
  (window as any).testAdmin = testAdminSignIn;
  (window as any).runAdminDiagnostic = runAdminDiagnostic;
  (window as any).getAdminStatus = getAdminUserStatus;
  
  console.log('🧪 Admin testing functions available:');
  console.log('• testAdmin() - Test sign in');
  console.log('• runAdminDiagnostic() - Full diagnostic');
  console.log('• getAdminStatus() - Check user status');
}
