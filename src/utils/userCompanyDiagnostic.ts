import { supabase } from '@/integrations/supabase/client';
import { examineCompaniesTable, associateUserWithCompany } from './examineCompaniesTable';

/**
 * Diagnose user-company association issues
 */
export async function diagnoseUserCompanyIssue() {
  console.log('🔍 Diagnosing user-company association...');
  
  try {
    // 1. Check current user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        issue: 'authentication',
        message: 'User not authenticated',
        details: userError?.message
      };
    }

    console.log('✅ User authenticated:', user.id, user.email);

    // 2. Check user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return {
        success: false,
        issue: 'profile_missing',
        message: 'User profile not found',
        details: profileError.message,
        user: user
      };
    }

    console.log('✅ User profile found:', profile);

    // 3. Check if profile has company_id
    if (!profile.company_id) {
      console.log('❌ Profile missing company_id');
      
      // Check available companies
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*');

      return {
        success: false,
        issue: 'no_company_association',
        message: 'User profile has no company_id',
        user: user,
        profile: profile,
        availableCompanies: companies || [],
        companiesError: companiesError?.message
      };
    }

    console.log('✅ Profile has company_id:', profile.company_id);

    // 4. Verify the company exists
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single();

    if (companyError || !company) {
      return {
        success: false,
        issue: 'invalid_company_reference',
        message: 'Profile references non-existent company',
        details: companyError?.message,
        user: user,
        profile: profile
      };
    }

    console.log('✅ Company found:', company);

    // 5. All checks passed
    return {
      success: true,
      message: 'User-company association is valid',
      user: user,
      profile: profile,
      company: company
    };

  } catch (error: any) {
    return {
      success: false,
      issue: 'unexpected_error',
      message: 'Unexpected error during diagnosis',
      details: error.message
    };
  }
}

/**
 * Fix user-company association by creating a company or associating with existing one
 */
export async function fixUserCompanyAssociation() {
  console.log('🔧 Starting user-company association fix...');
  
  const diagnosis = await diagnoseUserCompanyIssue();
  
  if (diagnosis.success) {
    return {
      success: true,
      message: 'No fix needed - association already valid',
      diagnosis
    };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    let companyId: string;

    // Check if there are existing companies
    const { data: existingCompanies } = await supabase
      .from('companies')
      .select('*');

    if (existingCompanies && existingCompanies.length > 0) {
      // Use the first available company
      companyId = existingCompanies[0].id;
      console.log('🏢 Using existing company:', existingCompanies[0].name, companyId);
    } else {
      // Create a new company
      const defaultCompanyData = {
        name: 'Default Company',
        email: user.email || 'admin@company.com',
        phone: '+254700000000',
        address: 'Nairobi, Kenya',
        registration_number: 'REG001',
        tax_number: 'TAX001',
        currency: 'KES',
        logo_url: null
      };

      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert([defaultCompanyData])
        .select()
        .single();

      if (createError || !newCompany) {
        throw new Error(`Failed to create company: ${createError?.message}`);
      }

      companyId = newCompany.id;
      console.log('🏢 Created new company:', newCompany.name, companyId);
    }

    // Update user profile with company_id
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ company_id: companyId })
      .eq('id', user.id);

    if (updateError) {
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    console.log('✅ Profile updated with company_id:', companyId);

    // Verify the fix
    const verifyDiagnosis = await diagnoseUserCompanyIssue();
    
    return {
      success: verifyDiagnosis.success,
      message: verifyDiagnosis.success 
        ? 'User-company association fixed successfully'
        : 'Fix attempted but verification failed',
      companyId,
      diagnosis: verifyDiagnosis
    };

  } catch (error: any) {
    console.error('❌ Fix failed:', error);
    return {
      success: false,
      message: 'Failed to fix user-company association',
      error: error.message
    };
  }
}
