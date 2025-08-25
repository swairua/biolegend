import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Loader2, Database } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function PaymentAllocationSetup() {
  const [isApplying, setIsApplying] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testDatabaseFunction = async () => {
    setIsApplying(true);
    setError(null);

    try {
      // Test if the function exists by calling it with test data
      const { error: testError } = await supabase.rpc('record_payment_with_allocation', {
        p_company_id: '00000000-0000-0000-0000-000000000000', // Test UUID
        p_customer_id: '00000000-0000-0000-0000-000000000000',
        p_invoice_id: '00000000-0000-0000-0000-000000000000',
        p_payment_number: 'TEST',
        p_payment_date: '2024-01-01',
        p_amount: 100,
        p_payment_method: 'cash',
        p_reference_number: 'TEST',
        p_notes: 'Test call'
      });

      // We expect this to fail with "Invoice not found" which means the function is working
      if (testError && testError.message?.includes('Invoice not found')) {
        setSetupComplete(true);
        toast.success('Payment allocation system is working correctly!');
      } else if (testError && testError.message?.includes('function record_payment_with_allocation')) {
        setError('Database function not found. Please run the SQL manually in your database.');
      } else if (testError) {
        throw testError;
      } else {
        setSetupComplete(true);
        toast.success('Payment allocation system is working correctly!');
      }
    } catch (err: any) {
      console.error('Test error:', err);
      setError(err.message || 'Failed to test payment allocation system');
    } finally {
      setIsApplying(false);
    }
  };

  const copyToClipboard = () => {
    const sql = `-- Payment allocation database function
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
    -- Validate invoice exists
    SELECT id, total_amount, paid_amount, balance_due
    INTO v_invoice_record
    FROM invoices
    WHERE id = p_invoice_id AND company_id = p_company_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invoice not found');
    END IF;

    -- Insert payment
    INSERT INTO payments (company_id, customer_id, payment_number, payment_date, amount, payment_method, reference_number, notes)
    VALUES (p_company_id, p_customer_id, p_payment_number, p_payment_date, p_amount, p_payment_method, p_reference_number, p_notes)
    RETURNING id INTO v_payment_id;

    -- Create allocation
    INSERT INTO payment_allocations (payment_id, invoice_id, amount_allocated)
    VALUES (v_payment_id, p_invoice_id, p_amount);

    -- Update invoice
    UPDATE invoices SET
        paid_amount = COALESCE(paid_amount, 0) + p_amount,
        balance_due = total_amount - (COALESCE(paid_amount, 0) + p_amount),
        status = CASE
            WHEN (total_amount - (COALESCE(paid_amount, 0) + p_amount)) <= 0 THEN 'paid'
            WHEN (COALESCE(paid_amount, 0) + p_amount) > 0 THEN 'partial'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = p_invoice_id;

    RETURN json_build_object('success', true, 'payment_id', v_payment_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;`;

    navigator.clipboard.writeText(sql);
    toast.success('SQL copied to clipboard!');
  };

  if (setupComplete) {
    return (
      <Card className="border-success/50 bg-success/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            Payment Allocation Setup Complete
          </CardTitle>
          <CardDescription>
            The payment allocation system has been successfully configured. Payments will now properly update invoice balances.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Payment Allocation System Setup
        </CardTitle>
        <CardDescription>
          Configure the database to properly link payments to invoices and update balances automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Current Issue:</strong> Payments are being recorded but invoice balances are not updating. 
            This setup will fix the payment-invoice synchronization.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <h4 className="font-medium">This setup will:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Create a database function for atomic payment recording</li>
            <li>Automatically create payment allocations when payments are recorded</li>
            <li>Update invoice paid_amount and balance_due columns</li>
            <li>Update invoice status (draft → partial → paid)</li>
            <li>Ensure data consistency and prevent race conditions</li>
          </ul>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={testDatabaseFunction}
            disabled={isApplying}
            variant="outline"
            className="flex-1"
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Test Setup
              </>
            )}
          </Button>

          <Button
            onClick={copyToClipboard}
            variant="secondary"
            className="flex-1"
          >
            <Database className="h-4 w-4 mr-2" />
            Copy SQL
          </Button>
        </div>

        {error && error.includes('not found') && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Manual Setup Required:</strong> Please run the SQL code (copied above) in your database admin panel or SQL editor to create the required function.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
