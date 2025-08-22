import { supabase } from '@/integrations/supabase/client';

const TAX_MIGRATION_SQL = `
-- Add tax columns to quotation_items
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Add tax columns to invoice_items
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Add tax columns to proforma_items (if it exists)
ALTER TABLE proforma_items
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Create tax_settings table for managing company tax rates
CREATE TABLE IF NOT EXISTS tax_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    rate DECIMAL(6,3) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for tax_settings
ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;

-- Create indexes for tax_settings
CREATE INDEX IF NOT EXISTS idx_tax_settings_company_id ON tax_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_settings_active ON tax_settings(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tax_settings_default ON tax_settings(company_id, is_default);

-- Ensure only one default tax per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_settings_unique_default
    ON tax_settings(company_id)
    WHERE is_default = TRUE;

-- Update trigger function for tax_settings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to tax_settings table
DROP TRIGGER IF EXISTS update_tax_settings_updated_at ON tax_settings;
CREATE TRIGGER update_tax_settings_updated_at
    BEFORE UPDATE ON tax_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update existing records to have default tax values
UPDATE quotation_items 
SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false 
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

UPDATE invoice_items 
SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false 
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

-- Try to update proforma_items if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proforma_items') THEN
        UPDATE proforma_items 
        SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false 
        WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;
    END IF;
END $$;

-- Insert default tax settings for existing companies
INSERT INTO tax_settings (company_id, name, rate, is_active, is_default)
SELECT 
    c.id as company_id,
    'VAT (16%)' as name,
    16.000 as rate,
    true as is_active,
    true as is_default
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM tax_settings ts 
    WHERE ts.company_id = c.id AND ts.is_default = true
);

-- Insert additional standard tax rates
INSERT INTO tax_settings (company_id, name, rate, is_active, is_default)
SELECT 
    c.id as company_id,
    'Zero Rated (0%)' as name,
    0.000 as rate,
    true as is_active,
    false as is_default
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM tax_settings ts 
    WHERE ts.company_id = c.id AND ts.name = 'Zero Rated (0%)'
);

INSERT INTO tax_settings (company_id, name, rate, is_active, is_default)
SELECT 
    c.id as company_id,
    'Exempt (0%)' as name,
    0.000 as rate,
    true as is_active,
    false as is_default
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM tax_settings ts 
    WHERE ts.company_id = c.id AND ts.name = 'Exempt (0%)'
);
`;

export async function forceTaxMigration(): Promise<{ success: boolean; message: string }> {
  console.log('🚀 Starting forced tax migration...');

  try {
    // Try different RPC methods to execute the SQL
    const rpcMethods = ['exec_sql', 'execute_sql', 'sql', 'run_sql'];
    const argNames = ['sql_query', 'query'];

    let migrationSuccess = false;
    let lastError = null;

    for (const rpcMethod of rpcMethods) {
      for (const argName of argNames) {
        try {
          console.log(`Trying ${rpcMethod} with argument ${argName}...`);

          const { data, error } = await supabase.rpc(rpcMethod, {
            [argName]: TAX_MIGRATION_SQL
          });

          if (!error) {
            console.log('✅ Tax migration completed successfully!');
            console.log('Migration result:', data);
            migrationSuccess = true;
            break;
          } else {
            lastError = error;
            console.log(`❌ ${rpcMethod}(${argName}) failed:`, error);
          }
        } catch (err) {
          lastError = err;
          console.log(`❌ ${rpcMethod}(${argName}) threw error:`, err);
        }
      }

      if (migrationSuccess) break;
    }

    if (!migrationSuccess) {
      throw new Error(`All RPC methods failed. Last error: ${lastError instanceof Error ? lastError.message : JSON.stringify(lastError)}`);
    }

    // Verify tax columns were created
    console.log('🔍 Verifying tax columns...');
    
    const { data: quotationCheck, error: quotationError } = await supabase
      .from('quotation_items')
      .select('tax_amount, tax_percentage, tax_inclusive')
      .limit(1);

    const { data: invoiceCheck, error: invoiceError } = await supabase
      .from('invoice_items')
      .select('tax_amount, tax_percentage, tax_inclusive')
      .limit(1);

    const { data: taxSettingsCheck, error: taxSettingsError } = await supabase
      .from('tax_settings')
      .select('id')
      .limit(1);

    if (quotationError || invoiceError || taxSettingsError) {
      console.log('⚠️ Tax migration completed but verification had issues:', {
        quotationError,
        invoiceError,
        taxSettingsError
      });
      return {
        success: true,
        message: 'Tax migration completed but verification unclear. Check manually.'
      };
    }

    console.log('✅ Tax migration verification successful!');
    return {
      success: true,
      message: 'Tax migration completed and verified successfully!'
    };

  } catch (error) {
    console.error('❌ Tax migration failed:', error);

    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    return {
      success: false,
      message: `Tax migration failed: ${errorMessage}`
    };
  }
}
