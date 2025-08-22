import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Copy, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

const MANUAL_MIGRATION_SQL = `-- ============================================
-- COMPLETE DATABASE SETUP FOR MEDPLUS SYSTEM
-- Execute this in Supabase SQL Editor Dashboard
-- ============================================

-- 1. Create LPO status enum
DO $$ BEGIN
    CREATE TYPE lpo_status AS ENUM ('draft', 'sent', 'approved', 'received', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create main LPO table
CREATE TABLE IF NOT EXISTS lpos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create LPO items table
CREATE TABLE IF NOT EXISTS lpo_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lpo_id UUID REFERENCES lpos(id) ON DELETE CASCADE,
    product_id UUID,
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL,
    notes TEXT,
    sort_order INTEGER DEFAULT 0
);

-- 4. Add tax columns to quotation_items (if table exists)
DO $$ BEGIN
    ALTER TABLE quotation_items 
    ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
EXCEPTION
    WHEN undefined_table THEN 
        RAISE NOTICE 'quotation_items table does not exist yet - skipping tax columns';
END $$;

-- 5. Add tax columns to invoice_items (if table exists)
DO $$ BEGIN
    ALTER TABLE invoice_items
    ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
EXCEPTION
    WHEN undefined_table THEN 
        RAISE NOTICE 'invoice_items table does not exist yet - skipping tax columns';
END $$;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lpos_company_id ON lpos(company_id);
CREATE INDEX IF NOT EXISTS idx_lpos_supplier_id ON lpos(supplier_id);
CREATE INDEX IF NOT EXISTS idx_lpos_lpo_number ON lpos(lpo_number);
CREATE INDEX IF NOT EXISTS idx_lpos_status ON lpos(status);
CREATE INDEX IF NOT EXISTS idx_lpos_lpo_date ON lpos(lpo_date);
CREATE INDEX IF NOT EXISTS idx_lpo_items_lpo_id ON lpo_items(lpo_id);

-- 7. Create LPO number generation function
CREATE OR REPLACE FUNCTION generate_lpo_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    company_code TEXT;
    lpo_count INTEGER;
    lpo_number TEXT;
BEGIN
    -- Get company code or default
    SELECT COALESCE(UPPER(LEFT(name, 3)), 'LPO') INTO company_code
    FROM companies 
    WHERE id = company_uuid;
    
    -- If no company found, use default
    IF company_code IS NULL THEN
        company_code := 'LPO';
    END IF;
    
    -- Count existing LPOs
    SELECT COUNT(*) INTO lpo_count
    FROM lpos
    WHERE company_id = company_uuid;
    
    -- Generate number
    lpo_number := company_code || '-LPO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((lpo_count + 1)::TEXT, 4, '0');
    
    RETURN lpo_number;
END;
$$ LANGUAGE plpgsql;

-- 8. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Add trigger to lpos table
DROP TRIGGER IF EXISTS update_lpos_updated_at ON lpos;
CREATE TRIGGER update_lpos_updated_at
    BEFORE UPDATE ON lpos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Update existing records (if tables exist and have records)
DO $$ BEGIN
    UPDATE quotation_items 
    SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false 
    WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;
EXCEPTION
    WHEN undefined_table THEN 
        RAISE NOTICE 'quotation_items table does not exist - skipping update';
END $$;

DO $$ BEGIN
    UPDATE invoice_items 
    SET tax_percentage = 0, tax_amount = 0, tax_inclusive = false 
    WHERE tax_percentage IS NULL OR tax_amount IS NULL OR tax_inclusive IS NULL;
EXCEPTION
    WHEN undefined_table THEN 
        RAISE NOTICE 'invoice_items table does not exist - skipping update';
END $$;

-- ============================================
-- MIGRATION COMPLETE! 
-- Your database is now ready for the MedPlus system
-- ============================================`;

export function SimpleMigrationGuide() {
  const [showSQL, setShowSQL] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const copySQL = () => {
    navigator.clipboard.writeText(MANUAL_MIGRATION_SQL).then(() => {
      toast.success('SQL script copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy SQL script');
    });
  };

  const markCompleted = () => {
    setIsCompleted(true);
    toast.success('Migration marked as complete! You can now proceed with system setup.');
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Setup - Manual Migration Required
          {isCompleted && (
            <Badge variant="outline" className="bg-success-light text-success border-success/20">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Explanation */}
        <Alert className="border-info bg-info-light">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription>
            <strong>Why Manual Setup?</strong> Your Supabase database doesn't have the necessary RPC functions 
            to execute SQL automatically. This is normal for new projects. The manual setup only takes a few minutes.
          </AlertDescription>
        </Alert>

        {/* Instructions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Step-by-Step Instructions:</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="font-medium">Open Supabase Dashboard</p>
                  <p className="text-sm text-muted-foreground">Go to your project's dashboard</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Dashboard
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-medium">Navigate to SQL Editor</p>
                  <p className="text-sm text-muted-foreground">Find it in the left sidebar</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p className="font-medium">Copy & Execute SQL</p>
                  <p className="text-sm text-muted-foreground">Paste the SQL script and run it</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={copySQL}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy SQL
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">4</div>
                <div>
                  <p className="font-medium">Mark as Complete</p>
                  <p className="text-sm text-muted-foreground">Return here when done</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={markCompleted}
                    disabled={isCompleted}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {isCompleted ? 'Completed' : 'Mark Complete'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SQL Script Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">SQL Migration Script</h3>
            <div className="flex gap-2">
              <Button onClick={copySQL} variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy Script
              </Button>
              <Button 
                onClick={() => setShowSQL(!showSQL)} 
                variant="outline" 
                size="sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                {showSQL ? 'Hide' : 'Show'} Script
              </Button>
            </div>
          </div>

          {showSQL && (
            <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {MANUAL_MIGRATION_SQL}
              </pre>
            </div>
          )}
        </div>

        {/* What This Creates */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">What This Migration Creates:</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm">LPO (Purchase Order) tables</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm">Tax calculation columns</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm">Auto-numbering functions</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm">Performance indexes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm">Update triggers</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm">Data relationships</span>
              </div>
            </div>
          </div>
        </div>

        {/* Success message */}
        {isCompleted && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>🎉 Great!</strong> Your database should now be ready. You can proceed with creating 
              the super admin user and using the system. If you encounter any issues, try refreshing the page.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
