import { supabase } from '@/integrations/supabase/client';

/**
 * Immediately create the payments table and all related structures
 */
export async function createPaymentsTableNow() {
  console.log('🚨 CREATING PAYMENTS TABLE IMMEDIATELY...');

  const createTableSQL = `
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

-- Step 7: Create RLS policies for payments
DROP POLICY IF EXISTS "payments_select_policy" ON payments;
CREATE POLICY "payments_select_policy" ON payments
    FOR SELECT USING (true); -- Allow all for now, will be restricted later

DROP POLICY IF EXISTS "payments_insert_policy" ON payments;
CREATE POLICY "payments_insert_policy" ON payments
    FOR INSERT WITH CHECK (true); -- Allow all for now

DROP POLICY IF EXISTS "payments_update_policy" ON payments;
CREATE POLICY "payments_update_policy" ON payments
    FOR UPDATE USING (true); -- Allow all for now

-- Step 8: Create RLS policies for payment_allocations
DROP POLICY IF EXISTS "payment_allocations_select_policy" ON payment_allocations;
CREATE POLICY "payment_allocations_select_policy" ON payment_allocations
    FOR SELECT USING (true); -- Allow all for now

DROP POLICY IF EXISTS "payment_allocations_insert_policy" ON payment_allocations;
CREATE POLICY "payment_allocations_insert_policy" ON payment_allocations
    FOR INSERT WITH CHECK (true); -- Allow all for now
`;

  try {
    // Try using direct SQL execution
    console.log('📝 Executing payments table creation SQL...');
    
    // First, try the RPC approach
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('exec_sql', { sql: createTableSQL });

    if (rpcError) {
      console.log('❌ RPC failed, trying alternative approach...');
      
      // Alternative: Use manual SQL in parts
      const sqlParts = [
        `CREATE TYPE IF NOT EXISTS payment_method AS ENUM ('cash', 'cheque', 'bank_transfer', 'mobile_money', 'credit_card', 'other');`,
        
        `CREATE TABLE IF NOT EXISTS payments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          company_id UUID,
          customer_id UUID,
          payment_number VARCHAR(100) UNIQUE NOT NULL,
          payment_date DATE NOT NULL,
          amount DECIMAL(15,2) NOT NULL,
          payment_method TEXT NOT NULL,
          reference_number VARCHAR(255),
          notes TEXT,
          created_by UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`,
        
        `CREATE TABLE IF NOT EXISTS payment_allocations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          payment_id UUID,
          invoice_id UUID,
          amount_allocated DECIMAL(15,2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`
      ];

      // Execute each part separately (won't work with Supabase client directly)
      console.log('⚠️ Cannot execute DDL statements directly via Supabase client');
      
      return {
        success: false,
        message: 'Cannot create tables via client. Manual SQL execution required.',
        sqlRequired: createTableSQL,
        error: rpcError
      };
    }

    console.log('✅ RPC execution successful');
    
    // Verify the table was created
    const { data: testData, error: testError } = await supabase
      .from('payments')
      .select('id')
      .limit(1);

    if (testError) {
      return {
        success: false,
        message: `Table creation may have failed. Test query error: ${testError.message}`,
        sqlRequired: createTableSQL,
        error: testError
      };
    }

    return {
      success: true,
      message: 'Payments table successfully created and verified!',
      details: 'All tables, enums, triggers, and policies are now in place.'
    };

  } catch (error) {
    console.error('❌ Failed to create payments table:', error);
    return {
      success: false,
      message: `Exception during table creation: ${error}`,
      sqlRequired: createTableSQL,
      error
    };
  }
}

/**
 * Test if payments table exists
 */
export async function testPaymentsTable() {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('id')
      .limit(1);

    return {
      exists: !error,
      error: error?.message || null
    };
  } catch (err) {
    return {
      exists: false,
      error: `Exception: ${err}`
    };
  }
}
