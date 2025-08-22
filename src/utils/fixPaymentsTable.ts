import { supabase } from '@/integrations/supabase/client';

export interface DatabaseFixResult {
  success: boolean;
  message: string;
  details?: any;
  sqlExecuted?: string;
}

/**
 * Check if payments table exists and create it if missing
 */
export async function checkAndFixPaymentsTable(): Promise<DatabaseFixResult> {
  console.log('🔍 Checking payments table status...');

  try {
    // Step 1: Check if payments table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('payments')
      .select('id')
      .limit(1);

    if (!tableError) {
      return {
        success: true,
        message: 'Payments table already exists and is accessible',
        details: { status: 'table_exists' }
      };
    }

    // Step 2: If table doesn't exist, create it
    if (tableError.message.includes('does not exist') || 
        tableError.message.includes('relation') ||
        tableError.code === 'PGRST116') {
      
      console.log('❌ Payments table missing, creating it...');
      
      const paymentsSQL = `
-- Create payment_method enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'cheque', 'bank_transfer', 'mobile_money', 'credit_card', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    payment_number VARCHAR(100) UNIQUE NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method payment_method NOT NULL,
    reference_number VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_allocations table
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount_allocated DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for payments table
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payments table
DROP POLICY IF EXISTS "Users can view payments for their company" ON payments;
CREATE POLICY "Users can view payments for their company" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = payments.company_id
        )
    );

DROP POLICY IF EXISTS "Users can insert payments for their company" ON payments;
CREATE POLICY "Users can insert payments for their company" ON payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = payments.company_id
        )
    );

DROP POLICY IF EXISTS "Users can update payments for their company" ON payments;
CREATE POLICY "Users can update payments for their company" ON payments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = payments.company_id
        )
    );

-- Create RLS policies for payment_allocations table
DROP POLICY IF EXISTS "Users can view payment allocations for their company" ON payment_allocations;
CREATE POLICY "Users can view payment allocations for their company" ON payment_allocations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM payments 
            JOIN profiles ON profiles.company_id = payments.company_id
            WHERE payments.id = payment_allocations.payment_id 
            AND profiles.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert payment allocations for their company" ON payment_allocations;
CREATE POLICY "Users can insert payment allocations for their company" ON payment_allocations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM payments 
            JOIN profiles ON profiles.company_id = payments.company_id
            WHERE payments.id = payment_allocations.payment_id 
            AND profiles.id = auth.uid()
        )
    );
`;

      // Execute the SQL using RPC call to avoid Supabase client limitations
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('exec_sql', { sql: paymentsSQL });

      if (rpcError) {
        console.error('❌ Failed to execute payments table creation SQL:', rpcError);
        return {
          success: false,
          message: `Failed to create payments table: ${rpcError.message}`,
          details: rpcError,
          sqlExecuted: paymentsSQL
        };
      }

      // Verify the table was created
      const { data: verifyData, error: verifyError } = await supabase
        .from('payments')
        .select('id')
        .limit(1);

      if (verifyError) {
        return {
          success: false,
          message: `Payments table creation attempted but verification failed: ${verifyError.message}`,
          details: verifyError,
          sqlExecuted: paymentsSQL
        };
      }

      return {
        success: true,
        message: 'Payments table successfully created with all related structures',
        details: { status: 'table_created', verification: 'passed' },
        sqlExecuted: paymentsSQL
      };
    }

    // Step 3: Other database errors
    return {
      success: false,
      message: `Unexpected database error: ${tableError.message}`,
      details: tableError
    };

  } catch (error) {
    console.error('❌ Exception during payments table check/fix:', error);
    return {
      success: false,
      message: `Exception during payments table fix: ${error}`,
      details: error
    };
  }
}

/**
 * Alternative fix using direct SQL execution (if RPC is not available)
 */
export async function manualPaymentsTableFix(): Promise<string> {
  return `-- MANUAL FIX: Execute this SQL in Supabase SQL Editor

-- Step 1: Create payment_method enum
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'cheque', 'bank_transfer', 'mobile_money', 'credit_card', 'other');
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'payment_method enum already exists';
END $$;

-- Step 2: Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    payment_number VARCHAR(100) UNIQUE NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method payment_method NOT NULL,
    reference_number VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create payment_allocations table
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount_allocated DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 5: Create trigger for payments table
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Step 6: Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies
CREATE POLICY "payments_select_policy" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = payments.company_id
        )
    );

CREATE POLICY "payments_insert_policy" ON payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.company_id = payments.company_id
        )
    );

CREATE POLICY "payment_allocations_select_policy" ON payment_allocations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM payments 
            JOIN profiles ON profiles.company_id = payments.company_id
            WHERE payments.id = payment_allocations.payment_id 
            AND profiles.id = auth.uid()
        )
    );

-- Step 8: Verification query
SELECT 'SUCCESS: Payments table created' as status,
       COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_name IN ('payments', 'payment_allocations') 
  AND table_schema = 'public';
`;
}
