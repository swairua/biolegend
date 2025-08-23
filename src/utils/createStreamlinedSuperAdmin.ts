import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { retryWithRateLimit, checkSupabaseHealth } from './supabaseHealthCheck';

export const ADMIN_CREDENTIALS = {
  email: 'admin@biolegendscientific.co.ke',
  password: 'Biolegend2024!Admin',
  fullName: 'System Administrator'
};

interface SetupResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Streamlined super admin creation without email confirmation dependencies
 */
export const executeStreamlinedSetup = async (): Promise<SetupResult> => {
  try {
    console.log('🚀 Starting streamlined admin setup...');

    // Check Supabase health first
    const healthCheck = await checkSupabaseHealth();
    if (!healthCheck.healthy) {
      return {
        success: false,
        error: `Supabase health check failed: ${healthCheck.error}`,
        message: 'Supabase connection issues detected'
      };
    }

    // Step 1: Try to sign in with existing admin
    console.log('🔍 Checking for existing admin...');
    const { data: existingAuth, error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
    });

    if (existingAuth?.user && !signInError) {
      console.log('✅ Admin already exists and working');
      await ensureAdminProfile(existingAuth.user.id);
      return {
        success: true,
        message: 'Admin user already exists and is ready to use!'
      };
    }

    // Step 2: Create new admin user
    console.log('📝 Creating new admin user...');
    const { data: authData, error: createError } = await supabase.auth.signUp({
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
      options: {
        data: {
          full_name: ADMIN_CREDENTIALS.fullName,
        }
      }
    });

    if (createError) {
      if (createError.message.includes('User already registered')) {
        return {
          success: false,
          error: 'Admin user exists but cannot sign in - likely needs email confirmation',
          message: 'Email confirmation required'
        };
      }
      throw createError;
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user data returned');
    }

    // Step 3: Set up profile
    await ensureAdminProfile(authData.user.id);

    return {
      success: true,
      message: 'Admin user created successfully!'
    };

  } catch (error) {
    console.error('❌ Streamlined setup failed:', error);
    return {
      success: false,
      error: `Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      message: 'Admin creation encountered an error'
    };
  }
};

/**
 * Ensure admin profile exists with proper setup
 */
const ensureAdminProfile = async (userId: string): Promise<void> => {
  try {
    console.log('👤 Setting up admin profile for user:', userId);

    // Create or update profile
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: ADMIN_CREDENTIALS.email,
        full_name: ADMIN_CREDENTIALS.fullName,
        department: 'Administration',
        position: 'System Administrator'
      });

    if (upsertError) {
      console.error('Profile upsert failed:', upsertError);
      throw upsertError;
    }

    console.log('✅ Admin profile configured');

  } catch (error) {
    console.error('Profile setup failed:', error);
    throw error;
  }
};

/**
 * Quick health check before setup
 */
export const preSetupHealthCheck = async (): Promise<SetupResult> => {
  try {
    const healthCheck = await checkSupabaseHealth();
    
    if (!healthCheck.healthy) {
      return {
        success: false,
        error: healthCheck.error || 'Unknown health issue',
        message: 'Supabase connection failed'
      };
    }

    return {
      success: true,
      message: 'System is ready for admin setup'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Health check failed'
    };
  }
};
