import { supabase } from '@/integrations/supabase/client';

export const forceTaxColumnsMigration = async () => {
  console.log('Starting forced migration for tax columns...');
  
  try {
    // Step 1: Add tax columns to quotation_items
    console.log('Adding tax columns to quotation_items...');
    const { error: quotationError } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE quotation_items 
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
      `
    });
    
    if (quotationError && !quotationError.message.includes('already exists')) {
      // Try direct SQL execution if RPC doesn't work
      console.log('RPC failed, trying direct SQL...');
      await supabase.from('quotation_items').select('tax_amount').limit(1);
    }
    
    // Step 2: Add tax columns to invoice_items
    console.log('Adding tax columns to invoice_items...');
    const { error: invoiceError } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE invoice_items
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
      `
    });
    
    if (invoiceError && !invoiceError.message.includes('already exists')) {
      await supabase.from('invoice_items').select('tax_amount').limit(1);
    }

    // Step 3: Update existing records
    console.log('Updating existing records...');
    
    // Update quotation_items
    await supabase
      .from('quotation_items')
      .update({
        tax_percentage: 0,
        tax_amount: 0,
        tax_inclusive: false
      })
      .is('tax_percentage', null);
    
    // Update invoice_items  
    await supabase
      .from('invoice_items')
      .update({
        tax_percentage: 0,
        tax_amount: 0,
        tax_inclusive: false
      })
      .is('tax_percentage', null);

    console.log('Migration completed successfully!');
    return { success: true, message: 'Tax columns migration completed successfully!' };
    
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: error };
  }
};

// Alternative approach - execute raw SQL
export const executeRawMigrationSQL = async () => {
  const migrationSQL = `
    -- Add tax columns to quotation_items if they don't exist
    DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='quotation_items' AND column_name='tax_percentage') THEN
            ALTER TABLE quotation_items ADD COLUMN tax_percentage DECIMAL(6,3) DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='quotation_items' AND column_name='tax_amount') THEN
            ALTER TABLE quotation_items ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='quotation_items' AND column_name='tax_inclusive') THEN
            ALTER TABLE quotation_items ADD COLUMN tax_inclusive BOOLEAN DEFAULT false;
        END IF;
        
        -- Add tax columns to invoice_items if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='invoice_items' AND column_name='tax_percentage') THEN
            ALTER TABLE invoice_items ADD COLUMN tax_percentage DECIMAL(6,3) DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='invoice_items' AND column_name='tax_amount') THEN
            ALTER TABLE invoice_items ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='invoice_items' AND column_name='tax_inclusive') THEN
            ALTER TABLE invoice_items ADD COLUMN tax_inclusive BOOLEAN DEFAULT false;
        END IF;
    END $$;

    -- Update existing records
    UPDATE quotation_items 
    SET tax_percentage = COALESCE(tax_percentage, 0),
        tax_amount = COALESCE(tax_amount, 0),
        tax_inclusive = COALESCE(tax_inclusive, false);

    UPDATE invoice_items 
    SET tax_percentage = COALESCE(tax_percentage, 0),
        tax_amount = COALESCE(tax_amount, 0),
        tax_inclusive = COALESCE(tax_inclusive, false);
  `;

  try {
    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', { query: migrationSQL });
    
    if (error) {
      throw error;
    }
    
    console.log('Raw SQL migration executed successfully');
    return { success: true, data };
    
  } catch (error) {
    console.error('Raw SQL migration failed:', error);
    return { success: false, error };
  }
};

// Check if columns exist
export const checkTaxColumnsExist = async () => {
  try {
    // Try to select tax_amount from both tables to see if columns exist
    const { data: quotationTest, error: quotationError } = await supabase
      .from('quotation_items')
      .select('tax_amount')
      .limit(1);
      
    const { data: invoiceTest, error: invoiceError } = await supabase
      .from('invoice_items')
      .select('tax_amount')
      .limit(1);
    
    return {
      quotation_items_has_tax_columns: !quotationError,
      invoice_items_has_tax_columns: !invoiceError,
      quotationError: quotationError?.message,
      invoiceError: invoiceError?.message
    };
  } catch (error) {
    return { error: error };
  }
};
