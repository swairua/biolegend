import { supabase } from '@/integrations/supabase/client';

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

export interface CompaniesTableAudit {
  exists: boolean;
  columns: ColumnInfo[];
  missingColumns: string[];
  expectedColumns: string[];
  hasAllRequiredColumns: boolean;
}

// Expected columns based on schema
const EXPECTED_COMPANIES_COLUMNS = [
  'id',
  'name', 
  'registration_number',
  'tax_number',
  'email',
  'phone',
  'address', 
  'city',
  'state',
  'postal_code',
  'country',
  'logo_url',
  'currency',
  'fiscal_year_start',
  'created_at',
  'updated_at'
];

/**
 * Audit the companies table structure
 */
export async function auditCompaniesTable(): Promise<CompaniesTableAudit> {
  console.log('🔍 Auditing companies table structure...');
  
  try {
    // Check if table exists and get column information
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'companies')
      .order('ordinal_position');

    if (error) {
      console.error('Error querying table schema:', error);
      // Try alternative approach - direct table access
      const { error: accessError } = await supabase
        .from('companies')
        .select('id')
        .limit(1);
      
      if (accessError) {
        return {
          exists: false,
          columns: [],
          missingColumns: EXPECTED_COMPANIES_COLUMNS,
          expectedColumns: EXPECTED_COMPANIES_COLUMNS,
          hasAllRequiredColumns: false
        };
      }
    }

    const columns = data || [];
    const existingColumnNames = columns.map(col => col.column_name);
    const missingColumns = EXPECTED_COMPANIES_COLUMNS.filter(
      col => !existingColumnNames.includes(col)
    );

    console.log('📊 Companies table audit results:');
    console.log('- Table exists:', columns.length > 0);
    console.log('- Existing columns:', existingColumnNames);
    console.log('- Missing columns:', missingColumns);

    return {
      exists: columns.length > 0,
      columns,
      missingColumns,
      expectedColumns: EXPECTED_COMPANIES_COLUMNS,
      hasAllRequiredColumns: missingColumns.length === 0
    };

  } catch (error) {
    console.error('Audit failed:', error);
    return {
      exists: false,
      columns: [],
      missingColumns: EXPECTED_COMPANIES_COLUMNS,
      expectedColumns: EXPECTED_COMPANIES_COLUMNS,
      hasAllRequiredColumns: false
    };
  }
}

/**
 * Fix companies table by adding missing columns
 */
export async function fixCompaniesTable(): Promise<{ success: boolean; message: string; errors: string[] }> {
  console.log('🔧 Starting companies table fix...');
  
  const audit = await auditCompaniesTable();
  
  if (!audit.exists) {
    return {
      success: false,
      message: 'Companies table does not exist. Please run full database setup.',
      errors: ['Table not found']
    };
  }

  if (audit.hasAllRequiredColumns) {
    return {
      success: true,
      message: 'Companies table already has all required columns.',
      errors: []
    };
  }

  const errors: string[] = [];
  let successCount = 0;

  // Add missing columns one by one
  for (const columnName of audit.missingColumns) {
    try {
      let alterSQL = '';
      
      switch (columnName) {
        case 'registration_number':
          alterSQL = 'ALTER TABLE companies ADD COLUMN registration_number VARCHAR(100)';
          break;
        case 'currency':
          alterSQL = "ALTER TABLE companies ADD COLUMN currency VARCHAR(3) DEFAULT 'KES'";
          break;
        case 'fiscal_year_start':
          alterSQL = 'ALTER TABLE companies ADD COLUMN fiscal_year_start INTEGER DEFAULT 1';
          break;
        case 'tax_number':
          alterSQL = 'ALTER TABLE companies ADD COLUMN tax_number VARCHAR(100)';
          break;
        case 'email':
          alterSQL = 'ALTER TABLE companies ADD COLUMN email VARCHAR(255)';
          break;
        case 'phone':
          alterSQL = 'ALTER TABLE companies ADD COLUMN phone VARCHAR(50)';
          break;
        case 'address':
          alterSQL = 'ALTER TABLE companies ADD COLUMN address TEXT';
          break;
        case 'city':
          alterSQL = 'ALTER TABLE companies ADD COLUMN city VARCHAR(100)';
          break;
        case 'state':
          alterSQL = 'ALTER TABLE companies ADD COLUMN state VARCHAR(100)';
          break;
        case 'postal_code':
          alterSQL = 'ALTER TABLE companies ADD COLUMN postal_code VARCHAR(20)';
          break;
        case 'country':
          alterSQL = "ALTER TABLE companies ADD COLUMN country VARCHAR(100) DEFAULT 'Kenya'";
          break;
        case 'logo_url':
          alterSQL = 'ALTER TABLE companies ADD COLUMN logo_url TEXT';
          break;
        default:
          console.log(`Skipping unknown column: ${columnName}`);
          continue;
      }

      console.log(`Adding column ${columnName}...`);
      
      // Try using the RPC function if available
      const { error } = await supabase.rpc('exec_sql', { sql_query: alterSQL });
      
      if (error) {
        console.error(`Failed to add ${columnName}:`, error);
        errors.push(`${columnName}: ${error.message}`);
      } else {
        console.log(`✅ Successfully added ${columnName}`);
        successCount++;
      }
      
    } catch (error) {
      console.error(`Error adding ${columnName}:`, error);
      errors.push(`${columnName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const success = successCount > 0 && errors.length === 0;
  const message = success 
    ? `Successfully added ${successCount} missing columns to companies table`
    : errors.length > 0
    ? `Partial success: ${successCount} columns added, ${errors.length} failed`
    : 'Failed to add any columns';

  return { success, message, errors };
}

/**
 * Comprehensive companies table setup - creates table if missing and adds columns
 */
export async function ensureCompaniesTableComplete(): Promise<{ success: boolean; message: string; details: string[] }> {
  console.log('🏗️ Ensuring companies table is complete...');
  
  const details: string[] = [];
  
  try {
    // First check if table exists
    const audit = await auditCompaniesTable();
    
    if (!audit.exists) {
      details.push('Companies table does not exist');
      
      // Create the full table
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS companies (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          registration_number VARCHAR(100),
          tax_number VARCHAR(100),
          email VARCHAR(255),
          phone VARCHAR(50),
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(100),
          postal_code VARCHAR(20),
          country VARCHAR(100) DEFAULT 'Kenya',
          logo_url TEXT,
          currency VARCHAR(3) DEFAULT 'KES',
          fiscal_year_start INTEGER DEFAULT 1,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql_query: createTableSQL });
      
      if (createError) {
        details.push(`Failed to create table: ${createError.message}`);
        return {
          success: false,
          message: 'Failed to create companies table',
          details
        };
      }
      
      details.push('✅ Companies table created successfully');
    } else {
      details.push(`Companies table exists with ${audit.columns.length} columns`);
      
      if (audit.missingColumns.length > 0) {
        details.push(`Missing columns: ${audit.missingColumns.join(', ')}`);
        
        const fixResult = await fixCompaniesTable();
        details.push(fixResult.message);
        details.push(...fixResult.errors.map(err => `❌ ${err}`));
        
        if (!fixResult.success) {
          return {
            success: false,
            message: 'Failed to add missing columns',
            details
          };
        }
      }
    }

    // Final verification
    const finalAudit = await auditCompaniesTable();
    details.push(`Final audit: ${finalAudit.columns.length} columns present`);
    
    if (finalAudit.missingColumns.length > 0) {
      details.push(`Still missing: ${finalAudit.missingColumns.join(', ')}`);
    }

    return {
      success: finalAudit.hasAllRequiredColumns,
      message: finalAudit.hasAllRequiredColumns 
        ? 'Companies table is now complete' 
        : 'Companies table setup partially completed',
      details
    };

  } catch (error) {
    details.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      message: 'Companies table setup failed',
      details
    };
  }
}

/**
 * Test companies table functionality
 */
export async function testCompaniesTable(): Promise<{ success: boolean; message: string; errors: string[] }> {
  console.log('🧪 Testing companies table functionality...');
  
  const errors: string[] = [];
  
  try {
    // Test 1: Can we read from companies table?
    const { data: companies, error: readError } = await supabase
      .from('companies')
      .select('*')
      .limit(5);
    
    if (readError) {
      errors.push(`Read test failed: ${readError.message}`);
    } else {
      console.log(`✅ Read test passed - found ${companies?.length || 0} companies`);
    }

    // Test 2: Can we insert a test company (with rollback)?
    const testCompany = {
      name: 'TEST_COMPANY_DELETE_ME',
      currency: 'KES',
      fiscal_year_start: 1,
      country: 'Kenya'
    };

    const { data: insertedCompany, error: insertError } = await supabase
      .from('companies')
      .insert([testCompany])
      .select()
      .single();

    if (insertError) {
      errors.push(`Insert test failed: ${insertError.message}`);
    } else {
      console.log('✅ Insert test passed');
      
      // Clean up - delete the test company
      const { error: deleteError } = await supabase
        .from('companies')
        .delete()
        .eq('id', insertedCompany.id);
      
      if (deleteError) {
        errors.push(`Cleanup failed: ${deleteError.message}`);
      } else {
        console.log('✅ Cleanup completed');
      }
    }

    // Test 3: Can we update with fiscal_year_start?
    if (companies && companies.length > 0) {
      const firstCompany = companies[0];
      const { error: updateError } = await supabase
        .from('companies')
        .update({ fiscal_year_start: 1 })
        .eq('id', firstCompany.id);
      
      if (updateError) {
        errors.push(`Update test failed: ${updateError.message}`);
      } else {
        console.log('✅ Update test with fiscal_year_start passed');
      }
    }

    return {
      success: errors.length === 0,
      message: errors.length === 0 
        ? 'All companies table tests passed!' 
        : `${errors.length} tests failed`,
      errors
    };

  } catch (error) {
    errors.push(`Test execution failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      message: 'Companies table testing failed',
      errors
    };
  }
}

// Manual SQL for copy-paste if RPC doesn't work
export const MANUAL_COMPANIES_FIX_SQL = `
-- Manual SQL to fix companies table structure
-- Copy and paste this into Supabase SQL Editor if automatic fix fails

-- Add missing columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KES';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fiscal_year_start INTEGER DEFAULT 1;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_number VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Kenya';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Ensure defaults are set
ALTER TABLE companies ALTER COLUMN country SET DEFAULT 'Kenya';
ALTER TABLE companies ALTER COLUMN currency SET DEFAULT 'KES';
ALTER TABLE companies ALTER COLUMN fiscal_year_start SET DEFAULT 1;

-- Add updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON companies 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();
`;
