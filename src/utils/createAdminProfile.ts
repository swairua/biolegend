import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const ADMIN_CREDENTIALS = {
  email: 'admin@medplus.app',
  password: 'MedPlus2024!Admin',
  fullName: 'System Administrator'
};

interface CreateProfileResult {
  success: boolean;
  message: string;
  error?: string;
  profileId?: string;
}

/**
 * Create the admin profile in the profiles table
 */
export const createAdminProfile = async (): Promise<CreateProfileResult> => {
  try {
    console.log('🔧 Creating admin profile...');

    // First, get the admin user from auth.users to get the user ID
    let adminUserId: string | null = null;

    // Try to get user ID from current session first
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user?.email === ADMIN_CREDENTIALS.email) {
      adminUserId = sessionData.session.user.id;
      console.log('✅ Found admin user ID from session:', adminUserId);
    }

    // If no session, try to sign in to get the user ID
    if (!adminUserId) {
      console.log('🔍 Attempting to sign in to get admin user ID...');
      try {
        const signInResult = await supabase.auth.signInWithPassword({
          email: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
        });

        if (signInResult.data?.user && !signInResult.error) {
          adminUserId = signInResult.data.user.id;
          console.log('✅ Got admin user ID from sign-in:', adminUserId);

          // Sign out immediately to avoid staying logged in
          await supabase.auth.signOut();
        } else {
          console.error('Failed to get admin user ID:', signInResult.error);
          return {
            success: false,
            error: `Cannot get admin user ID: ${signInResult.error?.message || 'Unknown error'}`
          };
        }
      } catch (signInError) {
        console.error('Sign-in attempt failed:', signInError);
        return {
          success: false,
          error: `Sign-in failed: ${signInError instanceof Error ? signInError.message : 'Unknown error'}`
        };
      }
    }

    if (!adminUserId) {
      return {
        success: false,
        error: 'Could not get admin user ID. The user may not exist in Supabase Auth.'
      };
    }

    // Check if profile already exists (handle potential errors gracefully)
    let existingProfile = null;
    try {
      const { data, error: checkError } = await supabase
        .from('profiles')
        .select('id, email, role, status')
        .eq('id', adminUserId)
        .maybeSingle(); // Use maybeSingle to handle 0 results without error

      if (data && !checkError) {
        existingProfile = data;
        console.log('✅ Admin profile already exists:', existingProfile);

        // Update to ensure it's properly configured
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            email: ADMIN_CREDENTIALS.email,
            full_name: ADMIN_CREDENTIALS.fullName,
            role: 'admin',
            status: 'active',
            department: 'IT',
            position: 'System Administrator'
          })
          .eq('id', adminUserId);

        if (updateError) {
          console.error('Update error:', updateError);
          return {
            success: false,
            error: `Failed to update existing profile: ${updateError.message}`
          };
        }

        return {
          success: true,
          message: 'Admin profile already exists and has been updated!',
          profileId: adminUserId
        };
      }
    } catch (checkError) {
      console.log('Profile check failed (will create new):', checkError);
      // Continue to create new profile
    }

    // Create new profile
    console.log('📝 Creating new admin profile for user ID:', adminUserId);

    const profileData = {
      id: adminUserId,
      email: ADMIN_CREDENTIALS.email,
      full_name: ADMIN_CREDENTIALS.fullName,
      role: 'admin',
      status: 'active',
      department: 'IT',
      position: 'System Administrator'
    };

    console.log('Profile data to insert:', profileData);

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (createError) {
      console.error('Failed to create profile:', createError);
      return {
        success: false,
        error: `Failed to create admin profile: ${createError.message}. Details: ${createError.details || createError.hint || 'None'}`
      };
    }

    console.log('✅ Admin profile created successfully:', newProfile);

    // Grant admin permissions
    await grantAdminPermissions(adminUserId);

    return {
      success: true,
      message: 'Admin profile created successfully!',
      profileId: adminUserId
    };

  } catch (error) {
    console.error('Error creating admin profile:', error);
    return {
      success: false,
      error: `Profile creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Grant all admin permissions
 */
const grantAdminPermissions = async (userId: string): Promise<void> => {
  const adminPermissions = [
    'manage_users',
    'manage_company',
    'view_reports',
    'manage_inventory',
    'manage_finance',
    'manage_sales',
    'manage_settings',
    'view_dashboard',
    'create_quotations',
    'view_customers',
    'manage_credit_notes',
    'manage_invoices',
    'manage_lpos',
    'manage_delivery_notes',
    'manage_payments'
  ];

  let permissionsGranted = 0;
  
  for (const permission of adminPermissions) {
    try {
      const { error } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: userId,
          permission_name: permission,
          granted: true,
        });

      if (!error) {
        permissionsGranted++;
      } else {
        console.warn(`Failed to grant permission ${permission}:`, error.message);
      }
    } catch (permError) {
      console.warn(`Error granting permission ${permission}:`, permError);
    }
  }

  console.log(`✅ Granted ${permissionsGranted}/${adminPermissions.length} admin permissions`);
};

/**
 * Fix admin profile with user feedback
 */
export const fixAdminProfile = async (): Promise<CreateProfileResult> => {
  console.log('🚀 Starting admin profile fix...');
  
  const result = await createAdminProfile();
  
  if (result.success) {
    toast.success(result.message);
    console.log('🎉 Admin profile fix complete!');
  } else {
    toast.error(`Profile fix failed: ${result.error}`);
    console.error('❌ Admin profile fix failed:', result.error);
  }
  
  return result;
};
