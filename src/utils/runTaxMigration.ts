import { supabase } from '@/integrations/supabase/client';

export async function runTaxMigration(): Promise<void> {
  console.log('Starting tax_settings migration...');
  
  try {
    // First, check if table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('tax_settings')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      console.log('tax_settings table already exists');
      return;
    }
    
    // Create the table and related objects
    const migrationSteps = [
      // 1. Create the table
      `CREATE TABLE tax_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
        name VARCHAR(255) NOT NULL,
        rate DECIMAL(6,3) NOT NULL DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      
      // 2. Enable RLS
      `ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY`,
      
      // 3. Add indexes
      `CREATE INDEX idx_tax_settings_company_id ON tax_settings(company_id)`,
      `CREATE INDEX idx_tax_settings_active ON tax_settings(company_id, is_active)`,
      `CREATE INDEX idx_tax_settings_default ON tax_settings(company_id, is_default)`,
      `CREATE UNIQUE INDEX idx_tax_settings_unique_default ON tax_settings(company_id) WHERE is_default = TRUE`,
      
      // 4. Add foreign key columns to item tables
      `ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tax_setting_id UUID REFERENCES tax_settings(id)`,
      `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_setting_id UUID REFERENCES tax_settings(id)`,
      `ALTER TABLE proforma_items ADD COLUMN IF NOT EXISTS tax_setting_id UUID REFERENCES tax_settings(id)`
    ];
    
    // Execute each step
    for (let i = 0; i < migrationSteps.length; i++) {
      console.log(`Executing step ${i + 1}/${migrationSteps.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: migrationSteps[i]
      });

      if (error) {
        console.error(`Error in step ${i + 1}:`, JSON.stringify(error, null, 2));
        throw new Error(`Step ${i + 1} failed: ${error.message || JSON.stringify(error)}`);
      }
    }
    
    // Insert default tax settings
    const { data: companies } = await supabase
      .from('companies')
      .select('id');
    
    if (companies && companies.length > 0) {
      for (const company of companies) {
        // Insert VAT as default
        await supabase
          .from('tax_settings')
          .insert([
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
          ]);
      }
    }
    
    console.log('✅ Tax settings migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    throw new Error(`Migration failed: ${errorMessage}`);
  }
}
