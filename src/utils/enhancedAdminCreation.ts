import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const BIOLEGEND_ADMIN_CREDENTIALS = {
  email: 'admin@biolegendscientific.co.ke',
  password: 'Biolegend2024!Admin',
  fullName: 'System Administrator'
};

interface AdminCreationResult {
  success: boolean;
  message: string;
  error?: string;
  requiresManualConfirmation?: boolean;
  instructions?: string[];
}

/**
 * Enhanced admin creation that handles email confirmation intelligently
 */
export const createBiolegendAdmin = async (): Promise<AdminCreationResult> => {
  try {
    console.log('🚀 Creating Biolegend admin with enhanced email handling...');

    // Step 1: Check if admin already exists and can sign in
    console.log('🔍 Checking existing admin...');
    const { data: existingAuth, error: signInError } = await supabase.auth.signInWithPassword({
      email: BIOLEGEND_ADMIN_CREDENTIALS.email,
      password: BIOLEGEND_ADMIN_CREDENTIALS.password,
    });

    if (existingAuth?.user && !signInError) {
      console.log('✅ Admin user already exists and working');
      await ensureAdminProfile(existingAuth.user.id);
      return {
        success: true,
        message: 'Admin user already exists and is ready to use!'
      };
    }

    // Step 2: Check if user exists but needs confirmation
    if (signInError && signInError.message.includes('Email not confirmed')) {
      console.log('⚠️ Admin exists but email not confirmed');
      const confirmResult = await attemptEmailConfirmationBypass(BIOLEGEND_ADMIN_CREDENTIALS.email);
      if (confirmResult.success) {
        return confirmResult;
      }
    }

    // Step 3: Try to create new admin user
    console.log('📝 Creating new admin user...');
    const { data: authData, error: createError } = await supabase.auth.signUp({
      email: BIOLEGEND_ADMIN_CREDENTIALS.email,
      password: BIOLEGEND_ADMIN_CREDENTIALS.password,
      options: {
        data: {
          full_name: BIOLEGEND_ADMIN_CREDENTIALS.fullName,
          role: 'admin'
        }
      }
    });

    if (createError) {
      // Handle specific error cases
      if (createError.message.includes('User already registered')) {
        // User exists but can't sign in - try confirmation bypass
        const confirmResult = await attemptEmailConfirmationBypass(BIOLEGEND_ADMIN_CREDENTIALS.email);
        return confirmResult;
      }
      
      throw createError;
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user data returned');
    }

    // Step 4: Check if email confirmation is required
    if (authData.user.email_confirmed_at) {
      console.log('✅ User created with automatic email confirmation');
      await ensureAdminProfile(authData.user.id);
      return {
        success: true,
        message: 'Admin user created successfully with automatic email confirmation!'
      };
    } else {
      console.log('⚠️ User created but email confirmation required');
      
      // Try to bypass email confirmation
      const bypassResult = await attemptEmailConfirmationBypass(BIOLEGEND_ADMIN_CREDENTIALS.email);
      if (bypassResult.success) {
        return bypassResult;
      }

      // If bypass failed, provide manual instructions
      return {
        success: false,
        requiresManualConfirmation: true,
        error: 'Admin user created but email confirmation is required.',
        instructions: [
          '1. Open your Supabase Dashboard',
          '2. Go to Authentication → Users',
          '3. Find the admin user: admin@biolegendscientific.co.ke', 
          '4. Click the three dots menu → "Confirm email"',
          '5. Return here and refresh the page',
          '',
          'Alternative: Disable email confirmations in Auth Settings'
        ],
        message: 'Manual email confirmation required'
      };
    }

  } catch (error) {
    console.error('❌ Enhanced admin creation failed:', error);
    return {
      success: false,
      error: `Admin creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Attempt various methods to bypass email confirmation
 */
const attemptEmailConfirmationBypass = async (email: string): Promise<AdminCreationResult> => {
  console.log('🔧 Attempting email confirmation bypass...');

  // Method 1: Try to use a database function to confirm email
  try {
    const { data, error } = await supabase.rpc('confirm_user_email', {
      user_email: email
    });

    if (!error && data) {
      console.log('✅ Email confirmed via database function');
      
      // Try to sign in again
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: BIOLEGEND_ADMIN_CREDENTIALS.email,
        password: BIOLEGEND_ADMIN_CREDENTIALS.password,
      });

      if (signInData?.user && !signInError) {
        await ensureAdminProfile(signInData.user.id);
        return {
          success: true,
          message: 'Email confirmation bypassed successfully via database function!'
        };
      }
    }
  } catch (error) {
    console.log('Database function method failed:', error);
  }

  // Method 2: Try to update auth.users table directly (if RLS allows)
  try {
    const { error } = await supabase.rpc('force_confirm_admin_email', {
      admin_email: email
    });

    if (!error) {
      console.log('✅ Email confirmed via direct database update');
      
      // Try to sign in again
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: BIOLEGEND_ADMIN_CREDENTIALS.email,
        password: BIOLEGEND_ADMIN_CREDENTIALS.password,
      });

      if (signInData?.user && !signInError) {
        await ensureAdminProfile(signInData.user.id);
        return {
          success: true,
          message: 'Email confirmation bypassed successfully via database update!'
        };
      }
    }
  } catch (error) {
    console.log('Direct database update method failed:', error);
  }

  // Method 3: Try to create a confirmation link
  try {
    // Generate a bypass link that might work
    const confirmationToken = 'admin-bypass-' + Date.now();
    console.log('Generated bypass token:', confirmationToken);
    
    // This is informational for manual confirmation
    const bypassURL = `${supabase.supabaseUrl}/auth/v1/verify?token=${confirmationToken}&type=signup`;
    console.log('Potential bypass URL:', bypassURL);
    
  } catch (error) {
    console.log('Bypass link generation failed:', error);
  }

  // All methods failed
  return {
    success: false,
    requiresManualConfirmation: true,
    error: 'Could not automatically bypass email confirmation',
    instructions: [
      '🔧 Email confirmation bypass failed. Manual steps required:',
      '',
      '1. Open Supabase Dashboard → Authentication → Settings',
      '2. Turn OFF "Enable email confirmations"',
      '3. OR go to Authentication → Users',
      '4. Find admin@biolegendscientific.co.ke',
      '5. Click menu → "Confirm email"',
      '6. Return here and refresh'
    ]
  };
};

/**
 * Ensure admin profile exists with proper permissions
 */
const ensureAdminProfile = async (userId: string): Promise<void> => {
  try {
    console.log('👤 Ensuring admin profile for user:', userId);

    // First try to update existing profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: BIOLEGEND_ADMIN_CREDENTIALS.fullName,
        email: BIOLEGEND_ADMIN_CREDENTIALS.email,
        role: 'admin',
        status: 'active',
        department: 'Administration',
        position: 'System Administrator'
      })
      .eq('id', userId);

    if (updateError) {
      console.log('Profile update failed, creating new profile...');
      
      // Create new profile
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: BIOLEGEND_ADMIN_CREDENTIALS.email,
          full_name: BIOLEGEND_ADMIN_CREDENTIALS.fullName,
          role: 'admin',
          status: 'active',
          department: 'Administration',
          position: 'System Administrator'
        });

      if (insertError) {
        console.error('Failed to create profile:', insertError);
        throw insertError;
      }
    }

    // Grant admin permissions
    const adminPermissions = [
      'manage_users', 'manage_company', 'view_reports', 'manage_inventory',
      'manage_finance', 'manage_sales', 'manage_settings', 'view_dashboard',
      'create_quotations', 'view_customers', 'manage_credit_notes',
      'manage_invoices', 'manage_lpos', 'manage_delivery_notes', 'manage_payments'
    ];

    for (const permission of adminPermissions) {
      try {
        await supabase
          .from('user_permissions')
          .upsert({
            user_id: userId,
            permission_name: permission,
            granted: true,
          });
      } catch (permError) {
        console.warn(`Failed to grant ${permission}:`, permError);
      }
    }

    console.log('✅ Admin profile and permissions configured');

  } catch (error) {
    console.error('Profile setup failed:', error);
    throw error;
  }
};

/**
 * Quick check if admin can sign in
 */
export const checkAdminSignIn = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: BIOLEGEND_ADMIN_CREDENTIALS.email,
      password: BIOLEGEND_ADMIN_CREDENTIALS.password,
    });

    return !!(data?.user && !error);
  } catch (error) {
    return false;
  }
};

/**
 * Display helpful instructions to user
 */
export const showEmailConfirmationInstructions = (result: AdminCreationResult) => {
  if (result.requiresManualConfirmation && result.instructions) {
    const instructionText = result.instructions.join('\n');
    
    toast.error('Email Confirmation Required', {
      description: instructionText,
      duration: 10000
    });

    // Also log to console for easy copying
    console.log('📋 MANUAL CONFIRMATION INSTRUCTIONS:');
    console.log('=====================================');
    result.instructions.forEach(instruction => console.log(instruction));
    console.log('=====================================');
  }
};
