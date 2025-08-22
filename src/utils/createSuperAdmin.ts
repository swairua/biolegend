import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const SUPER_ADMIN_CREDENTIALS = {
  email: 'superadmin@medplusafrica.co',
  password: 'MedPlus2024!Admin',
  fullName: 'Super Administrator'
};

// Fallback emails to try if the primary fails
const FALLBACK_EMAILS = [
  'admin@medplus.app',
  'admin@medplus.io',
  'superadmin@medplus.app',
  'medplus.admin@gmail.com'
];

// Check if required tables exist
const checkDatabaseTables = async () => {
  const tableChecks = [];

  // Check profiles table
  try {
    await supabase.from('profiles').select('id').limit(1);
    tableChecks.push({ table: 'profiles', exists: true });
  } catch (error) {
    tableChecks.push({ table: 'profiles', exists: false, error });
  }

  // Check user_permissions table
  try {
    await supabase.from('user_permissions').select('id').limit(1);
    tableChecks.push({ table: 'user_permissions', exists: true });
  } catch (error) {
    tableChecks.push({ table: 'user_permissions', exists: false, error });
  }

  return tableChecks;
};

// Simple email validation
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const createSuperAdmin = async () => {
  try {
    console.log('Creating super admin user...');

    // Check if required tables exist
    console.log('Checking database tables...');
    const tableChecks = await checkDatabaseTables();
    const missingTables = tableChecks.filter(check => !check.exists);

    if (missingTables.length > 0) {
      console.warn('Some required tables are missing:', missingTables.map(t => t.table));
      // Continue anyway - tables might be created by triggers or manual migration
    }

    // Try primary email first, then fallbacks
    const emailsToTry = [SUPER_ADMIN_CREDENTIALS.email, ...FALLBACK_EMAILS];
    let successfulEmail = '';
    let authData: any = null;
    let lastError: any = null;

    for (const email of emailsToTry) {
      if (!isValidEmail(email)) {
        console.warn(`Skipping invalid email format: ${email}`);
        continue;
      }

      console.log(`Trying email: ${email}`);

      // First, check if super admin already exists with this email
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email, role, status')
        .eq('email', email)
        .single();

      if (existingProfile) {
        console.log('Super admin already exists:', existingProfile.email);

        // Update to ensure admin role
        if (existingProfile.role !== 'admin' || existingProfile.status !== 'active') {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              role: 'admin',
              status: 'active',
              full_name: SUPER_ADMIN_CREDENTIALS.fullName,
              department: 'IT',
              position: 'System Administrator'
            })
            .eq('id', existingProfile.id);

          if (updateError) {
            console.error('Failed to update existing user to admin:', {
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint,
              code: updateError.code
            });
            return {
              success: false,
              error: `Failed to update existing user: ${updateError.message}. Details: ${updateError.details || 'N/A'}`
            };
          }
          console.log('Updated existing user to super admin');
        }

        return {
          success: true,
          message: `Super admin already exists and has been updated (${email})`,
          credentials: { ...SUPER_ADMIN_CREDENTIALS, email }
        };
      }

      // Try to create new user with this email
      try {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: SUPER_ADMIN_CREDENTIALS.password,
          options: {
            data: {
              full_name: SUPER_ADMIN_CREDENTIALS.fullName,
            },
            emailRedirectTo: undefined, // Disable email confirmation redirect
          },
        });

        if (signUpError) {
          console.warn(`Email ${email} failed:`, signUpError.message);

          // Check if this is an email confirmation issue
          if (signUpError.message.includes('email') &&
              (signUpError.message.includes('confirm') || signUpError.message.includes('verification'))) {
            return {
              success: false,
              error: 'Email confirmation required. Please disable email confirmation in Supabase Auth Settings or manually confirm the email.',
              errorType: 'EMAIL_CONFIRMATION_REQUIRED',
              redirectPath: '/email-confirmation'
            };
          }

          lastError = signUpError;
          continue; // Try next email
        }

        if (!signUpData.user) {
          console.warn(`Email ${email} failed: No user returned`);
          continue;
        }

        // Success! Use this email
        successfulEmail = email;
        authData = signUpData;
        console.log(`Successfully created user with email: ${email}`);
        break;

      } catch (error) {
        console.warn(`Email ${email} failed with exception:`, error);
        lastError = error;
        continue; // Try next email
      }
    }

    if (!authData) {
      throw lastError || new Error('All email attempts failed');
    }

    console.log('Super admin user created successfully');

    // Wait a moment for the profile to be created by the trigger
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update the profile to set admin role and other details
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: SUPER_ADMIN_CREDENTIALS.fullName,
        role: 'admin',
        status: 'active',
        department: 'IT',
        position: 'System Administrator',
        // Don't set company_id yet as companies table might not exist
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error('Profile update error details:', {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code,
        fullError: JSON.stringify(profileError, null, 2)
      });

      // Try to check if the profile was created
      const { data: checkProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, email, role, status')
        .eq('id', authData.user.id)
        .single();

      if (checkError) {
        console.error('Profile does not exist, this might be a trigger issue:', {
          message: checkError.message,
          details: checkError.details,
          hint: checkError.hint,
          code: checkError.code,
          fullError: JSON.stringify(checkError, null, 2)
        });

        // Profile wasn't created by the trigger, create it manually
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: SUPER_ADMIN_CREDENTIALS.email,
            full_name: SUPER_ADMIN_CREDENTIALS.fullName,
            role: 'admin',
            status: 'active',
            department: 'IT',
            position: 'System Administrator',
          });

        if (insertError) {
          console.error('Failed to create profile manually:', {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code,
            fullError: JSON.stringify(insertError, null, 2)
          });
          return {
            success: false,
            error: `Profile creation failed: ${insertError.message}. Details: ${insertError.details || 'N/A'}`
          };
        } else {
          console.log('Profile created manually successfully');
        }
      } else {
        console.log('Profile exists but update failed. Profile data:', checkProfile);
        // Profile exists but couldn't update - this might be a permissions issue
        return {
          success: false,
          error: `Profile update failed: ${profileError.message}. The user was created but role assignment failed. Details: ${profileError.details || 'N/A'}`
        };
      }
    } else {
      console.log('Profile updated successfully');
    }

    // Grant all admin permissions (if user_permissions table exists)
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
      const { error: permissionError } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: authData.user.id,
          permission_name: permission,
          granted: true,
        });

      if (permissionError) {
        console.warn(`Failed to grant permission ${permission}:`, {
          message: permissionError.message,
          details: permissionError.details,
          code: permissionError.code
        });
      } else {
        permissionsGranted++;
      }
    }

    console.log(`Super admin permissions: ${permissionsGranted}/${adminPermissions.length} granted successfully`);

    return {
      success: true,
      message: `Super admin created successfully! Profile updated and ${permissionsGranted} permissions granted.`,
      credentials: { ...SUPER_ADMIN_CREDENTIALS, email: successfulEmail },
      details: {
        userId: authData.user.id,
        email: successfulEmail,
        permissionsGranted
      }
    };

  } catch (error) {
    console.error('Error creating super admin:', error);

    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object') {
      // Handle Supabase error objects
      const supabaseError = error as any;
      errorMessage = supabaseError.message || 'Database error occurred';
      if (supabaseError.details) {
        errorMessage += `. Details: ${supabaseError.details}`;
      }
      if (supabaseError.hint) {
        errorMessage += `. Hint: ${supabaseError.hint}`;
      }
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

// Function to run the super admin setup (call this once)
export const setupSuperAdmin = async () => {
  const result = await createSuperAdmin();
  
  if (result.success) {
    toast.success(result.message);
    console.log('🔐 SUPER ADMIN CREDENTIALS:');
    console.log('📧 Email:', SUPER_ADMIN_CREDENTIALS.email);
    console.log('🔑 Password:', SUPER_ADMIN_CREDENTIALS.password);
    console.log('⚠️  Please save these credentials securely and change the password after first login!');
  } else {
    toast.error(`Failed to create super admin: ${result.error}`);
  }
  
  return result;
};
