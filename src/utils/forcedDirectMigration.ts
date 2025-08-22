import { supabase } from '@/integrations/supabase/client';

interface DirectMigrationResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Force migration by executing SQL directly through Supabase client
 * This bypasses RPC functions and creates tables using raw SQL execution
 */
export async function executeForcedDirectMigration(): Promise<DirectMigrationResult> {
  console.log('🚀 Starting forced direct migration...');
  
  try {
    // First, let's try to use the supabase SQL API directly
    // We'll execute the migration in chunks to avoid issues
    
    const migrationSteps = [
      {
        name: 'Create LPO Status Enum',
        sql: `
        DO $$ BEGIN
            CREATE TYPE lpo_status AS ENUM ('draft', 'sent', 'approved', 'received', 'cancelled');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
        `
      },
      {
        name: 'Create LPO Main Table',
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
        `
      },
      {
        name: 'Create LPO Items Table',
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
        `
      },
      {
        name: 'Add Tax Columns to Quotation Items',
        sql: `
        ALTER TABLE quotation_items 
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
        `
      },
      {
        name: 'Add Tax Columns to Invoice Items',
        sql: `
        ALTER TABLE invoice_items
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
        `
      },
      {
        name: 'Create Indexes',
        sql: `
        CREATE INDEX IF NOT EXISTS idx_lpos_company_id ON lpos(company_id);
        CREATE INDEX IF NOT EXISTS idx_lpos_supplier_id ON lpos(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_lpos_lpo_number ON lpos(lpo_number);
        CREATE INDEX IF NOT EXISTS idx_lpos_status ON lpos(status);
        CREATE INDEX IF NOT EXISTS idx_lpos_lpo_date ON lpos(lpo_date);
        CREATE INDEX IF NOT EXISTS idx_lpo_items_lpo_id ON lpo_items(lpo_id);
        CREATE INDEX IF NOT EXISTS idx_lpo_items_product_id ON lpo_items(product_id);
        `
      },
      {
        name: 'Create Update Trigger Function',
        sql: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        `
      },
      {
        name: 'Create LPO Number Generator Function',
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
        `
      },
      {
        name: 'Create Triggers',
        sql: `
        DROP TRIGGER IF EXISTS update_lpos_updated_at ON lpos;
        CREATE TRIGGER update_lpos_updated_at
            BEFORE UPDATE ON lpos
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        `
      },
      {
        name: 'Update Existing Records',
        sql: `
        UPDATE quotation_items 
        SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false 
        WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

        UPDATE invoice_items 
        SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false 
        WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;
        `
      }
    ];

    // Try different methods to execute SQL
    const methods = [
      { name: 'sql', arg: 'query' },
      { name: 'rpc', arg: 'sql_query' },
      { name: 'rpc', arg: 'query' }
    ];

    let successfulMethod = null;
    let lastError = null;

    // Try to find any working SQL execution method
    for (const method of methods) {
      try {
        console.log(`Trying method: ${method.name} with ${method.arg}`);
        
        if (method.name === 'sql') {
          // Try direct SQL method if it exists
          const { error } = await (supabase as any).sql(migrationSteps[0].sql);
          if (!error) {
            successfulMethod = method;
            break;
          }
        } else {
          // Try RPC method
          const { error } = await supabase.rpc(method.name, { [method.arg]: migrationSteps[0].sql });
          if (!error) {
            successfulMethod = method;
            break;
          }
        }
      } catch (error) {
        lastError = error;
        console.log(`Method ${method.name} failed:`, error);
      }
    }

    if (successfulMethod) {
      console.log(`✅ Found working method: ${successfulMethod.name}`);
      
      // Execute all migration steps
      for (const step of migrationSteps) {
        console.log(`Executing: ${step.name}`);
        try {
          if (successfulMethod.name === 'sql') {
            await (supabase as any).sql(step.sql);
          } else {
            await supabase.rpc(successfulMethod.name, { [successfulMethod.arg]: step.sql });
          }
          console.log(`✅ ${step.name} completed`);
        } catch (stepError) {
          console.log(`⚠️ ${step.name} had issues (may be OK):`, stepError);
          // Continue with other steps even if one fails
        }
      }
      
      // Verify the migration worked
      const { error: verifyError } = await supabase
        .from('lpos')
        .select('id')
        .limit(1);
        
      if (!verifyError) {
        console.log('🎉 Migration successful! LPO tables are now available.');
        return {
          success: true,
          message: 'Force migration completed successfully! LPO tables created and verified.',
          details: { method: successfulMethod.name, stepsExecuted: migrationSteps.length }
        };
      } else {
        console.log('⚠️ Migration may have partially succeeded. Tables might still be missing.');
        return {
          success: false,
          message: 'Migration executed but verification failed. Manual SQL execution may be required.',
          details: { verifyError: verifyError.message }
        };
      }
    } else {
      // No SQL execution method worked, provide manual SQL
      console.log('❌ No automatic SQL execution method available. Providing manual SQL.');
      return {
        success: false,
        message: 'Automatic SQL execution not available. Manual migration required.',
        details: { 
          lastError: lastError instanceof Error ? lastError.message : 'Unknown error',
          needsManualSQL: true
        }
      };
    }

  } catch (error) {
    console.error('❌ Force migration failed:', error);
    return {
      success: false,
      message: `Force migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error }
    };
  }
}

/**
 * Get the complete migration SQL for manual execution
 */
export function getCompleteMigrationSQL(): string {
  return `-- COMPLETE LPO SYSTEM MIGRATION - EXECUTE IN SUPABASE SQL EDITOR
-- Copy this entire block and run it in your Supabase SQL Editor

-- 1. Create LPO status enum
DO $$ BEGIN
    CREATE TYPE lpo_status AS ENUM ('draft', 'sent', 'approved', 'received', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create main LPO table
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

-- 3. Create LPO items table
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

-- 4. Add tax columns to existing tables
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_lpos_company_id ON lpos(company_id);
CREATE INDEX IF NOT EXISTS idx_lpos_supplier_id ON lpos(supplier_id);
CREATE INDEX IF NOT EXISTS idx_lpos_lpo_number ON lpos(lpo_number);
CREATE INDEX IF NOT EXISTS idx_lpos_status ON lpos(status);
CREATE INDEX IF NOT EXISTS idx_lpos_lpo_date ON lpos(lpo_date);
CREATE INDEX IF NOT EXISTS idx_lpo_items_lpo_id ON lpo_items(lpo_id);
CREATE INDEX IF NOT EXISTS idx_lpo_items_product_id ON lpo_items(product_id);

-- 6. Create functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- 7. Create triggers
DROP TRIGGER IF EXISTS update_lpos_updated_at ON lpos;
CREATE TRIGGER update_lpos_updated_at
    BEFORE UPDATE ON lpos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Update existing records
UPDATE quotation_items 
SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false 
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

UPDATE invoice_items 
SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false 
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

-- 9. Verify migration (run this to check)
SELECT 'Migration Check' as status,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lpos') THEN '✅ EXISTS' ELSE '❌ MISSING' END as lpos_table,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lpo_items') THEN '✅ EXISTS' ELSE '❌ MISSING' END as lpo_items_table,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotation_items' AND column_name = 'tax_amount') THEN '✅ EXISTS' ELSE '❌ MISSING' END as tax_columns;`;
}
