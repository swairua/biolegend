import { supabase } from '@/integrations/supabase/client';

export async function runTaxSettingsMigration(): Promise<void> {
  console.log('🚀 Starting tax_settings migration...');

  try {
    // Step 1: Check if table already exists
    const { data: existingData, error: checkError } = await supabase
      .from('tax_settings')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ tax_settings table already exists');
      // Table exists, skip to inserting default data
    } else {
      console.log('📋 Table does not exist, checking if we can create it...');

      // The table doesn't exist - we cannot create tables through the Supabase client
      // We need to throw a specific error with instructions
      throw new Error('TABLE_CREATION_REQUIRED: The tax_settings table must be created manually. Please create it in your Supabase dashboard using the SQL provided.');
    }

    console.log('✅ Table verification completed');
    
    // Step 3: Insert default tax settings for all companies
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id');
    
    if (companiesError) {
      throw new Error(`Failed to fetch companies: ${companiesError.message}`);
    }
    
    if (companies && companies.length > 0) {
      console.log(`📦 Inserting default tax settings for ${companies.length} companies...`);
      
      for (const company of companies) {
        // Check if company already has tax settings
        const { data: existingTaxSettings } = await supabase
          .from('tax_settings')
          .select('id')
          .eq('company_id', company.id)
          .limit(1);
        
        if (existingTaxSettings && existingTaxSettings.length > 0) {
          console.log(`⏭️ Company ${company.id} already has tax settings, skipping...`);
          continue;
        }
        
        // Insert default tax settings
        const defaultTaxSettings = [
          {
            company_id: company.id,
            name: 'VAT',
            rate: 16.0,
            is_active: true,
            is_default: true
          },
          {
            company_id: company.id,
            name: 'Zero Rated',
            rate: 0.0,
            is_active: true,
            is_default: false
          },
          {
            company_id: company.id,
            name: 'Exempt',
            rate: 0.0,
            is_active: true,
            is_default: false
          }
        ];
        
        const { error: insertError } = await supabase
          .from('tax_settings')
          .insert(defaultTaxSettings);
        
        if (insertError) {
          console.error(`❌ Failed to insert tax settings for company ${company.id}:`, insertError);
          throw new Error(`Failed to insert tax settings for company ${company.id}: ${insertError.message}`);
        }
        
        console.log(`✅ Default tax settings created for company ${company.id}`);
      }
    }
    
    console.log('🎉 Tax settings migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    throw new Error(`Migration failed: ${errorMessage}`);
  }
}

export async function checkTaxSettingsStatus(): Promise<{
  tableExists: boolean;
  hasData: boolean;
  companyCount: number;
  taxSettingsCount: number;
}> {
  try {
    // Check if table exists by trying to query it
    const { data: taxData, error: taxError } = await supabase
      .from('tax_settings')
      .select('id, company_id')
      .limit(10);
    
    // Get company count
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id');
    
    const companyCount = companies?.length || 0;
    
    if (taxError) {
      return {
        tableExists: false,
        hasData: false,
        companyCount,
        taxSettingsCount: 0
      };
    }
    
    return {
      tableExists: true,
      hasData: (taxData?.length || 0) > 0,
      companyCount,
      taxSettingsCount: taxData?.length || 0
    };
    
  } catch (error) {
    console.error('Error checking tax settings status:', error);
    return {
      tableExists: false,
      hasData: false,
      companyCount: 0,
      taxSettingsCount: 0
    };
  }
}
