import { supabase } from '@/integrations/supabase/client';
import { examineCompaniesTable, associateUserWithCompany } from './examineCompaniesTable';
import { diagnoseUserProfile, fixUserProfile } from './userProfileDiagnostic';

/**
 * Diagnose user-company association issues
 */
export async function diagnoseUserCompanyIssue() {
  console.log('🔍 Diagnosing user-company association...');

  try {
    // 1. First check user profile using the dedicated profile diagnostic
    const profileDiagnosis = await diagnoseUserProfile();

    if (!profileDiagnosis.success) {
      return {
        success: false,
        issue: profileDiagnosis.issue,
        message: profileDiagnosis.message,
        details: profileDiagnosis.details,
        user: profileDiagnosis.user,
        profileDiagnosis: profileDiagnosis
      };
    }

    const user = profileDiagnosis.user;
    const profile = profileDiagnosis.profile;

    console.log('✅ User authenticated and profile found:', user.id, user.email);

    // 3. Check if profile has company_id
    if (!profile.company_id) {
      console.log('❌ Profile missing company_id');

      // Use the comprehensive companies examination
      const companiesResult = await examineCompaniesTable();

      return {
        success: false,
        issue: 'no_company_association',
        message: 'User profile has no company_id',
        user: user,
        profile: profile,
        availableCompanies: companiesResult.companies || [],
        companiesError: companiesResult.success ? null : companiesResult.message,
        companiesAnalysis: companiesResult.analysis
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
    // Use the new associateUserWithCompany utility
    const associationResult = await associateUserWithCompany();

    if (!associationResult.success) {
      throw new Error(associationResult.message);
    }

    // Verify the fix
    const verifyDiagnosis = await diagnoseUserCompanyIssue();

    return {
      success: verifyDiagnosis.success,
      message: verifyDiagnosis.success
        ? 'User-company association fixed successfully'
        : 'Fix attempted but verification failed',
      companyId: associationResult.companyId,
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
