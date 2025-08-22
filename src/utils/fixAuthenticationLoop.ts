import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const ADMIN_CREDENTIALS = {
  email: 'admin@medplus.app',
  password: 'MedPlus2024!Admin',
  fullName: 'System Administrator'
};

interface AuthFixResult {
  success: boolean;
  message: string;
  error?: string;
  needsReload?: boolean;
}

/**
 * Fix authentication loop by ensuring admin profile exists with active status
 */
export const fixAuthenticationLoop = async (): Promise<AuthFixResult> => {
  try {
    console.log('🔧 Fixing authentication loop...');

    // Step 1: Sign in to get the user ID
    console.log('🔍 Signing in to get user ID...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
    });

    if (signInError || !signInData.user) {
      console.error('Sign-in failed:', signInError);
      return {
        success: false,
        error: `Sign-in failed: ${signInError?.message || 'Unknown error'}. Please check your credentials.`
      };
    }

    const userId = signInData.user.id;
    console.log('✅ Sign-in successful, user ID:', userId);

    // Step 2: Check current profile status
    console.log('🔍 Checking profile status...');
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, role, status, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching profile:', fetchError);
      return {
        success: false,
        error: `Failed to check profile: ${fetchError.message}`
      };
    }

    if (!currentProfile) {
      // Step 3a: Create new active profile
      console.log('📝 Creating new active admin profile...');
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: ADMIN_CREDENTIALS.email,
          full_name: ADMIN_CREDENTIALS.fullName,
          role: 'admin',
          status: 'active', // This is the key fix!
          department: 'IT',
          position: 'System Administrator'
        });

      if (createError) {
        console.error('Failed to create profile:', createError);
        return {
          success: false,
          error: `Failed to create profile: ${createError.message}`
        };
      }

      console.log('✅ New active admin profile created!');
      return {
        success: true,
        message: 'Admin profile created with active status!',
        needsReload: true
      };

    } else if (currentProfile.status !== 'active') {
      // Step 3b: Update existing profile to active status
      console.log('🔄 Updating profile status to active...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          status: 'active', // This is the key fix!
          role: 'admin',
          full_name: ADMIN_CREDENTIALS.fullName,
          department: 'IT',
          position: 'System Administrator'
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to update profile:', updateError);
        return {
          success: false,
          error: `Failed to update profile: ${updateError.message}`
        };
      }

      console.log(`✅ Profile status updated from '${currentProfile.status}' to 'active'!`);
      return {
        success: true,
        message: 'Profile status updated to active!',
        needsReload: true
      };

    } else {
      // Profile already exists and is active
      console.log('✅ Profile already exists and is active');
      return {
        success: true,
        message: 'Profile is already active! Authentication should work now.',
        needsReload: true
      };
    }

  } catch (error) {
    console.error('Error fixing authentication loop:', error);
    return {
      success: false,
      error: `Fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Quick diagnostic to check authentication state
 */
export const diagnoseAuthState = async (): Promise<{
  hasSession: boolean;
  hasUser: boolean;
  hasProfile: boolean;
  profileStatus?: string;
  userId?: string;
  isAuthenticated: boolean;
}> => {
  try {
    // Check session
    const { data: sessionData } = await supabase.auth.getSession();
    const hasSession = !!sessionData.session;
    const hasUser = !!sessionData.session?.user;
    const userId = sessionData.session?.user?.id;

    if (!hasUser) {
      return {
        hasSession,
        hasUser,
        hasProfile: false,
        isAuthenticated: false
      };
    }

    // Check profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, status')
      .eq('id', userId)
      .maybeSingle();

    const hasProfile = !!profile;
    const profileStatus = profile?.status;
    const isAuthenticated = hasUser && hasProfile && profileStatus === 'active';

    return {
      hasSession,
      hasUser,
      hasProfile,
      profileStatus,
      userId,
      isAuthenticated
    };

  } catch (error) {
    console.error('Error diagnosing auth state:', error);
    return {
      hasSession: false,
      hasUser: false,
      hasProfile: false,
      isAuthenticated: false
    };
  }
};
