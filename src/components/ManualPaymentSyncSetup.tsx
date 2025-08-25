import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Copy, Database, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const PAYMENT_SYNC_SQL = `-- Manual database function creation for payment-invoice synchronization
-- Run this SQL in your database admin panel (Supabase SQL Editor, pgAdmin, etc.)

CREATE OR REPLACE FUNCTION record_payment_with_allocation(
    p_company_id UUID,
    p_customer_id UUID,
    p_invoice_id UUID,
    p_payment_number VARCHAR(50),
    p_payment_date DATE,
    p_amount DECIMAL(15,2),
    p_payment_method payment_method_enum,
    p_reference_number VARCHAR(100),
    p_notes TEXT
) RETURNS JSON AS $$
DECLARE
    v_payment_id UUID;
    v_invoice_record RECORD;
BEGIN
    -- 1. Validate invoice exists and get current balance
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
    
    -- 2. Validate payment amount
    IF p_amount = 0 THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Payment amount cannot be zero'
        );
    END IF;
    
    -- 3. Insert payment record
    INSERT INTO payments (
        company_id,
        customer_id,
        payment_number,
        payment_date,
        amount,
        payment_method,
        reference_number,
        notes
    ) VALUES (
        p_company_id,
        p_customer_id,
        p_payment_number,
        p_payment_date,
        p_amount,
        p_payment_method,
        p_reference_number,
        p_notes
    ) RETURNING id INTO v_payment_id;
    
    -- 4. Create payment allocation
    INSERT INTO payment_allocations (
        payment_id,
        invoice_id,
        amount_allocated
    ) VALUES (
        v_payment_id,
        p_invoice_id,
        p_amount
    );
    
    -- 5. Update invoice balance
    UPDATE invoices SET
        paid_amount = COALESCE(paid_amount, 0) + p_amount,
        balance_due = total_amount - (COALESCE(paid_amount, 0) + p_amount),
        updated_at = NOW()
    WHERE id = p_invoice_id;
    
    -- 6. Update invoice status based on balance
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
$$ LANGUAGE plpgsql;`;

export function ManualPaymentSyncSetup() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(PAYMENT_SYNC_SQL);
    setCopied(true);
    toast.success('SQL copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-5 w-5" />
          Database Function Missing
          <Badge variant="outline" className="text-warning border-warning">
            Manual Setup Required
          </Badge>
        </CardTitle>
        <CardDescription>
          The payment synchronization function is not found in your database. Follow these steps to create it manually.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-info/50 bg-info/5">
          <Database className="h-4 w-4" />
          <AlertDescription>
            <strong>Current Status:</strong> Payment recording is working with a fallback method, but for optimal 
            performance and data consistency, please create the database function manually.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">How to create the function:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Copy the SQL code below</li>
              <li>Open your database admin panel (Supabase SQL Editor, pgAdmin, etc.)</li>
              <li>Paste and execute the SQL</li>
              <li>Refresh this page to verify the function works</li>
            </ol>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">SQL Code:</h4>
              <Button 
                onClick={copyToClipboard}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy SQL'}
              </Button>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                {PAYMENT_SYNC_SQL}
              </pre>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Database Access Links:</h4>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-3 w-3" />
                Supabase Dashboard
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('https://supabase.com/dashboard/project/_/sql', '_blank')}
                className="flex items-center gap-2"
              >
                <Database className="h-3 w-3" />
                Supabase SQL Editor
              </Button>
            </div>
          </div>
        </div>

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Good News:</strong> Payments are still working! The fallback method ensures payments 
            are recorded and invoice balances update correctly, just without the optimized database function.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
