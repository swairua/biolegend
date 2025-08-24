import { supabase } from '@/integrations/supabase/client';

/**
 * Diagnose user profile issues
 */
export async function diagnoseUserProfile() {
  console.log('👤 Diagnosing user profile...');
  
  try {
    // 1. Check current user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        issue: 'not_authenticated',
        message: 'User not authenticated',
        details: userError?.message
      };
    }

    console.log('✅ User authenticated:', user.id, user.email);

    // 2. Check if user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      // Check if it's a "not found" error vs other errors
      if (profileError.code === 'PGRST116') {
        return {
          success: false,
          issue: 'profile_missing',
          message: 'User profile not found in profiles table',
          user: user,
          profileError: profileError
        };
      } else {
        return {
          success: false,
          issue: 'profile_access_error',
          message: 'Error accessing profiles table',
          details: profileError.message,
          user: user
        };
      }
    }

    console.log('✅ User profile found:', profile);

    // 3. Check profile completeness
    const missingFields = [];
    if (!profile.full_name) missingFields.push('full_name');
    if (!profile.email) missingFields.push('email');

    if (missingFields.length > 0) {
      return {
        success: true,
        issue: 'profile_incomplete',
        message: 'User profile exists but is incomplete',
        user: user,
        profile: profile,
        missingFields: missingFields
      };
    }

    return {
      success: true,
      message: 'User profile is complete and valid',
      user: user,
      profile: profile
    };

  } catch (error: any) {
    console.error('❌ Error diagnosing user profile:', error);
    return {
      success: false,
      issue: 'unexpected_error',
      message: 'Unexpected error during profile diagnosis',
      details: error.message
    };
  }
}

/**
 * Create missing user profile
 */
export async function createUserProfile() {
  console.log('🔧 Creating user profile...');
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Create profile data
    const profileData = {
      id: user.id,
      email: user.email || 'admin@company.com',
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin User',
      phone: user.user_metadata?.phone || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      company_id: null, // Will be set later by company association logic
      department: null,
      position: 'Administrator',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Creating profile with data:', profileData);

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create profile: ${createError.message}`);
    }

    console.log('✅ Profile created successfully:', newProfile);

    return {
      success: true,
      message: 'User profile created successfully',
      profile: newProfile
    };

  } catch (error: any) {
    console.error('❌ Error creating user profile:', error);
    return {
      success: false,
      message: 'Failed to create user profile',
      error: error.message
    };
  }
}

/**
 * Fix user profile issues (create if missing, complete if incomplete)
 */
export async function fixUserProfile() {
  console.log('🔧 Starting user profile fix...');
  
  try {
    const diagnosis = await diagnoseUserProfile();
    
    if (diagnosis.success && diagnosis.issue !== 'profile_incomplete') {
      return {
        success: true,
        message: 'No fix needed - profile is already valid',
        diagnosis
      };
    }

    // Handle missing profile
    if (diagnosis.issue === 'profile_missing') {
      const createResult = await createUserProfile();
      if (!createResult.success) {
        throw new Error(createResult.message);
      }
      
      // Verify the fix
      const verifyDiagnosis = await diagnoseUserProfile();
      
      return {
        success: verifyDiagnosis.success,
        message: verifyDiagnosis.success 
          ? 'User profile created and verified successfully'
          : 'Profile created but verification failed',
        diagnosis: verifyDiagnosis,
        action: 'created'
      };
    }

    // Handle incomplete profile
    if (diagnosis.issue === 'profile_incomplete') {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates: any = {};
      
      if (diagnosis.missingFields?.includes('full_name')) {
        updates.full_name = user?.email?.split('@')[0] || 'Admin User';
      }
      if (diagnosis.missingFields?.includes('email')) {
        updates.email = user?.email || 'admin@company.com';
      }
      
      updates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user!.id);

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      const verifyDiagnosis = await diagnoseUserProfile();
      
      return {
        success: verifyDiagnosis.success,
        message: 'User profile completed successfully',
        diagnosis: verifyDiagnosis,
        action: 'updated'
      };
    }

    throw new Error(`Cannot fix profile issue: ${diagnosis.message}`);

  } catch (error: any) {
    console.error('❌ Profile fix failed:', error);
    return {
      success: false,
      message: 'Failed to fix user profile',
      error: error.message
    };
  }
}

/**
 * Comprehensive test of profile fix process
 */
export async function testProfileFixProcess() {
  console.log('🧪 Testing profile fix process...');
  
  const results = {
    initialDiagnosis: null as any,
    fixAttempt: null as any,
    finalDiagnosis: null as any,
    success: false,
    errors: [] as string[]
  };

  try {
    // Step 1: Initial diagnosis
    console.log('📋 Step 1: Running initial profile diagnosis...');
    results.initialDiagnosis = await diagnoseUserProfile();
    
    if (results.initialDiagnosis.success && results.initialDiagnosis.issue !== 'profile_incomplete') {
      console.log('✅ User profile already valid');
      results.success = true;
    } else {
      console.log('⚠️ Profile issue detected:', results.initialDiagnosis.message);
      
      // Step 2: Attempt fix
      console.log('🔧 Step 2: Attempting to fix user profile...');
      results.fixAttempt = await fixUserProfile();
      
      if (!results.fixAttempt.success) {
        results.errors.push(`Fix failed: ${results.fixAttempt.message}`);
        return results;
      }
      
      console.log('✅ Fix completed successfully');
      
      // Step 3: Verify fix worked
      console.log('🔍 Step 3: Verifying fix...');
      results.finalDiagnosis = await diagnoseUserProfile();
      
      if (!results.finalDiagnosis.success) {
        results.errors.push(`Verification failed: ${results.finalDiagnosis.message}`);
        return results;
      }
      
      console.log('✅ Fix verification successful');
      results.success = true;
    }

  } catch (error: any) {
    results.errors.push(`Test process failed: ${error.message}`);
    console.error('❌ Test process error:', error);
  }

  return results;
}
