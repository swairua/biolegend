import { supabase } from '@/integrations/supabase/client';

export const ADMIN_CREDENTIALS = {
  email: 'admin@medplus.app',
  password: 'MedPlus2024!Admin',
  fullName: 'System Administrator'
};

interface CreateResult {
  success: boolean;
  message: string;
  error?: string;
  profileData?: any;
}

/**
 * Simple admin profile creator - handles the exact error we're seeing
 */
export const createSimpleAdminProfile = async (): Promise<CreateResult> => {
  try {
    console.log('🚀 Simple admin profile creation starting...');

    // Step 1: Get the admin user ID
    console.log('🔍 Step 1: Getting admin user ID...');
    let adminUserId: string | null = null;

    // Try to sign in to get the user ID
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password,
      });

      if (authData.user && !authError) {
        adminUserId = authData.user.id;
        console.log('✅ Got admin user ID:', adminUserId);
        
        // Sign out immediately
        await supabase.auth.signOut();
        console.log('✅ Signed out to avoid session conflicts');
      } else {
        console.error('Auth error:', authError);
        return {
          success: false,
          error: `Cannot authenticate admin user: ${authError?.message || 'Unknown error'}`
        };
      }
    } catch (authException) {
      console.error('Auth exception:', authException);
      return {
        success: false,
        error: `Authentication failed: ${authException instanceof Error ? authException.message : 'Unknown error'}`
      };
    }

    if (!adminUserId) {
      return {
        success: false,
        error: 'Could not get admin user ID'
      };
    }

    // Step 2: Check if profile already exists
    console.log('🔍 Step 2: Checking if profile exists...');
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, email, role, status')
      .eq('id', adminUserId)
      .maybeSingle();

    if (checkError) {
      console.error('Profile check failed:', checkError);
      return {
        success: false,
        error: `Profile check failed: ${checkError.message}`
      };
    }

    if (existingProfile) {
      console.log('✅ Profile already exists:', existingProfile);
      
      // Update it to ensure it's properly configured
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          email: ADMIN_CREDENTIALS.email,
          full_name: ADMIN_CREDENTIALS.fullName,
          role: 'admin',
          status: 'active'
        })
        .eq('id', adminUserId);

      if (updateError) {
        console.error('Profile update failed:', updateError);
        return {
          success: false,
          error: `Profile update failed: ${updateError.message}`
        };
      }

      return {
        success: true,
        message: 'Admin profile already exists and has been updated!',
        profileData: existingProfile
      };
    }

    // Step 3: Create new profile
    console.log('📝 Step 3: Creating new admin profile...');
    
    const profileData = {
      id: adminUserId,
      email: ADMIN_CREDENTIALS.email,
      full_name: ADMIN_CREDENTIALS.fullName,
      role: 'admin',
      status: 'active'
    };

    console.log('Profile data to create:', profileData);

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (createError) {
      console.error('Profile creation failed:', JSON.stringify(createError, null, 2));
      return {
        success: false,
        error: `Profile creation failed: ${createError.message}. Details: ${createError.details || createError.hint || 'None'}`
      };
    }

    console.log('✅ Profile created successfully:', newProfile);

    // Step 4: Grant basic permissions
    console.log('🔑 Step 4: Granting basic permissions...');
    const permissions = ['view_dashboard', 'manage_users', 'manage_settings'];
    let permissionsGranted = 0;

    for (const permission of permissions) {
      try {
        const { error: permError } = await supabase
          .from('user_permissions')
          .insert({
            user_id: adminUserId,
            permission_name: permission,
            granted: true,
          });

        if (!permError) {
          permissionsGranted++;
        } else {
          console.warn(`Permission ${permission} failed:`, permError.message);
        }
      } catch (permException) {
        console.warn(`Permission ${permission} exception:`, permException);
      }
    }

    console.log(`✅ Permissions granted: ${permissionsGranted}/${permissions.length}`);

    return {
      success: true,
      message: `Admin profile created successfully! ${permissionsGranted} permissions granted.`,
      profileData: newProfile
    };

  } catch (error) {
    console.error('Simple profile creation error:', error);
    return {
      success: false,
      error: `Profile creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};
