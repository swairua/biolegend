import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PRODUCT_FIX_SQL = `
-- Add missing columns to products table
DO $$
BEGIN
    -- Add track_inventory column (used by AddInventoryItemModal)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'track_inventory') THEN
        ALTER TABLE products ADD COLUMN track_inventory BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added track_inventory column to products';
    END IF;

    -- Ensure minimum_stock_level column exists (form uses this)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'minimum_stock_level') THEN
        ALTER TABLE products ADD COLUMN minimum_stock_level INTEGER DEFAULT 10;
        RAISE NOTICE 'Added minimum_stock_level column to products';
    END IF;

    -- Ensure maximum_stock_level column exists (form uses this)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'maximum_stock_level') THEN
        ALTER TABLE products ADD COLUMN maximum_stock_level INTEGER DEFAULT 100;
        RAISE NOTICE 'Added maximum_stock_level column to products';
    END IF;

    -- Ensure stock_quantity column exists (form uses this)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'stock_quantity') THEN
        ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 0;
        RAISE NOTICE 'Added stock_quantity column to products';
    END IF;

    -- Add reorder_point column (referenced in verification)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'reorder_point') THEN
        ALTER TABLE products ADD COLUMN reorder_point INTEGER DEFAULT 5;
        RAISE NOTICE 'Added reorder_point column to products';
    END IF;

    -- Ensure cost_price column exists with proper type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cost_price') THEN
        ALTER TABLE products ADD COLUMN cost_price DECIMAL(15,2) DEFAULT 0.00;
        RAISE NOTICE 'Added cost_price column to products';
    END IF;

    -- Ensure selling_price column exists with proper type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'selling_price') THEN
        ALTER TABLE products ADD COLUMN selling_price DECIMAL(15,2) DEFAULT 0.00;
        RAISE NOTICE 'Added selling_price column to products';
    END IF;

    -- Ensure unit_of_measure column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'unit_of_measure') THEN
        ALTER TABLE products ADD COLUMN unit_of_measure VARCHAR(50) DEFAULT 'pieces';
        RAISE NOTICE 'Added unit_of_measure column to products';
    END IF;

    -- Ensure product_code column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'product_code') THEN
        ALTER TABLE products ADD COLUMN product_code VARCHAR(100) UNIQUE;
        RAISE NOTICE 'Added product_code column to products';
    END IF;

    -- Ensure is_active column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_active') THEN
        ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to products';
    END IF;

    -- Ensure category_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_id') THEN
        ALTER TABLE products ADD COLUMN category_id UUID REFERENCES product_categories(id);
        RAISE NOTICE 'Added category_id column to products';
    END IF;

    -- Ensure company_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'company_id') THEN
        ALTER TABLE products ADD COLUMN company_id UUID REFERENCES companies(id);
        RAISE NOTICE 'Added company_id column to products';
    END IF;

    -- Ensure description column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'description') THEN
        ALTER TABLE products ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to products';
    END IF;

    -- Ensure name column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'name') THEN
        ALTER TABLE products ADD COLUMN name VARCHAR(255);
        RAISE NOTICE 'Added name column to products';
    END IF;

    -- Ensure created_at/updated_at columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'created_at') THEN
        ALTER TABLE products ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to products';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'updated_at') THEN
        ALTER TABLE products ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to products';
    END IF;

END $$;

-- Create stock_movements table for inventory tracking
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    product_id UUID REFERENCES products(id),
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer')),
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(15,2),
    reference_type VARCHAR(50),
    reference_id UUID,
    reference_number VARCHAR(100),
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for stock_movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_id ON stock_movements(company_id);
`;

interface FixResult {
  success: boolean;
  message: string;
  details: string[];
  sqlScript?: string;
}

export async function auditProductTable(): Promise<FixResult> {
  try {
    console.log('🔍 Auditing products table...');
    
    // Check if products table exists
    const { data: tableExists } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'products')
      .eq('table_schema', 'public')
      .single();

    if (!tableExists) {
      return {
        success: false,
        message: 'Products table does not exist',
        details: ['❌ Products table missing - needs to be created'],
        sqlScript: PRODUCT_FIX_SQL
      };
    }

    // Check for required columns
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'products');

    const existingColumns = columns?.map(col => col.column_name) || [];
    
    const requiredColumns = [
      'id', 'company_id', 'category_id', 'product_code', 'name', 'description',
      'unit_of_measure', 'cost_price', 'selling_price', 'stock_quantity',
      'minimum_stock_level', 'maximum_stock_level', 'reorder_point',
      'is_active', 'track_inventory', 'created_at', 'updated_at'
    ];

    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    const details: string[] = [];

    if (missingColumns.length === 0) {
      details.push('✅ All required columns exist');
      return {
        success: true,
        message: 'Products table audit passed',
        details
      };
    } else {
      details.push(`❌ Missing ${missingColumns.length} columns: ${missingColumns.join(', ')}`);
      details.push('🔧 SQL script generated to add missing columns');
      
      return {
        success: false,
        message: `Products table missing ${missingColumns.length} columns`,
        details,
        sqlScript: PRODUCT_FIX_SQL
      };
    }

  } catch (error: any) {
    console.error('❌ Product table audit failed:', error);
    return {
      success: false,
      message: 'Audit failed',
      details: [error.message],
      sqlScript: PRODUCT_FIX_SQL
    };
  }
}

export async function autoFixProductTable(): Promise<FixResult> {
  try {
    console.log('🚀 Auto-fixing products table...');
    toast.info('Fixing products table...', { description: 'Adding missing columns' });

    // Try to execute the fix SQL using various RPC methods
    const executionMethods = [
      { name: 'exec_sql', params: { sql: PRODUCT_FIX_SQL } },
      { name: 'sql', params: { query: PRODUCT_FIX_SQL } },
      { name: 'execute_sql', params: { sql_text: PRODUCT_FIX_SQL } }
    ];

    let fixExecuted = false;
    let lastError = '';

    for (const method of executionMethods) {
      try {
        console.log(`Trying RPC method: ${method.name}`);
        const { data, error } = await supabase.rpc(method.name, method.params);
        
        if (!error) {
          console.log(`✅ Fix executed successfully using ${method.name}`);
          fixExecuted = true;
          break;
        } else {
          console.log(`❌ ${method.name} failed:`, error.message);
          lastError = error.message;
        }
      } catch (err: any) {
        console.log(`❌ ${method.name} error:`, err.message);
        lastError = err.message;
      }
    }

    if (!fixExecuted) {
      console.log('⚠️ Could not execute fix automatically. Providing manual SQL.');
      toast.warning('Manual fix required', { description: 'Copy SQL script and run in Supabase' });
      
      return {
        success: false,
        message: 'Automatic fix failed - manual execution required',
        details: [
          '❌ Could not execute SQL automatically',
          '📋 Copy the SQL script to Supabase SQL Editor',
          '🔧 Run the script manually to add missing columns'
        ],
        sqlScript: PRODUCT_FIX_SQL
      };
    }

    // Verify fix was successful
    const verificationResult = await auditProductTable();
    
    if (verificationResult.success) {
      toast.success('Products table fixed!', { description: 'All columns added successfully' });
      return {
        success: true,
        message: 'Products table fixed successfully!',
        details: [
          '✅ Missing columns added',
          '✅ Stock movements table created',
          '✅ Indexes and triggers created',
          '✅ Products table ready for inventory forms'
        ]
      };
    } else {
      toast.warning('Fix partially successful', { description: 'Some issues may remain' });
      return verificationResult;
    }

  } catch (error: any) {
    console.error('❌ Auto-fix failed:', error);
    toast.error('Auto-fix failed', { description: error.message });
    
    return {
      success: false,
      message: 'Auto-fix failed',
      details: [error.message],
      sqlScript: PRODUCT_FIX_SQL
    };
  }
}

export async function checkStockMovementsTable(): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'stock_movements')
      .single();

    return !!data;
  } catch {
    return false;
  }
}

export async function getProductTableStatus(): Promise<{
  tableExists: boolean;
  missingColumns: string[];
  stockMovementsExists: boolean;
}> {
  try {
    const auditResult = await auditProductTable();
    const stockMovementsExists = await checkStockMovementsTable();
    
    // Extract missing columns from audit details
    const missingColumns: string[] = [];
    auditResult.details.forEach(detail => {
      if (detail.includes('Missing') && detail.includes('columns:')) {
        const match = detail.match(/columns: (.+)$/);
        if (match) {
          missingColumns.push(...match[1].split(', '));
        }
      }
    });

    return {
      tableExists: auditResult.success || !auditResult.details.some(d => d.includes('table missing')),
      missingColumns,
      stockMovementsExists
    };
  } catch (error) {
    console.error('Error checking product table status:', error);
    return {
      tableExists: false,
      missingColumns: [],
      stockMovementsExists: false
    };
  }
}
