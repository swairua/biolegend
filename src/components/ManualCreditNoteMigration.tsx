import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertCircle, 
  Database, 
  Copy, 
  ExternalLink,
  CheckCircle,
  FileText,
  ArrowRight
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export function ManualCreditNoteMigration() {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const migrationSteps = [
    {
      title: 'Create credit_notes table',
      sql: `CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    invoice_id UUID REFERENCES invoices(id), -- Optional reference to original invoice
    credit_note_number TEXT NOT NULL,
    credit_note_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'applied', 'cancelled')),
    reason TEXT, -- Reason for credit note (returns, discount, error correction, etc.)
    
    -- Financial fields
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    applied_amount DECIMAL(12,2) NOT NULL DEFAULT 0, -- Amount already applied to invoices
    balance DECIMAL(12,2) NOT NULL DEFAULT 0, -- Remaining credit balance
    
    -- Inventory control
    affects_inventory BOOLEAN NOT NULL DEFAULT false,
    
    -- Additional info
    notes TEXT,
    terms_and_conditions TEXT,
    
    -- Audit fields
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(company_id, credit_note_number)
);`
    },
    {
      title: 'Create credit_note_items table',
      sql: `CREATE TABLE IF NOT EXISTS credit_note_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id), -- Optional, can be null for custom items
    
    -- Item details
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Tax information
    tax_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_inclusive BOOLEAN NOT NULL DEFAULT false,
    tax_setting_id UUID, -- Reference to tax settings
    
    -- Totals
    line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`
    },
    {
      title: 'Create credit_note_allocations table',
      sql: `CREATE TABLE IF NOT EXISTS credit_note_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_id UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id), -- References invoices table
    allocated_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    
    -- Audit
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(credit_note_id, invoice_id)
);`
    },
    {
      title: 'Create indexes for performance',
      sql: `-- Indexes for credit_notes
CREATE INDEX IF NOT EXISTS idx_credit_notes_company_id ON credit_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_customer_id ON credit_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_date ON credit_notes(credit_note_date);
CREATE INDEX IF NOT EXISTS idx_credit_notes_status ON credit_notes(status);
CREATE INDEX IF NOT EXISTS idx_credit_notes_number ON credit_notes(credit_note_number);

-- Indexes for credit_note_items
CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note_id ON credit_note_items(credit_note_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_product_id ON credit_note_items(product_id);

-- Indexes for credit_note_allocations
CREATE INDEX IF NOT EXISTS idx_credit_note_allocations_credit_note_id ON credit_note_allocations(credit_note_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_allocations_invoice_id ON credit_note_allocations(invoice_id);`
    },
    {
      title: 'Create credit note number generation function',
      sql: `CREATE OR REPLACE FUNCTION generate_credit_note_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    formatted_number TEXT;
BEGIN
    -- Get the next number for this company
    SELECT COALESCE(MAX(CAST(SUBSTRING(credit_note_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM credit_notes
    WHERE company_id = company_uuid
    AND credit_note_number ~ '^CN[0-9]+$';
    
    -- Format the number with leading zeros
    formatted_number := 'CN' || LPAD(next_number::TEXT, 6, '0');
    
    RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;`
    },
    {
      title: 'Create credit note application function',
      sql: `CREATE OR REPLACE FUNCTION apply_credit_note_to_invoice(
    credit_note_uuid UUID,
    invoice_uuid UUID,
    amount_to_apply DECIMAL(12,2),
    applied_by_uuid UUID
)
RETURNS JSON AS $$
DECLARE
    credit_note_record RECORD;
    invoice_record RECORD;
    available_credit DECIMAL(12,2);
    result JSON;
BEGIN
    -- Get credit note details
    SELECT * INTO credit_note_record
    FROM credit_notes
    WHERE id = credit_note_uuid;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Credit note not found');
    END IF;
    
    -- Get invoice details (assuming invoices table exists)
    SELECT id, balance_due, paid_amount, total_amount INTO invoice_record
    FROM invoices
    WHERE id = invoice_uuid;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invoice not found');
    END IF;
    
    -- Calculate available credit
    available_credit := credit_note_record.total_amount - credit_note_record.applied_amount;
    
    -- Validate application amount
    IF amount_to_apply <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Application amount must be positive');
    END IF;
    
    IF amount_to_apply > available_credit THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient credit balance');
    END IF;
    
    IF amount_to_apply > invoice_record.balance_due THEN
        RETURN json_build_object('success', false, 'error', 'Amount exceeds invoice balance');
    END IF;
    
    -- Insert allocation record
    INSERT INTO credit_note_allocations (
        credit_note_id,
        invoice_id,
        allocated_amount,
        allocation_date,
        created_by
    ) VALUES (
        credit_note_uuid,
        invoice_uuid,
        amount_to_apply,
        CURRENT_DATE,
        applied_by_uuid
    )
    ON CONFLICT (credit_note_id, invoice_id)
    DO UPDATE SET
        allocated_amount = credit_note_allocations.allocated_amount + amount_to_apply,
        allocation_date = CURRENT_DATE;
    
    -- Update credit note applied amount and balance
    UPDATE credit_notes
    SET applied_amount = applied_amount + amount_to_apply,
        balance = total_amount - (applied_amount + amount_to_apply),
        status = CASE 
            WHEN (applied_amount + amount_to_apply) >= total_amount THEN 'applied'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = credit_note_uuid;
    
    -- Update invoice paid amount and balance
    UPDATE invoices
    SET paid_amount = paid_amount + amount_to_apply,
        balance_due = balance_due - amount_to_apply,
        updated_at = NOW()
    WHERE id = invoice_uuid;
    
    RETURN json_build_object(
        'success', true,
        'applied_amount', amount_to_apply,
        'remaining_credit', available_credit - amount_to_apply,
        'invoice_balance', invoice_record.balance_due - amount_to_apply
    );
END;
$$ LANGUAGE plpgsql;`
    },
    {
      title: 'Create update triggers',
      sql: `-- Create or update the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_credit_notes_updated_at ON credit_notes;
DROP TRIGGER IF EXISTS update_credit_note_items_updated_at ON credit_note_items;

-- Create new triggers
CREATE TRIGGER update_credit_notes_updated_at 
    BEFORE UPDATE ON credit_notes
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_credit_note_items_updated_at 
    BEFORE UPDATE ON credit_note_items
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();`
    }
  ];

  const copyToClipboard = async (text: string, stepIndex: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStep(stepIndex);
      toast.success('SQL copied to clipboard!');
      
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedStep(null), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const openSupabaseSQLEditor = () => {
    // This would need the actual Supabase project URL
    const supabaseUrl = 'https://klifzjcfnlaxminytmyh.supabase.co';
    const projectId = supabaseUrl.split('//')[1].split('.')[0];
    window.open(`https://supabase.com/dashboard/project/${projectId}/sql`, '_blank');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-primary" />
            <span>Credit Note Database Setup</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Manual Database Setup Required</strong><br />
              Your Supabase instance requires manual execution of SQL commands. 
              Please follow the steps below to set up the Credit Note functionality.
            </AlertDescription>
          </Alert>

          <div className="flex items-center space-x-4">
            <Button
              onClick={openSupabaseSQLEditor}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Supabase SQL Editor
            </Button>
            
            <Badge variant="outline" className="bg-warning-light text-warning border-warning/20">
              {migrationSteps.length} steps required
            </Badge>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center">
              <FileText className="h-4 w-4 mr-2 text-primary" />
              Instructions:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Click "Open Supabase SQL Editor" above to open your database console</li>
              <li>Copy each SQL block below (use the copy button)</li>
              <li>Paste and execute each block in the SQL Editor</li>
              <li>Execute them in order from Step 1 to Step {migrationSteps.length}</li>
              <li>Refresh this page after completing all steps</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Migration Steps */}
      <div className="space-y-4">
        {migrationSteps.map((step, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {index + 1}
                  </div>
                  <span className="text-lg">{step.title}</span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(step.sql, index)}
                  className="min-w-24"
                >
                  {copiedStep === index ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2 text-success" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy SQL
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={step.sql}
                readOnly
                className="h-48 font-mono text-sm"
                onClick={(e) => e.currentTarget.select()}
              />
              
              {index < migrationSteps.length - 1 && (
                <div className="mt-4 flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>After completing all steps:</strong><br />
              The Credit Note functionality will be fully operational. You'll be able to create, 
              manage, and apply credit notes to invoices. The system will automatically handle 
              number generation, inventory adjustments, and financial calculations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
