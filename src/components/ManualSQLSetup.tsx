import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Database, Copy, ExternalLink } from 'lucide-react';
import { checkProfilesTable, getDatabaseStatus } from '@/utils/setupDatabase';
import { toast } from 'sonner';

const MANUAL_SQL_SCRIPT = `-- MedPlus Database Setup Script
-- Execute this SQL in your Supabase Dashboard > SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'accountant', 'stock_manager', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Companies table
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
);

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    status user_status DEFAULT 'pending',
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

-- User permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    permission_name TEXT NOT NULL,
    granted BOOLEAN DEFAULT TRUE,
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, permission_name)
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Kenya',
    tax_number VARCHAR(100),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product categories
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES product_categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products/Inventory table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id),
    product_code VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_of_measure VARCHAR(50) DEFAULT 'pcs',
    cost_price DECIMAL(15,2) DEFAULT 0,
    selling_price DECIMAL(15,2) DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 0,
    maximum_stock INTEGER,
    reorder_level INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotations table
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    quotation_number VARCHAR(100) NOT NULL,
    quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft',
    notes TEXT,
    terms_and_conditions TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotation items
CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table  
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    quotation_id UUID REFERENCES quotations(id),
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    amount_paid DECIMAL(15,2) DEFAULT 0,
    amount_due DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft',
    notes TEXT,
    terms_and_conditions TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_quotations_company_id ON quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`;

export function ManualSQLSetup() {
  const [isChecking, setIsChecking] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState<any>(null);

  const checkDatabaseStatus = async () => {
    setIsChecking(true);
    try {
      const status = await getDatabaseStatus();
      const profilesCheck = await checkProfilesTable();
      
      setDatabaseStatus({
        ...status,
        profilesTableExists: profilesCheck.exists,
        profilesError: profilesCheck.error
      });
      
      if (status.ready) {
        toast.success('Database is ready!');
      } else {
        toast.warning('Database setup incomplete');
      }
      
    } catch (error) {
      console.error('Error checking database:', error);
      toast.error('Failed to check database status');
    } finally {
      setIsChecking(false);
    }
  };

  const copySQL = () => {
    navigator.clipboard.writeText(MANUAL_SQL_SCRIPT);
    toast.success('SQL script copied to clipboard!');
  };

  const openSupabaseDashboard = () => {
    const supabaseUrl = 'https://klifzjcfnlaxminytmyh.supabase.co';
    const dashboardUrl = `https://supabase.com/dashboard/project/${supabaseUrl.split('//')[1].split('.')[0]}/sql`;
    window.open(dashboardUrl, '_blank');
  };

  React.useEffect(() => {
    checkDatabaseStatus();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <Database className="h-5 w-5" />
            Manual Database Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert className="border-orange-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Manual SQL Execution Required:</strong> Due to Supabase security restrictions, 
                you need to execute the SQL script manually in your Supabase Dashboard.
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-3">
              <Button 
                onClick={copySQL}
                variant="outline"
                className="border-orange-300 text-orange-700"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy SQL Script
              </Button>
              
              <Button 
                onClick={openSupabaseDashboard}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Supabase SQL Editor
              </Button>
              
              <Button 
                onClick={checkDatabaseStatus}
                disabled={isChecking}
                variant="outline"
              >
                {isChecking ? 'Checking...' : 'Check Status'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Status */}
      {databaseStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Database Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Overall Status</span>
                <Badge variant={databaseStatus.ready ? 'default' : 'destructive'}>
                  {databaseStatus.ready ? '✅ Ready' : '❌ Setup Required'}
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {databaseStatus.tablesWorking}/{databaseStatus.tablesChecked} tables working
              </div>
              
              {!databaseStatus.profilesTableExists && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    <strong>Profiles table not found:</strong> {databaseStatus.profilesError}
                    <br />
                    Please execute the SQL script above in your Supabase Dashboard.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(databaseStatus.tables).map(([table, working]) => (
                  <div key={table} className="flex items-center justify-between text-sm p-2 border rounded">
                    <span>{table}</span>
                    <span>{working ? '✅' : '❌'}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SQL Script Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">SQL Script</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copy this script and execute it in your Supabase Dashboard SQL Editor:
            </p>
            
            <div className="relative">
              <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto">
                <code>{MANUAL_SQL_SCRIPT}</code>
              </pre>
              <Button
                onClick={copySQL}
                size="sm"
                className="absolute top-2 right-2"
                variant="outline"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <strong>Steps:</strong>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Copy the SQL script above</li>
                <li>Open your Supabase Dashboard</li>
                <li>Go to SQL Editor</li>
                <li>Paste and execute the script</li>
                <li>Return here and click "Check Status"</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Message */}
      {databaseStatus?.ready && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700">✅ Database Ready!</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-green-200 bg-white">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Great! Your database tables are set up correctly. You can now proceed to create your super admin account.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
