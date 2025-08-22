import { supabase } from '@/integrations/supabase/client';
import { fixAuthenticationLoop, diagnoseAuthState } from './fixAuthenticationLoop';

export const ADMIN_CREDENTIALS = {
  email: 'admin@medplus.app',
  password: 'MedPlus2024!Admin',
};

/**
 * Test login process and fix any issues
 */
export const testLoginFlow = async (): Promise<{
  success: boolean;
  message: string;
  needsProfileFix?: boolean;
}> => {
  try {
    console.log('🧪 Testing login flow...');

    // Step 1: Diagnose current state
    const initialDiagnosis = await diagnoseAuthState();
    console.log('🔍 Initial diagnosis:', initialDiagnosis);

    if (initialDiagnosis.isAuthenticated) {
      return {
        success: true,
        message: 'Already authenticated! Should be seeing dashboard.'
      };
    }

    // Step 2: Try to sign in
    console.log('🔐 Attempting sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
    });

    if (signInError) {
      console.error('❌ Sign in failed:', signInError);
      return {
        success: false,
        message: `Sign in failed: ${signInError.message}`
      };
    }

    if (!signInData.user) {
      return {
        success: false,
        message: 'Sign in succeeded but no user data returned'
      };
    }

    console.log('✅ Sign in successful, user ID:', signInData.user.id);

    // Step 3: Check profile after sign in
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, status')
      .eq('id', signInData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('❌ Profile check failed:', profileError);
      return {
        success: false,
        message: `Profile check failed: ${profileError.message}`,
        needsProfileFix: true
      };
    }

    if (!profile) {
      console.warn('⚠️ No profile found after sign in');
      return {
        success: false,
        message: 'No profile found - authentication loop will occur',
        needsProfileFix: true
      };
    }

    if (profile.status !== 'active') {
      console.warn(`⚠️ Profile status is '${profile.status}', should be 'active'`);
      return {
        success: false,
        message: `Profile status is '${profile.status}' - authentication loop will occur`,
        needsProfileFix: true
      };
    }

    console.log('🎉 Login flow test successful!');
    return {
      success: true,
      message: 'Login flow test passed! Authentication should work normally.'
    };

  } catch (error) {
    console.error('❌ Login flow test failed:', error);
    return {
      success: false,
      message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Complete login process including fixes if needed
 */
export const performCompleteLogin = async (): Promise<{
  success: boolean;
  message: string;
  authenticated?: boolean;
}> => {
  try {
    console.log('🚀 Starting complete login process...');

    // Step 1: Test current flow
    const testResult = await testLoginFlow();
    console.log('🧪 Test result:', testResult);

    // Step 2: Fix profile if needed
    if (testResult.needsProfileFix) {
      console.log('🔧 Fixing authentication profile...');
      const fixResult = await fixAuthenticationLoop();
      
      if (!fixResult.success) {
        return {
          success: false,
          message: `Profile fix failed: ${fixResult.error}`
        };
      }
      
      console.log('✅ Profile fixed, retesting...');
      
      // Wait a moment for changes to take effect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Retest after fix
      const retestResult = await testLoginFlow();
      if (!retestResult.success) {
        return {
          success: false,
          message: `Retest failed after fix: ${retestResult.message}`
        };
      }
    }

    // Step 3: Final diagnosis
    const finalDiagnosis = await diagnoseAuthState();
    console.log('🔍 Final diagnosis:', finalDiagnosis);

    return {
      success: true,
      message: 'Complete login process successful!',
      authenticated: finalDiagnosis.isAuthenticated
    };

  } catch (error) {
    console.error('❌ Complete login process failed:', error);
    return {
      success: false,
      message: `Complete login failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};
