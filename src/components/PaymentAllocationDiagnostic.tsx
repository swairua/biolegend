import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Copy,
  Play,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DiagnosticResult {
  tableExists: boolean;
  functionExists: boolean;
  rlsEnabled: boolean;
  rlsPolicies: any[];
  profileLinked: boolean;
  enumExists: boolean;
  testResults: any;
  errors: string[];
}

const PAYMENT_ALLOCATIONS_TABLE_SQL = `
-- Create payment_allocations table if it doesn't exist
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount_allocated DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);

-- Enable Row Level Security (RLS)
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Users can view allocations in their company" ON payment_allocations 
FOR SELECT USING (
    payment_id IN (
        SELECT id FROM payments WHERE company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
);

CREATE POLICY IF NOT EXISTS "Users can insert allocations in their company" ON payment_allocations 
FOR INSERT WITH CHECK (
    payment_id IN (
        SELECT id FROM payments WHERE company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
);

CREATE POLICY IF NOT EXISTS "Users can update allocations in their company" ON payment_allocations 
FOR UPDATE USING (
    payment_id IN (
        SELECT id FROM payments WHERE company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
);

CREATE POLICY IF NOT EXISTS "Users can delete allocations in their company" ON payment_allocations 
FOR DELETE USING (
    payment_id IN (
        SELECT id FROM payments WHERE company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
);
`;

const PAYMENT_FUNCTION_SQL = `
-- Fixed Database function to record payment and update invoice balance atomically
CREATE OR REPLACE FUNCTION record_payment_with_allocation(
    p_company_id UUID,
    p_customer_id UUID,
    p_invoice_id UUID,
    p_payment_number VARCHAR(50),
    p_payment_date DATE,
    p_amount DECIMAL(15,2),
    p_payment_method payment_method,
    p_reference_number VARCHAR(100),
    p_notes TEXT
) RETURNS JSON AS $$
DECLARE
    v_payment_id UUID;
    v_invoice_record RECORD;
BEGIN
    -- Validate invoice exists and get current balance
    SELECT id, total_amount, paid_amount, balance_due 
    INTO v_invoice_record
    FROM invoices 
    WHERE id = p_invoice_id AND company_id = p_company_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Invoice not found or does not belong to this company'
        );
    END IF;
    
    -- Validate payment amount
    IF p_amount = 0 THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Payment amount cannot be zero'
        );
    END IF;
    
    -- Insert payment record
    INSERT INTO payments (
        company_id, customer_id, payment_number, payment_date,
        amount, payment_method, reference_number, notes
    ) VALUES (
        p_company_id, p_customer_id, p_payment_number, p_payment_date,
        p_amount, p_payment_method, p_reference_number, p_notes
    ) RETURNING id INTO v_payment_id;
    
    -- Create payment allocation
    INSERT INTO payment_allocations (payment_id, invoice_id, amount_allocated)
    VALUES (v_payment_id, p_invoice_id, p_amount);
    
    -- Update invoice balance
    UPDATE invoices SET
        paid_amount = COALESCE(paid_amount, 0) + p_amount,
        balance_due = total_amount - (COALESCE(paid_amount, 0) + p_amount),
        updated_at = NOW()
    WHERE id = p_invoice_id;
    
    -- Update status if fully paid
    UPDATE invoices SET 
        status = CASE 
            WHEN balance_due <= 0 THEN 'paid'
            WHEN paid_amount > 0 THEN 'partial'
            ELSE status
        END
    WHERE id = p_invoice_id;
    
    RETURN json_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'invoice_id', p_invoice_id,
        'amount_allocated', p_amount
    );
    
EXCEPTION 
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;
`;

export function PaymentAllocationDiagnostic() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [copied, setCopied] = useState('');

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success(`${type} SQL copied to clipboard!`);
    setTimeout(() => setCopied(''), 2000);
  };

  const runFullDiagnostic = async () => {
    setIsRunning(true);
    const diagnosticResult: DiagnosticResult = {
      tableExists: false,
      functionExists: false,
      rlsEnabled: false,
      rlsPolicies: [],
      profileLinked: false,
      enumExists: false,
      testResults: null,
      errors: []
    };

    try {
      // 1. Check if payment_allocations table exists
      try {
        const { error: tableError } = await supabase
          .from('payment_allocations')
          .select('id')
          .limit(1);
        
        if (!tableError) {
          diagnosticResult.tableExists = true;
        } else if (tableError.message.includes('relation') && tableError.message.includes('does not exist')) {
          diagnosticResult.errors.push('payment_allocations table does not exist');
        } else {
          diagnosticResult.errors.push(`Table check error: ${tableError.message}`);
        }
      } catch (err: any) {
        diagnosticResult.errors.push(`Table existence check failed: ${err.message}`);
      }

      // 2. Check if user profile is linked to company
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();
          
          if (profile?.company_id) {
            diagnosticResult.profileLinked = true;
          } else {
            diagnosticResult.errors.push('User profile is not linked to a company (required for RLS)');
          }
        }
      } catch (err: any) {
        diagnosticResult.errors.push(`Profile check failed: ${err.message}`);
      }

      // 3. Check if database function exists
      try {
        const { data, error } = await supabase.rpc('record_payment_with_allocation', {
          p_company_id: '00000000-0000-0000-0000-000000000000',
          p_customer_id: '00000000-0000-0000-0000-000000000000',
          p_invoice_id: '00000000-0000-0000-0000-000000000000',
          p_payment_number: 'TEST',
          p_payment_date: '2024-01-01',
          p_amount: 1,
          p_payment_method: 'cash',
          p_reference_number: 'TEST',
          p_notes: 'TEST'
        });

        if (error) {
          if (error.code === 'PGRST202') {
            diagnosticResult.errors.push('Database function record_payment_with_allocation does not exist');
          } else if (error.message.includes('Invoice not found')) {
            // This is expected with dummy data - function exists
            diagnosticResult.functionExists = true;
          } else if (error.message.includes('payment_method_enum')) {
            diagnosticResult.errors.push('Database function has incorrect enum type (payment_method_enum instead of payment_method)');
          } else {
            diagnosticResult.errors.push(`Function test error: ${error.message}`);
          }
        } else {
          diagnosticResult.functionExists = true;
          diagnosticResult.testResults = data;
        }
      } catch (err: any) {
        diagnosticResult.errors.push(`Function check failed: ${err.message}`);
      }

      setResult(diagnosticResult);
      
    } catch (err: any) {
      diagnosticResult.errors.push(`Diagnostic failed: ${err.message}`);
      setResult(diagnosticResult);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusBadge = (status: boolean, label: string) => (
    <Badge variant="outline" className={status 
      ? 'bg-success-light text-success border-success/20' 
      : 'bg-destructive-light text-destructive border-destructive/20'
    }>
      {status ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-primary" />
          <span>Payment Allocation Diagnostic</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Button onClick={runFullDiagnostic} disabled={isRunning}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running Diagnostic...' : 'Run Full Diagnostic'}
          </Button>
        </div>

        {result && (
          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="table-setup">Table Setup</TabsTrigger>
              <TabsTrigger value="function-setup">Function Setup</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">System Status</h4>
                  <div className="space-y-2">
                    {getStatusBadge(result.tableExists, 'Table Exists')}
                    {getStatusBadge(result.functionExists, 'Function Exists')}
                    {getStatusBadge(result.profileLinked, 'Profile Linked')}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Issues Found</h4>
                  {result.errors.length === 0 ? (
                    <div className="flex items-center space-x-2 text-success">
                      <CheckCircle className="h-4 w-4" />
                      <span>No issues found</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {result.errors.map((error, index) => (
                        <Alert key={index} className="border-destructive/20 bg-destructive-light">
                          <XCircle className="h-4 w-4 text-destructive" />
                          <AlertDescription className="text-destructive text-sm">
                            {error}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="table-setup" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Payment Allocations Table Setup</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(PAYMENT_ALLOCATIONS_TABLE_SQL, 'Table')}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {copied === 'Table' ? 'Copied!' : 'Copy SQL'}
                  </Button>
                </div>
                <Textarea
                  value={PAYMENT_ALLOCATIONS_TABLE_SQL}
                  readOnly
                  className="font-mono text-sm h-64"
                />
                <Alert className="border-warning/20 bg-warning-light">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-warning text-sm">
                    Run this SQL in your Supabase SQL editor to create the payment_allocations table with proper RLS policies.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="function-setup" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Payment Function Setup</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(PAYMENT_FUNCTION_SQL, 'Function')}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {copied === 'Function' ? 'Copied!' : 'Copy SQL'}
                  </Button>
                </div>
                <Textarea
                  value={PAYMENT_FUNCTION_SQL}
                  readOnly
                  className="font-mono text-sm h-64"
                />
                <Alert className="border-warning/20 bg-warning-light">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-warning text-sm">
                    Run this SQL to create the corrected record_payment_with_allocation function with proper enum types.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
