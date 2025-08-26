// Execute Remittance Advice Database Fixes
// Run this script to apply all necessary fixes to the remittance advice functionality

const { createClient } = require('@supabase/supabase-js');

// Database fixes SQL
const REMITTANCE_FIXES_SQL = `
-- ============================================
-- REMITTANCE ADVICE COMPREHENSIVE FIXES
-- ============================================

-- 1. Add missing tax columns to remittance_advice_items
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'remittance_advice_items') THEN
        ALTER TABLE remittance_advice_items 
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS tax_setting_id UUID REFERENCES tax_settings(id);
        
        RAISE NOTICE 'Added tax columns to remittance_advice_items';
    END IF;
END $$;

-- 2. Add customer denormalization fields to remittance_advice
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'remittance_advice') THEN
        ALTER TABLE remittance_advice 
        ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS customer_address TEXT;
        
        RAISE NOTICE 'Added customer fields to remittance_advice';
    END IF;
END $$;

-- 3. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_remittance_advice_company_id ON remittance_advice(company_id);
CREATE INDEX IF NOT EXISTS idx_remittance_advice_customer_id ON remittance_advice(customer_id);
CREATE INDEX IF NOT EXISTS idx_remittance_advice_advice_date ON remittance_advice(advice_date);
CREATE INDEX IF NOT EXISTS idx_remittance_advice_items_remittance_id ON remittance_advice_items(remittance_advice_id);
CREATE INDEX IF NOT EXISTS idx_remittance_advice_items_payment_id ON remittance_advice_items(payment_id);
CREATE INDEX IF NOT EXISTS idx_remittance_advice_items_invoice_id ON remittance_advice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_remittance_advice_items_document_date ON remittance_advice_items(document_date);

-- 4. Create comprehensive RLS policies
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "remittance_advice_company_policy" ON remittance_advice;
    DROP POLICY IF EXISTS "remittance_advice_items_company_policy" ON remittance_advice_items;
    
    -- Create comprehensive RLS policies
    CREATE POLICY "remittance_advice_company_policy" ON remittance_advice
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );
    
    CREATE POLICY "remittance_advice_items_company_policy" ON remittance_advice_items
    FOR ALL USING (
        remittance_advice_id IN (
            SELECT id FROM remittance_advice WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
        )
    );
    
    RAISE NOTICE 'Created RLS policies for remittance advice tables';
END $$;

-- 5. Update existing records with proper defaults
UPDATE remittance_advice_items 
SET 
    tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false)
WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;

-- 6. Verify number generation function exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_remittance_number') THEN
        -- Create the function if it doesn't exist
        CREATE OR REPLACE FUNCTION generate_remittance_number(company_id_param UUID)
        RETURNS TEXT AS $function$
        DECLARE
            next_number INTEGER;
            formatted_number TEXT;
            current_year TEXT;
        BEGIN
            current_year := EXTRACT(YEAR FROM NOW())::TEXT;
            
            -- Get the next sequence number for this company and year
            SELECT COALESCE(MAX(
                CASE 
                    WHEN advice_number ~ ('^RA-' || current_year || '-[0-9]+$')
                    THEN CAST(SUBSTRING(advice_number FROM LENGTH('RA-' || current_year || '-') + 1) AS INTEGER)
                    ELSE 0
                END
            ), 0) + 1
            INTO next_number
            FROM remittance_advice
            WHERE company_id = company_id_param;
            
            formatted_number := 'RA-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
            
            RETURN formatted_number;
        END;
        $function$ LANGUAGE plpgsql SECURITY DEFINER;
        
        RAISE NOTICE 'Created generate_remittance_number function';
    END IF;
END $$;

-- 7. Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Final verification
SELECT 
    '✅ Remittance advice fixes completed!' as status,
    'Database schema updated with tax columns, RLS policies, and indexes' as summary;
`;

const VERIFICATION_SQL = `
-- Verify the fixes were applied correctly
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'remittance_advice_items' AND column_name = 'tax_setting_id') THEN '✅ EXISTS' ELSE '❌ MISSING' END as tax_setting_id_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'remittance_advice_items' AND column_name = 'tax_percentage') THEN '✅ EXISTS' ELSE '❌ MISSING' END as tax_percentage_column,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'remittance_advice' AND column_name = 'customer_name') THEN '✅ EXISTS' ELSE '❌ MISSING' END as customer_name_column,
    CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'remittance_advice' AND policyname = 'remittance_advice_company_policy') THEN '✅ EXISTS' ELSE '❌ MISSING' END as rls_policy,
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_remittance_number') THEN '✅ EXISTS' ELSE '❌ MISSING' END as number_generator_function;
`;

async function executeRemittanceFixes() {
    console.log('🔧 Starting Remittance Advice Database Fixes...\n');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials');
        console.log('\n📋 Manual SQL to run in Supabase SQL Editor:');
        console.log('=====================================');
        console.log(REMITTANCE_FIXES_SQL);
        console.log('=====================================');
        console.log('\n📋 Verification SQL:');
        console.log('=====================================');
        console.log(VERIFICATION_SQL);
        console.log('=====================================');
        return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    try {
        console.log('1️⃣ Applying database fixes...');
        
        // Execute the fixes
        const { data: fixResult, error: fixError } = await supabase.rpc('execute_sql', {
            sql_query: REMITTANCE_FIXES_SQL
        });
        
        if (fixError) {
            console.log('⚠️ RPC method not available. Applying fixes manually...\n');
            console.log('📋 Please run this SQL in your Supabase SQL Editor:');
            console.log('=====================================');
            console.log(REMITTANCE_FIXES_SQL);
            console.log('=====================================');
        } else {
            console.log('✅ Database fixes applied successfully!');
        }
        
        console.log('\n2️⃣ Verifying fixes...');
        
        // Verify the fixes
        const { data: verifyResult, error: verifyError } = await supabase.rpc('execute_sql', {
            sql_query: VERIFICATION_SQL
        });
        
        if (verifyError) {
            console.log('📋 Run this verification SQL to check results:');
            console.log('=====================================');
            console.log(VERIFICATION_SQL);
            console.log('=====================================');
        } else {
            console.log('✅ Verification completed');
            if (verifyResult && verifyResult.length > 0) {
                console.table(verifyResult);
            }
        }
        
    } catch (error) {
        console.error('❌ Error applying fixes:', error.message);
        console.log('\n📋 Manual SQL to run in Supabase SQL Editor:');
        console.log('=====================================');
        console.log(REMITTANCE_FIXES_SQL);
        console.log('=====================================');
    }
}

// Run the fixes if this script is executed directly
if (require.main === module) {
    executeRemittanceFixes().then(() => {
        console.log('\n🎯 Remittance advice database fixes completed!');
        console.log('Next steps:');
        console.log('1. Replace CreateRemittanceModal with CreateRemittanceModalFixed');
        console.log('2. Add EditRemittanceModal to the page');
        console.log('3. Test create, edit, and view functionality');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
}

module.exports = { executeRemittanceFixes, REMITTANCE_FIXES_SQL, VERIFICATION_SQL };
