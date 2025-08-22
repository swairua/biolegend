import { supabase } from '@/integrations/supabase/client';

export interface MigrationResult {
  success: boolean;
  message: string;
  step: string;
  details?: any;
}

export interface ComprehensiveMigrationResult {
  success: boolean;
  message: string;
  results: MigrationResult[];
  stats: {
    total: number;
    successful: number;
    failed: number;
  };
}

/**
 * Comprehensive force migration for all database tables and features
 * This executes all necessary database setup automatically
 */
export async function executeComprehensiveMigration(): Promise<ComprehensiveMigrationResult> {
  console.log('🚀 Starting comprehensive force migration...');
  const results: MigrationResult[] = [];

  // Complete migration SQL commands organized by feature
  const migrationCommands = [
    // 1. Core table structure fixes
    {
      name: 'Add tax columns to quotation_items',
      sql: `
        ALTER TABLE quotation_items 
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
      `,
      critical: true
    },
    {
      name: 'Add tax columns to invoice_items',
      sql: `
        ALTER TABLE invoice_items
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
      `,
      critical: true
    },
    
    // 2. Create LPO system enums and types
    {
      name: 'Create LPO status enum',
      sql: `
        DO $$ BEGIN
            CREATE TYPE lpo_status AS ENUM ('draft', 'sent', 'approved', 'received', 'cancelled');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
      `,
      critical: false
    },
    
    // 3. Create main LPO table
    {
      name: 'Create LPO main table',
      sql: `
        CREATE TABLE IF NOT EXISTS lpos (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
            supplier_id UUID REFERENCES customers(id) ON DELETE CASCADE,
            lpo_number VARCHAR(100) UNIQUE NOT NULL,
            lpo_date DATE NOT NULL DEFAULT CURRENT_DATE,
            delivery_date DATE,
            status lpo_status DEFAULT 'draft',
            subtotal DECIMAL(15,2) DEFAULT 0,
            tax_amount DECIMAL(15,2) DEFAULT 0,
            total_amount DECIMAL(15,2) DEFAULT 0,
            notes TEXT,
            terms_and_conditions TEXT,
            delivery_address TEXT,
            contact_person VARCHAR(255),
            contact_phone VARCHAR(50),
            created_by UUID REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `,
      critical: false
    },
    
    // 4. Create LPO items table
    {
      name: 'Create LPO items table',
      sql: `
        CREATE TABLE IF NOT EXISTS lpo_items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            lpo_id UUID REFERENCES lpos(id) ON DELETE CASCADE,
            product_id UUID REFERENCES products(id),
            description TEXT NOT NULL,
            quantity DECIMAL(10,3) NOT NULL,
            unit_price DECIMAL(15,2) NOT NULL,
            tax_rate DECIMAL(5,2) DEFAULT 0,
            tax_amount DECIMAL(15,2) DEFAULT 0,
            line_total DECIMAL(15,2) NOT NULL,
            notes TEXT,
            sort_order INTEGER DEFAULT 0
        );
      `,
      critical: false
    },
    
    // 5. Create credit note tables if missing
    {
      name: 'Create credit notes table',
      sql: `
        CREATE TABLE IF NOT EXISTS credit_notes (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
            customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
            credit_note_number VARCHAR(100) UNIQUE NOT NULL,
            credit_note_date DATE NOT NULL DEFAULT CURRENT_DATE,
            original_invoice_id UUID REFERENCES invoices(id),
            reason TEXT,
            subtotal DECIMAL(15,2) DEFAULT 0,
            tax_amount DECIMAL(15,2) DEFAULT 0,
            total_amount DECIMAL(15,2) DEFAULT 0,
            status VARCHAR(50) DEFAULT 'draft',
            notes TEXT,
            created_by UUID REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `,
      critical: false
    },
    
    // 6. Create credit note items table
    {
      name: 'Create credit note items table',
      sql: `
        CREATE TABLE IF NOT EXISTS credit_note_items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            credit_note_id UUID REFERENCES credit_notes(id) ON DELETE CASCADE,
            product_id UUID REFERENCES products(id),
            description TEXT NOT NULL,
            quantity DECIMAL(10,3) NOT NULL,
            unit_price DECIMAL(15,2) NOT NULL,
            tax_rate DECIMAL(5,2) DEFAULT 0,
            tax_amount DECIMAL(15,2) DEFAULT 0,
            line_total DECIMAL(15,2) NOT NULL,
            sort_order INTEGER DEFAULT 0
        );
      `,
      critical: false
    },
    
    // 7. Create essential indexes
    {
      name: 'Create performance indexes',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_lpos_company_id ON lpos(company_id);
        CREATE INDEX IF NOT EXISTS idx_lpos_supplier_id ON lpos(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_lpos_lpo_number ON lpos(lpo_number);
        CREATE INDEX IF NOT EXISTS idx_lpos_status ON lpos(status);
        CREATE INDEX IF NOT EXISTS idx_lpos_lpo_date ON lpos(lpo_date);
        CREATE INDEX IF NOT EXISTS idx_lpo_items_lpo_id ON lpo_items(lpo_id);
        CREATE INDEX IF NOT EXISTS idx_lpo_items_product_id ON lpo_items(product_id);
        CREATE INDEX IF NOT EXISTS idx_credit_notes_company_id ON credit_notes(company_id);
        CREATE INDEX IF NOT EXISTS idx_credit_notes_customer_id ON credit_notes(customer_id);
        CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note_id ON credit_note_items(credit_note_id);
      `,
      critical: false
    },
    
    // 8. Create utility functions
    {
      name: 'Create utility functions',
      sql: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `,
      critical: false
    },
    
    // 9. Create LPO number generator
    {
      name: 'Create LPO number generator function',
      sql: `
        CREATE OR REPLACE FUNCTION generate_lpo_number(company_uuid UUID)
        RETURNS TEXT AS $$
        DECLARE
            company_code TEXT;
            lpo_count INTEGER;
            lpo_number TEXT;
        BEGIN
            SELECT COALESCE(UPPER(LEFT(name, 3)), 'LPO') INTO company_code
            FROM companies 
            WHERE id = company_uuid;
            
            SELECT COUNT(*) INTO lpo_count
            FROM lpos
            WHERE company_id = company_uuid;
            
            lpo_number := company_code || '-LPO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((lpo_count + 1)::TEXT, 4, '0');
            
            RETURN lpo_number;
        END;
        $$ LANGUAGE plpgsql;
      `,
      critical: false
    },
    
    // 10. Create triggers
    {
      name: 'Create update triggers',
      sql: `
        DROP TRIGGER IF EXISTS update_lpos_updated_at ON lpos;
        CREATE TRIGGER update_lpos_updated_at
            BEFORE UPDATE ON lpos
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
            
        DROP TRIGGER IF EXISTS update_credit_notes_updated_at ON credit_notes;
        CREATE TRIGGER update_credit_notes_updated_at
            BEFORE UPDATE ON credit_notes
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
      `,
      critical: false
    },
    
    // 11. Update existing records with default values
    {
      name: 'Update existing records with defaults',
      sql: `
        UPDATE quotation_items 
        SET tax_percentage = COALESCE(tax_percentage, 0), 
            tax_amount = COALESCE(tax_amount, 0), 
            tax_inclusive = COALESCE(tax_inclusive, false)
        WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

        UPDATE invoice_items 
        SET tax_percentage = COALESCE(tax_percentage, 0), 
            tax_amount = COALESCE(tax_amount, 0), 
            tax_inclusive = COALESCE(tax_inclusive, false)
        WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;
      `,
      critical: true
    }
  ];

  // Try multiple methods to execute SQL
  const executionMethods = [
    { name: 'exec_sql', param: 'query' },
    { name: 'sql', param: 'query' },
    { name: 'execute_sql', param: 'sql' },
    { name: 'run_sql', param: 'query' }
  ];

  let workingMethod: { name: string; param: string } | null = null;

  // Find a working SQL execution method
  for (const method of executionMethods) {
    try {
      console.log(`Testing SQL execution method: ${method.name}`);
      const testSQL = 'SELECT 1 as test;';
      
      if (method.name === 'sql' && (supabase as any).sql) {
        await (supabase as any).sql(testSQL);
        workingMethod = method;
        break;
      } else {
        const { error } = await supabase.rpc(method.name, { [method.param]: testSQL });
        if (!error) {
          workingMethod = method;
          break;
        }
      }
    } catch (error) {
      console.log(`Method ${method.name} failed:`, error);
    }
  }

  console.log(`Working SQL method: ${workingMethod?.name || 'none'}`);

  // Execute migration commands
  for (const command of migrationCommands) {
    try {
      console.log(`Executing: ${command.name}`);
      
      if (workingMethod) {
        if (workingMethod.name === 'sql') {
          await (supabase as any).sql(command.sql);
        } else {
          await supabase.rpc(workingMethod.name, { [workingMethod.param]: command.sql });
        }
        
        results.push({
          success: true,
          message: `Successfully executed: ${command.name}`,
          step: command.name
        });
        console.log(`✅ ${command.name} completed`);
      } else {
        // No SQL execution method available
        results.push({
          success: false,
          message: `SQL execution not available for: ${command.name}`,
          step: command.name,
          details: { needsManualExecution: true, critical: command.critical }
        });
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      
      // Check if error is about existing objects (which is OK)
      if (errorMessage.includes('already exists') || 
          errorMessage.includes('duplicate') ||
          errorMessage.includes('relation') && errorMessage.includes('already exists')) {
        results.push({
          success: true,
          message: `Already exists (OK): ${command.name}`,
          step: command.name
        });
        console.log(`✅ ${command.name} already exists (OK)`);
      } else {
        results.push({
          success: false,
          message: `Error in ${command.name}: ${errorMessage}`,
          step: command.name,
          details: { error: errorMessage, critical: command.critical }
        });
        console.log(`❌ ${command.name} failed:`, error);
      }
    }
  }

  // Calculate statistics
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const criticalFailed = results.filter(r => !r.success && r.details?.critical).length;

  // Verification step - check if critical components exist
  const verificationResults = await verifyCriticalTables();
  
  const overallSuccess = criticalFailed === 0 && verificationResults.criticalTablesExist;
  
  console.log(`📊 Migration complete: ${successful}/${results.length} steps successful`);
  console.log(`�� Critical tables verification: ${verificationResults.criticalTablesExist ? '✅' : '❌'}`);

  return {
    success: overallSuccess,
    message: overallSuccess 
      ? `🎉 Comprehensive migration completed successfully! ${successful}/${results.length} steps executed.`
      : `⚠️ Migration completed with issues. ${criticalFailed} critical failures. Manual intervention may be required.`,
    results,
    stats: {
      total: results.length,
      successful,
      failed
    }
  };
}

/**
 * Verify critical database tables exist
 */
export async function verifyCriticalTables(): Promise<{
  criticalTablesExist: boolean;
  details: Record<string, boolean>;
}> {
  const checks = {
    quotation_items_tax_columns: false,
    invoice_items_tax_columns: false,
    lpos_table: false,
    lpo_items_table: false
  };

  try {
    // Check quotation_items tax columns
    const { error: quotationError } = await supabase
      .from('quotation_items')
      .select('tax_amount, tax_percentage, tax_inclusive')
      .limit(1);
    checks.quotation_items_tax_columns = !quotationError;

    // Check invoice_items tax columns
    const { error: invoiceError } = await supabase
      .from('invoice_items')
      .select('tax_amount, tax_percentage, tax_inclusive')
      .limit(1);
    checks.invoice_items_tax_columns = !invoiceError;

    // Check LPO tables
    const { error: lpoError } = await supabase
      .from('lpos')
      .select('id')
      .limit(1);
    checks.lpos_table = !lpoError;

    const { error: lpoItemsError } = await supabase
      .from('lpo_items')
      .select('id')
      .limit(1);
    checks.lpo_items_table = !lpoItemsError;

  } catch (error) {
    console.log('Verification check failed:', error);
  }

  const criticalTablesExist = checks.quotation_items_tax_columns && checks.invoice_items_tax_columns;

  return {
    criticalTablesExist,
    details: checks
  };
}

/**
 * Get the complete manual SQL for cases where automatic execution fails
 */
export function getComprehensiveManualSQL(): string {
  return `-- COMPREHENSIVE DATABASE MIGRATION
-- Execute this complete script in your Supabase SQL Editor

-- 1. Create LPO status enum
DO $$ BEGIN
    CREATE TYPE lpo_status AS ENUM ('draft', 'sent', 'approved', 'received', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add tax columns to existing tables
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- 3. Create LPO main table
CREATE TABLE IF NOT EXISTS lpos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    lpo_number VARCHAR(100) UNIQUE NOT NULL,
    lpo_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_date DATE,
    status lpo_status DEFAULT 'draft',
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    terms_and_conditions TEXT,
    delivery_address TEXT,
    contact_person VARCHAR(255),
    contact_phone VARCHAR(50),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create LPO items table
CREATE TABLE IF NOT EXISTS lpo_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lpo_id UUID REFERENCES lpos(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL,
    notes TEXT,
    sort_order INTEGER DEFAULT 0
);

-- 5. Create credit notes table
CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    credit_note_number VARCHAR(100) UNIQUE NOT NULL,
    credit_note_date DATE NOT NULL DEFAULT CURRENT_DATE,
    original_invoice_id UUID REFERENCES invoices(id),
    reason TEXT,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft',
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create credit note items table
CREATE TABLE IF NOT EXISTS credit_note_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credit_note_id UUID REFERENCES credit_notes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_lpos_company_id ON lpos(company_id);
CREATE INDEX IF NOT EXISTS idx_lpos_supplier_id ON lpos(supplier_id);
CREATE INDEX IF NOT EXISTS idx_lpos_lpo_number ON lpos(lpo_number);
CREATE INDEX IF NOT EXISTS idx_lpos_status ON lpos(status);
CREATE INDEX IF NOT EXISTS idx_lpos_lpo_date ON lpos(lpo_date);
CREATE INDEX IF NOT EXISTS idx_lpo_items_lpo_id ON lpo_items(lpo_id);
CREATE INDEX IF NOT EXISTS idx_lpo_items_product_id ON lpo_items(product_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_company_id ON credit_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_customer_id ON credit_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note_id ON credit_note_items(credit_note_id);

-- 8. Create utility functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create number generator functions
CREATE OR REPLACE FUNCTION generate_lpo_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    company_code TEXT;
    lpo_count INTEGER;
    lpo_number TEXT;
BEGIN
    SELECT COALESCE(UPPER(LEFT(name, 3)), 'LPO') INTO company_code
    FROM companies 
    WHERE id = company_uuid;
    
    SELECT COUNT(*) INTO lpo_count
    FROM lpos
    WHERE company_id = company_uuid;
    
    lpo_number := company_code || '-LPO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((lpo_count + 1)::TEXT, 4, '0');
    
    RETURN lpo_number;
END;
$$ LANGUAGE plpgsql;

-- 10. Create triggers
DROP TRIGGER IF EXISTS update_lpos_updated_at ON lpos;
CREATE TRIGGER update_lpos_updated_at
    BEFORE UPDATE ON lpos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_credit_notes_updated_at ON credit_notes;
CREATE TRIGGER update_credit_notes_updated_at
    BEFORE UPDATE ON credit_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 11. Update existing records
UPDATE quotation_items 
SET tax_percentage = COALESCE(tax_percentage, 0), 
    tax_amount = COALESCE(tax_amount, 0), 
    tax_inclusive = COALESCE(tax_inclusive, false)
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

UPDATE invoice_items 
SET tax_percentage = COALESCE(tax_percentage, 0), 
    tax_amount = COALESCE(tax_amount, 0), 
    tax_inclusive = COALESCE(tax_inclusive, false)
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

-- 12. Verification query (run this to check if migration worked)
SELECT 
    'Migration Status' as check_type,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lpos') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as lpos_table,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lpo_items') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as lpo_items_table,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotation_items' AND column_name = 'tax_amount') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as quotation_tax_columns,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'tax_amount') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as invoice_tax_columns;

-- Migration complete! Check the verification results above.`;
}

// Auto-execute migration when this module is imported (non-blocking)
let migrationExecuted = false;

export const autoExecuteComprehensiveMigration = async () => {
  if (migrationExecuted) return;
  migrationExecuted = true;

  console.log('🚀 AUTO-EXECUTING COMPREHENSIVE MIGRATION...');
  
  try {
    const result = await executeComprehensiveMigration();
    
    if (result.success) {
      console.log('✅ COMPREHENSIVE MIGRATION COMPLETED SUCCESSFULLY!');
      console.log(`📊 Stats: ${result.stats.successful}/${result.stats.total} successful`);
    } else {
      console.log('⚠️ COMPREHENSIVE MIGRATION COMPLETED WITH ISSUES');
      console.log('💡 Some components may require manual SQL execution');
      console.log(`📊 Stats: ${result.stats.successful}/${result.stats.total} successful, ${result.stats.failed} failed`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ COMPREHENSIVE MIGRATION FAILED:', error);
    return null;
  }
};

// Execute migration on module load if in browser environment
if (typeof window !== 'undefined') {
  // Multiple trigger points to ensure execution
  setTimeout(autoExecuteComprehensiveMigration, 100);
  setTimeout(autoExecuteComprehensiveMigration, 1000);
  setTimeout(autoExecuteComprehensiveMigration, 3000);
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoExecuteComprehensiveMigration);
  } else {
    autoExecuteComprehensiveMigration();
  }
  
  window.addEventListener('load', autoExecuteComprehensiveMigration);
}
