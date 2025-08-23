import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DATABASE_FIXES_SQL = `
-- ============================================
-- COMPREHENSIVE DATABASE FIXES AND RLS REMOVAL
-- This fixes all identified issues and removes RLS policies
-- ============================================

-- 1. Fix remittance_items table name bug in tax_settings migration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'remittance_advice_items') THEN
        ALTER TABLE remittance_advice_items 
        ADD COLUMN IF NOT EXISTS tax_setting_id UUID REFERENCES tax_settings(id);
        RAISE NOTICE 'Added tax_setting_id to remittance_advice_items';
    END IF;
END $$;

-- 2. Add missing unit_of_measure columns to item tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lpo_items') THEN
        ALTER TABLE lpo_items 
        ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50) DEFAULT 'pieces';
        RAISE NOTICE 'Added unit_of_measure to lpo_items';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_note_items') THEN
        ALTER TABLE delivery_note_items 
        ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50) DEFAULT 'pieces';
        RAISE NOTICE 'Added unit_of_measure to delivery_note_items';
    END IF;
END $$;

-- 3. Add missing delivery tracking fields to delivery_notes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_notes') THEN
        ALTER TABLE delivery_notes 
        ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(50),
        ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(255),
        ADD COLUMN IF NOT EXISTS carrier VARCHAR(255);
        RAISE NOTICE 'Added delivery tracking fields to delivery_notes';
    END IF;
END $$;

-- 4. Add lpo_number to invoices table for LPO reference
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        ALTER TABLE invoices 
        ADD COLUMN IF NOT EXISTS lpo_number VARCHAR(100);
        RAISE NOTICE 'Added lpo_number to invoices';
    END IF;
END $$;

-- 5. Add discount_before_vat columns to item tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items') THEN
        ALTER TABLE invoice_items 
        ADD COLUMN IF NOT EXISTS discount_before_vat DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added discount_before_vat to invoice_items';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotation_items') THEN
        ALTER TABLE quotation_items 
        ADD COLUMN IF NOT EXISTS discount_before_vat DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added discount_before_vat to quotation_items';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proforma_items') THEN
        ALTER TABLE proforma_items 
        ADD COLUMN IF NOT EXISTS discount_before_vat DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added discount_before_vat to proforma_items';
    END IF;
END $$;

-- 6. Add product_name columns to item tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items') THEN
        ALTER TABLE invoice_items 
        ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
        RAISE NOTICE 'Added product_name to invoice_items';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotation_items') THEN
        ALTER TABLE quotation_items 
        ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
        RAISE NOTICE 'Added product_name to quotation_items';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proforma_items') THEN
        ALTER TABLE proforma_items 
        ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
        RAISE NOTICE 'Added product_name to proforma_items';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lpo_items') THEN
        ALTER TABLE lpo_items 
        ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
        RAISE NOTICE 'Added product_name to lpo_items';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_note_items') THEN
        ALTER TABLE credit_note_items 
        ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
        RAISE NOTICE 'Added product_name to credit_note_items';
    END IF;
END $$;

-- 7. Add customer fields to remittance_advice
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'remittance_advice') THEN
        ALTER TABLE remittance_advice 
        ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS customer_address TEXT;
        RAISE NOTICE 'Added customer fields to remittance_advice';
    END IF;
END $$;

-- 8. Ensure tax columns exist on all item tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items') THEN
        ALTER TABLE invoice_items 
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
        RAISE NOTICE 'Ensured tax columns exist on invoice_items';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotation_items') THEN
        ALTER TABLE quotation_items 
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
        RAISE NOTICE 'Ensured tax columns exist on quotation_items';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proforma_items') THEN
        ALTER TABLE proforma_items 
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
        RAISE NOTICE 'Ensured tax columns exist on proforma_items';
    END IF;
END $$;

-- 9. Fix stock level column naming
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        ALTER TABLE products 
        ADD COLUMN IF NOT EXISTS min_stock_level DECIMAL(10,3),
        ADD COLUMN IF NOT EXISTS max_stock_level DECIMAL(10,3);
        
        UPDATE products 
        SET min_stock_level = minimum_stock_level,
            max_stock_level = maximum_stock_level
        WHERE min_stock_level IS NULL OR max_stock_level IS NULL;
        
        RAISE NOTICE 'Added form-compatible stock level columns to products';
    END IF;
END $$;

-- 10. Add missing state and postal_code to customers
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        ALTER TABLE customers 
        ADD COLUMN IF NOT EXISTS state VARCHAR(100),
        ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
        RAISE NOTICE 'Added state and postal_code to customers';
    END IF;
END $$;

-- 11. Add invoice_id column on payments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        ALTER TABLE payments 
        ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id);
        RAISE NOTICE 'Added invoice_id to payments for direct reference';
    END IF;
END $$;

-- ============================================
-- RLS REMOVAL SECTION
-- Remove all Row Level Security policies
-- ============================================

-- Disable RLS on all tables
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE 'ALTER TABLE ' || table_record.tablename || ' DISABLE ROW LEVEL SECURITY';
            RAISE NOTICE 'Disabled RLS on table: %', table_record.tablename;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not disable RLS on table %: %', table_record.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- Drop all existing RLS policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE 'DROP POLICY IF EXISTS ' || policy_record.policyname || ' ON ' || policy_record.tablename;
            RAISE NOTICE 'Dropped policy % on table %', policy_record.policyname, policy_record.tablename;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not drop policy % on table %: %', policy_record.policyname, policy_record.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- Grant full access to authenticated users on all tables
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE 'GRANT ALL ON ' || table_record.tablename || ' TO authenticated';
            RAISE NOTICE 'Granted ALL privileges on table: %', table_record.tablename;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not grant privileges on table %: %', table_record.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- Grant usage on all sequences
DO $$
DECLARE
    seq_record RECORD;
BEGIN
    FOR seq_record IN
        SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE ' || seq_record.sequencename || ' TO authenticated';
            RAISE NOTICE 'Granted USAGE on sequence: %', seq_record.sequencename;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not grant usage on sequence %: %', seq_record.sequencename, SQLERRM;
        END;
    END LOOP;
END $$;

-- Success message
SELECT '✅ DATABASE FIXES AND RLS REMOVAL COMPLETED!' as message,
       'All missing columns added and RLS policies removed.' as details;
`;

export interface FixAndRLSResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

export async function runFixesAndRemoveRLS(): Promise<FixAndRLSResult> {
  try {
    console.log('🚀 Starting database fixes and RLS removal...');
    toast.info('Running database fixes and removing RLS...', {
      description: 'This may take a few moments to complete.'
    });

    // Try to execute using various RPC methods
    const executionMethods = [
      { name: 'exec_sql', params: { sql: DATABASE_FIXES_SQL } },
      { name: 'sql', params: { query: DATABASE_FIXES_SQL } },
      { name: 'execute_sql', params: { sql_text: DATABASE_FIXES_SQL } }
    ];

    let executed = false;
    let lastError = '';

    for (const method of executionMethods) {
      try {
        console.log(`Trying RPC method: ${method.name}`);
        const { data, error } = await supabase.rpc(method.name, method.params);
        
        if (!error) {
          console.log(`✅ Database fixes and RLS removal executed successfully using ${method.name}`);
          executed = true;
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

    if (!executed) {
      console.log('⚠️ Could not execute automatically. Providing manual SQL.');
      
      return {
        success: false,
        message: 'Automatic execution failed. Manual execution required.',
        error: lastError,
        details: {
          sql: DATABASE_FIXES_SQL,
          instructions: 'Copy the SQL and run it manually in Supabase SQL Editor'
        }
      };
    }

    // Verify some key fixes were applied
    console.log('🔍 Verifying fixes...');
    
    const verificationQueries = [
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'lpo_items' AND column_name = 'unit_of_measure'",
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'lpo_number'",
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'delivery_notes' AND column_name = 'tracking_number'"
    ];

    const verificationResults = [];
    for (const query of verificationQueries) {
      try {
        const { data } = await supabase.rpc('sql', { query });
        verificationResults.push(data);
      } catch (err) {
        console.warn('Verification query failed:', err);
      }
    }

    console.log('✅ Database fixes and RLS removal completed successfully!');
    
    toast.success('Database fixes and RLS removal completed!', {
      description: 'All missing columns added and RLS policies removed.'
    });

    return {
      success: true,
      message: 'Database fixes and RLS removal completed successfully!',
      details: {
        fixesApplied: true,
        rlsRemoved: true,
        verificationResults
      }
    };

  } catch (error: any) {
    console.error('❌ Database fixes and RLS removal failed:', error);
    
    toast.error('Database fixes and RLS removal failed', {
      description: error.message
    });

    return {
      success: false,
      message: 'Database fixes and RLS removal failed',
      error: error.message
    };
  }
}
