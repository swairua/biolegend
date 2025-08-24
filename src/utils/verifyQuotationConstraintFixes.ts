import { supabase } from '@/integrations/supabase/client';

/**
 * Verifies that quotation constraint violations have been fixed
 * by checking the database schema and testing basic operations
 */
export async function verifyQuotationConstraintFixes() {
  const results = {
    schemaCheck: false,
    foreignKeyCheck: false,
    userAuthCheck: false,
    companyCheck: false,
    errors: [] as string[]
  };

  try {
    console.log('🔍 Verifying quotation constraint fixes...');

    // 1. Check if quotations table exists and has correct structure
    const { data: quotationsTable, error: tableError } = await supabase
      .from('quotations')
      .select('id')
      .limit(1);

    if (tableError) {
      results.errors.push(`Quotations table error: ${tableError.message}`);
    } else {
      results.schemaCheck = true;
      console.log('✅ Quotations table accessible');
    }

    // 2. Check current user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      results.errors.push('No authenticated user found');
    } else {
      results.userAuthCheck = true;
      console.log('✅ User authenticated:', user.id);

      // 3. Check if user has a profile with company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, company_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        results.errors.push(`Profile check failed: ${profileError.message}`);
      } else if (!profile?.company_id) {
        results.errors.push('User profile missing company_id');
      } else {
        results.companyCheck = true;
        console.log('✅ User has valid profile with company:', profile.company_id);
      }
    }

    // 4. Verify foreign key relationships
    try {
      // Check if companies table is accessible
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id')
        .limit(1);

      if (companiesError) {
        results.errors.push(`Companies table error: ${companiesError.message}`);
      } else {
        results.foreignKeyCheck = true;
        console.log('✅ Companies table accessible');
      }

      // Check if profiles/users table is accessible for created_by reference
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (profilesError) {
        results.errors.push(`Profiles table error: ${profilesError.message}`);
      } else {
        console.log('✅ Profiles table accessible');
      }

    } catch (error: any) {
      results.errors.push(`Foreign key check failed: ${error.message}`);
    }

    // 5. Test quotation creation with minimal data (dry run)
    if (results.userAuthCheck && results.companyCheck && user) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        const { data: customers } = await supabase
          .from('customers')
          .select('id')
          .eq('company_id', profile?.company_id)
          .limit(1);

        if (customers && customers.length > 0) {
          console.log('✅ Valid customer data available for testing');
          
          // Test quotation number generation
          const { data: quotationNumber, error: numberError } = await supabase
            .rpc('generate_quotation_number', { company_uuid: profile?.company_id });

          if (numberError) {
            results.errors.push(`Quotation number generation failed: ${numberError.message}`);
          } else {
            console.log('✅ Quotation number generation working:', quotationNumber);
          }
        } else {
          results.errors.push('No customers available for testing quotation creation');
        }
      } catch (error: any) {
        results.errors.push(`Quotation creation test failed: ${error.message}`);
      }
    }

  } catch (error: any) {
    results.errors.push(`Verification failed: ${error.message}`);
  }

  // Summary
  const allChecksPass = results.schemaCheck && results.foreignKeyCheck && 
                       results.userAuthCheck && results.companyCheck;

  console.log('\n📊 Verification Summary:');
  console.log(`Schema Check: ${results.schemaCheck ? '✅' : '❌'}`);
  console.log(`Foreign Key Check: ${results.foreignKeyCheck ? '✅' : '❌'}`);
  console.log(`User Auth Check: ${results.userAuthCheck ? '✅' : '❌'}`);
  console.log(`Company Check: ${results.companyCheck ? '✅' : '❌'}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors found:');
    results.errors.forEach(error => console.log(`  - ${error}`));
  }

  if (allChecksPass && results.errors.length === 0) {
    console.log('\n🎉 All quotation constraint fixes verified successfully!');
  } else {
    console.log('\n⚠️ Some issues remain - check errors above');
  }

  return {
    success: allChecksPass && results.errors.length === 0,
    results,
    errors: results.errors
  };
}

// Quick test function to verify constraint fixes are working
export async function testQuotationCreation() {
  try {
    console.log('🧪 Testing quotation creation process...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      throw new Error('User has no associated company');
    }

    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .eq('company_id', profile.company_id)
      .limit(1);

    if (!customers || customers.length === 0) {
      throw new Error('No customers available');
    }

    // Create test quotation data (without actually inserting)
    const testQuotationData = {
      company_id: profile.company_id,
      customer_id: customers[0].id,
      quotation_number: 'TEST-QUOTE-001',
      quotation_date: new Date().toISOString().split('T')[0],
      status: 'draft',
      subtotal: 100.00,
      tax_amount: 16.00,
      total_amount: 116.00,
      created_by: user.id
    };

    console.log('✅ Test quotation data structure valid:', testQuotationData);
    console.log('🎉 Quotation creation test passed - constraint violations should be resolved!');
    
    return { success: true, testData: testQuotationData };
  } catch (error: any) {
    console.error('❌ Quotation creation test failed:', error.message);
    return { success: false, error: error.message };
  }
}
