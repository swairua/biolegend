import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { retryWithRateLimit, checkSupabaseHealth } from './supabaseHealthCheck';
import { createAdminWithoutConfirmation, forceConfirmAdminEmail } from './forceEmailConfirmation';

export const ADMIN_CREDENTIALS = {
  email: 'admin@medplus.app',
  password: 'MedPlus2024!Admin',
  fullName: 'System Administrator'
};

interface CreateAdminResult {
  success: boolean;
  message: string;
  error?: string;
  userCreated?: boolean;
}

/**
 * Create super admin with exact credentials - no verification required
 * This will bypass all setup screens and create a ready-to-use admin account
 */
export const createStreamlinedSuperAdmin = async (): Promise<CreateAdminResult> => {
  try {
    console.log('🚀 Creating streamlined super admin...');

    // Check Supabase health first
    const health = await checkSupabaseHealth();
    if (!health.isHealthy) {
      console.warn('Supabase health issues detected:', health.issues);
      if (health.rateLimited) {
        return {
          success: false,
          error: 'Service is currently rate limited. Please wait a moment and try again.'
        };
      }
    }

    // First, try to sign in to check if user already exists
    console.log('🔍 Checking if admin user already exists...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
    });

    if (signInData?.user && !signInError) {
      console.log('✅ Admin user already exists and can sign in');

      // Check if profile exists and is properly configured
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email, role, status')
        .eq('id', signInData.user.id)
        .single();

      if (existingProfile) {
        // Update profile to ensure admin status
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            role: 'admin',
            status: 'active',
            full_name: ADMIN_CREDENTIALS.fullName,
            department: 'IT',
            position: 'System Administrator'
          })
          .eq('id', signInData.user.id);

        if (!updateError) {
          console.log('✅ Existing admin profile updated');
          return {
            success: true,
            message: 'Super admin already exists and is ready to use!',
            userCreated: false
          };
        }
      } else {
        // Create profile for existing user
        await forceActivateUser(signInData.user.id);
        return {
          success: true,
          message: 'Super admin profile created for existing user!',
          userCreated: false
        };
      }
    }

    // Check for rate limiting by waiting if needed
    if (signInError?.message.includes('seconds')) {
      console.log('⏳ Rate limited, waiting before retry...');
      await new Promise(resolve => setTimeout(resolve, 20000)); // Wait 20 seconds
    }

    // Check if user exists in profiles table but auth failed
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email, role, status')
      .eq('email', ADMIN_CREDENTIALS.email)
      .single();

    if (existingProfile) {
      console.log('✅ Profile exists in database, updating...');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          status: 'active',
          full_name: ADMIN_CREDENTIALS.fullName,
          department: 'IT',
          position: 'System Administrator'
        })
        .eq('id', existingProfile.id);

      if (!updateError) {
        return {
          success: true,
          message: 'Super admin profile exists and updated!',
          userCreated: false
        };
      }
    }

    // Only create new user if none exists
    console.log('📝 Creating new admin user with email confirmation bypass...');

    const createResult = await retryWithRateLimit(async () => {
      return await createAdminWithoutConfirmation(
        ADMIN_CREDENTIALS.email,
        ADMIN_CREDENTIALS.password,
        ADMIN_CREDENTIALS.fullName
      );
    }, 3, 20000); // 3 retries with 20 second base delay

    if (!createResult.success) {
      console.error('Failed to create admin user:', createResult.error);

      // Handle specific error cases
      if (createResult.error?.includes('seconds')) {
        return {
          success: false,
          error: 'Rate limited by Supabase. Please wait a moment and refresh the page to try again.'
        };
      }

      if (createResult.error?.includes('email') && createResult.error?.includes('confirm')) {
        return {
          success: false,
          error: createResult.error
        };
      }

      return {
        success: false,
        error: createResult.error || 'Failed to create admin user'
      };
    }

    console.log('✅ Admin user created with email confirmation handled');

    // Get the user data for profile setup
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      // Force create/update profile
      await forceActivateUser(userData.user.id);
    } else {
      // Try to get user by email for profile setup
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', ADMIN_CREDENTIALS.email)
        .single();

      if (profileData) {
        await forceActivateUser(profileData.id);
      }
    }

    console.log('🎉 Super admin setup complete!');
    return {
      success: true,
      message: 'Super admin created and activated successfully!',
      userCreated: true
    };

  } catch (error) {
    console.error('Error creating super admin:', error);
    return {
      success: false,
      error: `Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Force activate user with admin privileges
 */
const forceActivateUser = async (userId: string) => {
  console.log('🔧 Setting up profile for user:', userId);

  // Try to update existing profile (without problematic columns)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      full_name: ADMIN_CREDENTIALS.fullName,
      role: 'admin',
      status: 'active',
      department: 'IT',
      position: 'System Administrator'
    })
    .eq('id', userId);

  if (updateError) {
    console.log('Profile update failed:', JSON.stringify(updateError, null, 2));
    console.log('Creating new profile...');

    // Create profile manually (only with existing columns)
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: ADMIN_CREDENTIALS.email,
        full_name: ADMIN_CREDENTIALS.fullName,
        role: 'admin',
        status: 'active',
        department: 'IT',
        position: 'System Administrator'
      });

    if (insertError) {
      console.error('Failed to create profile:', JSON.stringify(insertError, null, 2));
      throw new Error(`Profile creation failed: ${insertError.message || insertError.details || 'Unknown error'}`);
    } else {
      console.log('✅ Profile created successfully');
    }
  } else {
    console.log('✅ Profile updated successfully');
  }

  // Grant admin permissions (with error handling)
  const adminPermissions = [
    'manage_users', 'manage_company', 'view_reports', 'manage_inventory',
    'manage_finance', 'manage_sales', 'manage_settings', 'view_dashboard',
    'create_quotations', 'view_customers', 'manage_credit_notes',
    'manage_invoices', 'manage_lpos', 'manage_delivery_notes', 'manage_payments'
  ];

  let permissionsGranted = 0;
  for (const permission of adminPermissions) {
    try {
      const { error: permError } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: userId,
          permission_name: permission,
          granted: true,
        });

      if (!permError) {
        permissionsGranted++;
      } else {
        console.warn(`Failed to grant ${permission}:`, JSON.stringify(permError, null, 2));
      }
    } catch (permException) {
      console.warn(`Exception granting ${permission}:`, permException);
    }
  }

  console.log(`✅ Admin permissions granted: ${permissionsGranted}/${adminPermissions.length}`);
};

/**
 * Force complete all setup - mark system as fully configured
 */
export const forceCompleteSetup = async (): Promise<void> => {
  try {
    // Create default company if it doesn't exist
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .limit(1)
      .single();

    if (!existingCompany) {
      const { error: companyError } = await supabase
        .from('companies')
        .insert({
          name: 'MedPlus Africa',
          email: ADMIN_CREDENTIALS.email,
          currency: 'USD',
          fiscal_year_start: 1, // January
        });

      if (companyError) {
        console.warn('Failed to create default company:', companyError);
      }
    }

    // Create basic tax settings if they don't exist
    const { data: existingTax } = await supabase
      .from('tax_settings')
      .select('id')
      .limit(1)
      .single();

    if (!existingTax && existingCompany) {
      await supabase
        .from('tax_settings')
        .insert({
          company_id: existingCompany.id,
          name: 'Standard Tax',
          rate: 0,
          is_active: true,
          is_default: true
        });
    }

    console.log('✅ Setup completed');
  } catch (error) {
    console.warn('Setup completion had minor issues:', error);
  }
};

/**
 * Complete streamlined setup process
 */
export const executeStreamlinedSetup = async (): Promise<CreateAdminResult> => {
  console.log('🚀 Starting streamlined setup...');
  
  // Create super admin
  const adminResult = await createStreamlinedSuperAdmin();
  
  if (adminResult.success) {
    // Force complete setup
    await forceCompleteSetup();
    
    toast.success('System ready! Please sign in with admin credentials.');
    console.log('🎉 Streamlined setup complete!');
    console.log('📧 Email:', ADMIN_CREDENTIALS.email);
    console.log('🔑 Password:', ADMIN_CREDENTIALS.password);
  } else {
    toast.error(`Setup failed: ${adminResult.error}`);
  }
  
  return adminResult;
};
