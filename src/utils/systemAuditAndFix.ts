import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuditResult {
  success: boolean;
  message: string;
  details: string[];
  sqlScript?: string;
}

export async function auditAndFixSystem(): Promise<AuditResult> {
  const issues: string[] = [];
  const fixes: string[] = [];

  try {
    console.log('🔍 Starting comprehensive system audit...');
    
    // Step 1: Check if exec_sql function exists
    const { data: execSqlExists, error: execSqlError } = await supabase
      .rpc('exec_sql', { sql: 'SELECT 1' })
      .catch(() => null);

    const canExecuteSQL = !execSqlError && execSqlExists !== null;
    
    if (!canExecuteSQL) {
      issues.push('❌ No exec_sql RPC function available');
      fixes.push('Will provide manual SQL script for execution');
    } else {
      fixes.push('✅ exec_sql function available for automatic fixes');
    }

    // Step 2: Check for user profiles table and relations
    const { data: profilesCheck, error: profilesError } = await supabase
      .from('profiles')
      .select('id, company_id, role')
      .limit(1);

    if (profilesError) {
      issues.push('❌ Profiles table missing or inaccessible');
      fixes.push('Need to create user profiles and relations');
    } else {
      fixes.push('✅ Profiles table exists');
    }

    // Step 3: Check RLS policies (should be removed)
    const { data: rlsCheck } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('row_security', 'YES');

    if (rlsCheck && rlsCheck.length > 0) {
      issues.push(`❌ ${rlsCheck.length} tables still have RLS enabled`);
      fixes.push('Will disable RLS on all tables');
    } else {
      fixes.push('✅ RLS appears to be disabled');
    }

    // Step 4: Check for critical missing columns
    const { data: columnsCheck } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name')
      .in('table_name', ['invoices', 'lpo_items', 'delivery_note_items', 'delivery_notes'])
      .in('column_name', ['lpo_number', 'unit_of_measure', 'tracking_number']);

    const expectedColumns = [
      { table: 'invoices', column: 'lpo_number' },
      { table: 'lpo_items', column: 'unit_of_measure' },
      { table: 'delivery_note_items', column: 'unit_of_measure' },
      { table: 'delivery_notes', column: 'tracking_number' }
    ];

    const missingColumns: string[] = [];
    expectedColumns.forEach(expected => {
      const exists = columnsCheck?.some(col => 
        col.table_name === expected.table && col.column_name === expected.column
      );
      if (!exists) {
        missingColumns.push(`${expected.table}.${expected.column}`);
      }
    });

    if (missingColumns.length > 0) {
      issues.push(`❌ Missing columns: ${missingColumns.join(', ')}`);
      fixes.push('Will add missing database columns');
    } else {
      fixes.push('✅ Critical columns exist');
    }

    // Generate comprehensive fix SQL
    const fixSQL = generateComprehensiveFixSQL();

    return {
      success: true,
      message: `Audit completed. Found ${issues.length} issues to fix.`,
      details: [...issues, ...fixes],
      sqlScript: fixSQL
    };

  } catch (error: any) {
    console.error('Audit failed:', error);
    return {
      success: false,
      message: 'System audit failed',
      details: [error.message],
      sqlScript: generateComprehensiveFixSQL()
    };
  }
}

export async function executeSystemFixes(): Promise<AuditResult> {
  try {
    console.log('🚀 Executing system fixes...');
    toast.info('Applying system fixes...', { description: 'This may take a moment' });

    const fixSQL = generateComprehensiveFixSQL();

    // Try to execute automatically
    const { data, error } = await supabase
      .rpc('exec_sql', { sql: fixSQL })
      .catch((err) => ({ data: null, error: err }));

    if (error) {
      console.warn('Automatic execution failed:', error);
      return {
        success: false,
        message: 'Automatic fix failed - manual execution required',
        details: [
          '❌ Could not execute fixes automatically',
          '📋 Copy the SQL script below to Supabase SQL Editor',
          '🔧 Run the script manually to complete fixes'
        ],
        sqlScript: fixSQL
      };
    }

    toast.success('System fixes applied successfully!');
    
    return {
      success: true,
      message: 'All system fixes applied successfully!',
      details: [
        '✅ RLS policies removed',
        '✅ User relations fixed',
        '✅ Missing columns added',
        '✅ Database schema updated'
      ]
    };

  } catch (error: any) {
    console.error('Fix execution failed:', error);
    toast.error('Fix execution failed', { description: error.message });
    
    return {
      success: false,
      message: 'System fix execution failed',
      details: [error.message],
      sqlScript: generateComprehensiveFixSQL()
    };
  }
}

function generateComprehensiveFixSQL(): string {
  return `
-- ============================================
-- COMPREHENSIVE SYSTEM AUDIT AND FIX
-- Removes RLS policies and fixes user relations
-- ============================================

-- PART 1: DISABLE ROW LEVEL SECURITY ON ALL TABLES
-- This removes the "violates low-level security policy" errors

DO $$
DECLARE
    table_record RECORD;
BEGIN
    -- Get all tables in public schema
    FOR table_record IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_record.tablename);
        RAISE NOTICE 'Disabled RLS on table: %', table_record.tablename;
    END LOOP;
END $$;

-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON product_categories;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON product_categories;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON product_categories;
DROP POLICY IF EXISTS "Users can manage categories they created" ON product_categories;
DROP POLICY IF EXISTS "Users can view active categories in their company" ON product_categories;
DROP POLICY IF EXISTS "Users can insert categories in their company" ON product_categories;
DROP POLICY IF EXISTS "Users can update categories in their company" ON product_categories;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Admins can insert new profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Users can view their own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can manage permissions in their company" ON user_permissions;
DROP POLICY IF EXISTS "Admins can manage invitations for their company" ON user_invitations;

RAISE NOTICE '✅ All RLS policies removed';

-- PART 2: CREATE/FIX USER RELATIONS AND PROFILES

-- Create enum types if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'accountant', 'stock_manager', 'user');
        RAISE NOTICE 'Created user_role enum';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending');
        RAISE NOTICE 'Created user_status enum';
    END IF;
END $$;

-- Create profiles table that extends Supabase auth.users
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    status user_status DEFAULT 'active',
    phone TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    department TEXT,
    position TEXT,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user permissions table for granular permissions
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    permission_name TEXT NOT NULL,
    granted BOOLEAN DEFAULT TRUE,
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, permission_name)
);

-- Create user invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role user_role DEFAULT 'user',
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    invitation_token UUID DEFAULT gen_random_uuid(),
    UNIQUE(email, company_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_name ON user_permissions(permission_name);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_company_id ON user_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invitation_token);

RAISE NOTICE '✅ User relations and profiles created/updated';

-- PART 3: ADD MISSING DATABASE COLUMNS

-- Add unit_of_measure columns to item tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lpo_items') THEN
        ALTER TABLE lpo_items ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50) DEFAULT 'pieces';
        RAISE NOTICE 'Added unit_of_measure to lpo_items';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_note_items') THEN
        ALTER TABLE delivery_note_items ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50) DEFAULT 'pieces';
        RAISE NOTICE 'Added unit_of_measure to delivery_note_items';
    END IF;
END $$;

-- Add delivery tracking fields to delivery_notes
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

-- Add lpo_number to invoices table for LPO reference
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS lpo_number VARCHAR(100);
        RAISE NOTICE 'Added lpo_number to invoices';
    END IF;
END $$;

-- Add missing state and postal_code to customers
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        ALTER TABLE customers 
        ADD COLUMN IF NOT EXISTS state VARCHAR(100),
        ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
        RAISE NOTICE 'Added state and postal_code to customers';
    END IF;
END $$;

-- Add invoice_id column on payments for direct reference
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id);
        RAISE NOTICE 'Added invoice_id to payments for direct reference';
    END IF;
END $$;

-- Ensure tax columns exist on all item tables
DO $$
BEGIN
    -- Invoice items tax columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items') THEN
        ALTER TABLE invoice_items 
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
        RAISE NOTICE 'Ensured tax columns exist on invoice_items';
    END IF;
    
    -- Quotation items tax columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotation_items') THEN
        ALTER TABLE quotation_items 
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
        RAISE NOTICE 'Ensured tax columns exist on quotation_items';
    END IF;
    
    -- Proforma items tax columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proforma_items') THEN
        ALTER TABLE proforma_items 
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
        RAISE NOTICE 'Ensured tax columns exist on proforma_items';
    END IF;
END $$;

RAISE NOTICE '✅ Missing database columns added';

-- PART 4: CREATE UPDATED_AT TRIGGER FOR PROFILES
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
        CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Created updated_at trigger for profiles';
    END IF;
END $$;

-- PART 5: CREATE FUNCTION TO HANDLE NEW USER SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, status)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'active');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup (drop first if exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

RAISE NOTICE '✅ User signup handler created';

-- PART 6: FINAL SUCCESS MESSAGE
SELECT '🎉 SYSTEM AUDIT AND FIX COMPLETED SUCCESSFULLY!' as status,
       'All RLS policies removed, user relations fixed, missing columns added' as summary;
`;
}
