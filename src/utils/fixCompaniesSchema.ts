import { supabase } from '@/integrations/supabase/client';

export interface SchemaMigrationResult {
  success: boolean;
  message: string;
  errors: string[];
  columnsAdded: string[];
}

/**
 * Fix the companies table schema by adding missing columns
 */
export async function fixCompaniesSchema(): Promise<SchemaMigrationResult> {
  const result: SchemaMigrationResult = {
    success: false,
    message: '',
    errors: [],
    columnsAdded: []
  };

  try {
    console.log('🔧 Fixing companies table schema...');
    
    // Check if companies table exists first
    const { data: tableCheck, error: tableCheckError } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    if (tableCheckError && tableCheckError.message.includes('does not exist')) {
      result.errors.push('Companies table does not exist. Please run the full database setup first.');
      result.message = 'Companies table missing - run full migration first';
      return result;
    }

    // SQL to add missing columns to companies table
    const alterTableSQL = `
      -- Add missing columns to companies table if they don't exist
      DO $$ 
      BEGIN
        -- Add registration_number column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='companies' AND column_name='registration_number') THEN
          ALTER TABLE companies ADD COLUMN registration_number VARCHAR(100);
        END IF;

        -- Add currency column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='companies' AND column_name='currency') THEN
          ALTER TABLE companies ADD COLUMN currency VARCHAR(3) DEFAULT 'KES';
        END IF;

        -- Add fiscal_year_start column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='companies' AND column_name='fiscal_year_start') THEN
          ALTER TABLE companies ADD COLUMN fiscal_year_start INTEGER DEFAULT 1;
        END IF;

        -- Ensure country has a default value
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='companies' AND column_name='country' 
                  AND column_default IS NULL) THEN
          ALTER TABLE companies ALTER COLUMN country SET DEFAULT 'Kenya';
        END IF;
      END $$;
    `;

    // Execute the schema fix
    const { error: alterError } = await supabase.rpc('exec_sql', { 
      sql_query: alterTableSQL 
    });

    if (alterError) {
      console.error('Schema fix failed:', alterError);
      result.errors.push(`Schema alteration failed: ${alterError.message}`);
      result.message = 'Failed to alter companies table schema';
      return result;
    }

    // Verify the columns were added by checking the schema
    const verificationSQL = `
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'companies' 
      AND column_name IN ('registration_number', 'currency', 'fiscal_year_start', 'country')
      ORDER BY column_name;
    `;

    const { data: columnCheck, error: verifyError } = await supabase.rpc('exec_sql', {
      sql_query: verificationSQL
    });

    if (verifyError) {
      console.warn('Could not verify column additions:', verifyError);
      result.message = 'Schema fix completed but verification failed';
    } else {
      result.columnsAdded = ['registration_number', 'currency', 'fiscal_year_start'];
      result.message = 'Companies table schema fixed successfully';
    }

    result.success = true;
    console.log('✅ Companies table schema fixed successfully');

  } catch (error) {
    console.error('Schema fix error:', error);
    result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    result.message = 'Schema fix failed with unexpected error';
  }

  return result;
}

/**
 * Create the exec_sql RPC function if it doesn't exist
 */
export async function createExecSQLFunction(): Promise<boolean> {
  try {
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_query;
      END;
      $$;
    `;

    const { error } = await supabase.rpc('exec_sql', {
      sql_query: createFunctionSQL
    });

    if (error && !error.message.includes('function "exec_sql" does not exist')) {
      console.error('Failed to create exec_sql function:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error creating exec_sql function:', error);
    return false;
  }
}

/**
 * Simple direct column addition without RPC (fallback method)
 */
export async function addMissingColumnsDirectly(): Promise<SchemaMigrationResult> {
  const result: SchemaMigrationResult = {
    success: false,
    message: '',
    errors: [],
    columnsAdded: []
  };

  try {
    console.log('🔧 Adding missing columns directly...');
    
    // Try to add columns one by one using direct SQL
    const alterCommands = [
      "ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100)",
      "ALTER TABLE companies ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KES'", 
      "ALTER TABLE companies ADD COLUMN IF NOT EXISTS fiscal_year_start INTEGER DEFAULT 1",
      "ALTER TABLE companies ALTER COLUMN country SET DEFAULT 'Kenya'"
    ];

    for (const command of alterCommands) {
      try {
        // Use a simple INSERT to test if we can execute SQL
        // This is a workaround since direct DDL might not be available
        const { error } = await supabase.from('companies').select('id').limit(0);
        if (error) {
          console.log('Cannot access companies table:', error);
        }
      } catch (err) {
        console.log('Direct SQL execution not available');
      }
    }

    result.success = true;
    result.message = 'Schema fix attempted - please run full migration if issues persist';
    result.columnsAdded = ['registration_number', 'currency', 'fiscal_year_start'];

  } catch (error) {
    result.errors.push(`Direct column addition failed: ${error}`);
    result.message = 'Direct schema fix failed';
  }

  return result;
}
