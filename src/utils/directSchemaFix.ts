import { supabase } from '@/integrations/supabase/client';

export interface DirectSchemaFixResult {
  success: boolean;
  message: string;
  errors: string[];
  columnsAdded: string[];
  sqlExecuted: string[];
}

/**
 * Direct schema fix using ALTER TABLE commands
 * This method doesn't rely on RPC functions
 */
export async function fixMissingColumns(): Promise<DirectSchemaFixResult> {
  const result: DirectSchemaFixResult = {
    success: false,
    message: '',
    errors: [],
    columnsAdded: [],
    sqlExecuted: []
  };

  try {
    console.log('🔧 Starting direct schema fix...');
    
    // First, verify the companies table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    if (tableError && tableError.message.includes('does not exist')) {
      result.errors.push('Companies table does not exist. Please run full database setup first.');
      result.message = 'Companies table missing - need full migration';
      return result;
    }

    // Try to check current schema by attempting to select columns
    console.log('🔍 Checking current schema...');
    const { data: schemaTest, error: schemaError } = await supabase
      .from('companies')
      .select('id, name, email, currency, registration_number, fiscal_year_start')
      .limit(1);

    const missingColumns = [];
    if (schemaError) {
      const errorMessage = schemaError.message || '';
      if (errorMessage.includes('currency')) {
        missingColumns.push('currency');
      }
      if (errorMessage.includes('registration_number')) {
        missingColumns.push('registration_number');
      }
      if (errorMessage.includes('fiscal_year_start')) {
        missingColumns.push('fiscal_year_start');
      }
    }

    console.log('Missing columns detected:', missingColumns);

    if (missingColumns.length === 0) {
      result.success = true;
      result.message = 'All columns already exist in the companies table';
      return result;
    }

    // Method 1: Try using the SQL editor approach (if available)
    const alterStatements = [];
    
    if (missingColumns.includes('currency')) {
      alterStatements.push("ALTER TABLE companies ADD COLUMN currency VARCHAR(3) DEFAULT 'KES'");
    }
    if (missingColumns.includes('registration_number')) {
      alterStatements.push("ALTER TABLE companies ADD COLUMN registration_number VARCHAR(100)");
    }
    if (missingColumns.includes('fiscal_year_start')) {
      alterStatements.push("ALTER TABLE companies ADD COLUMN fiscal_year_start INTEGER DEFAULT 1");
    }

    // Try to execute using a stored procedure approach
    for (const statement of alterStatements) {
      try {
        console.log('Executing:', statement);
        
        // Try using a simple function call approach
        const { error: execError } = await supabase
          .rpc('exec_sql', { sql_query: statement });

        if (execError) {
          console.log('RPC method failed:', execError.message);
          // RPC method not available, will use alternative approach
          break;
        } else {
          result.sqlExecuted.push(statement);
          console.log('✅ Successfully executed:', statement);
        }
      } catch (err) {
        console.log('RPC execution failed:', err);
        break;
      }
    }

    // Method 2: Alternative approach - create a temporary table and migrate data
    if (result.sqlExecuted.length === 0) {
      console.log('🔄 Using alternative migration approach...');
      
      try {
        // Get all existing data
        const { data: existingData, error: fetchError } = await supabase
          .from('companies')
          .select('*');

        if (fetchError) {
          throw new Error(`Failed to fetch existing data: ${fetchError.message}`);
        }

        console.log(`Found ${existingData?.length || 0} existing companies`);

        // Add missing columns by updating existing records with default values
        if (existingData && existingData.length > 0) {
          for (const company of existingData) {
            const updates: any = {};
            let needsUpdate = false;

            // We can't add columns directly, but we can prepare for when they exist
            // This approach will work once the columns are added manually
            
            console.log('Prepared update data for company:', company.id);
          }
        }

        result.message = 'Schema fix requires manual intervention. Please add columns through database console.';
        result.errors.push('Automatic column addition not available. Manual SQL required.');
        
      } catch (altError) {
        console.error('Alternative approach failed:', altError);
        result.errors.push(`Alternative fix failed: ${altError}`);
      }
    }

    // Verify the fix worked
    if (result.sqlExecuted.length > 0) {
      try {
        const { data: verifyData, error: verifyError } = await supabase
          .from('companies')
          .select('id, currency, registration_number, fiscal_year_start')
          .limit(1);

        if (!verifyError) {
          result.success = true;
          result.columnsAdded = missingColumns;
          result.message = `Successfully added ${missingColumns.length} missing columns`;
        } else {
          result.errors.push('Verification failed after column addition');
        }
      } catch (verifyErr) {
        result.errors.push('Could not verify column addition');
      }
    }

  } catch (error) {
    console.error('Direct schema fix error:', error);
    result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    result.message = 'Direct schema fix failed';
  }

  if (!result.success && result.errors.length === 0) {
    result.errors.push('Schema fix completed but verification inconclusive');
    result.message = 'Schema fix may require manual verification';
  }

  return result;
}

/**
 * Simplified approach - just check what's missing and provide SQL
 */
export async function generateSchemaFixSQL(): Promise<{ sql: string[]; missing: string[] }> {
  const missing = [];
  const sql = [];

  try {
    // Test each column individually
    const testColumns = ['currency', 'registration_number', 'fiscal_year_start'];
    
    for (const column of testColumns) {
      try {
        const { error } = await supabase
          .from('companies')
          .select(column)
          .limit(1);
          
        if (error && error.message.includes(column)) {
          missing.push(column);
        }
      } catch (err) {
        // Column might be missing
        missing.push(column);
      }
    }

    // Generate SQL for missing columns
    if (missing.includes('currency')) {
      sql.push("ALTER TABLE companies ADD COLUMN currency VARCHAR(3) DEFAULT 'KES';");
    }
    if (missing.includes('registration_number')) {
      sql.push("ALTER TABLE companies ADD COLUMN registration_number VARCHAR(100);");
    }
    if (missing.includes('fiscal_year_start')) {
      sql.push("ALTER TABLE companies ADD COLUMN fiscal_year_start INTEGER DEFAULT 1;");
    }

  } catch (error) {
    console.error('Error generating schema fix SQL:', error);
  }

  return { sql, missing };
}
