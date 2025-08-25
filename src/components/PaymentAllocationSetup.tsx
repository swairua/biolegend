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

  const applyDatabaseFunction = async () => {
    setIsApplying(true);
    setError(null);

    try {
      // Create the database function
      const { error: functionError } = await supabase.rpc('exec_sql', {
        sql: `
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
            v_result JSON;
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
            
            -- 7. Return success with updated values
            SELECT 
                id, total_amount, paid_amount, balance_due
            INTO v_invoice_record
            FROM invoices 
            WHERE id = p_invoice_id;
            
            RETURN json_build_object(
                'success', true,
                'payment_id', v_payment_id,
                'invoice_id', p_invoice_id,
                'amount_allocated', p_amount,
                'new_paid_amount', v_invoice_record.paid_amount,
                'new_balance_due', v_invoice_record.balance_due
            );
            
        EXCEPTION 
            WHEN OTHERS THEN
                RETURN json_build_object(
                    'success', false,
                    'error', SQLERRM
                );
        END;
        $$ LANGUAGE plpgsql;
        `
      });

      if (functionError) {
        throw functionError;
      }

      // Test the function exists
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
      if (testError && !testError.message?.includes('Invoice not found')) {
        throw testError;
      }

      setSetupComplete(true);
      toast.success('Payment allocation system set up successfully!');
    } catch (err: any) {
      console.error('Setup error:', err);
      setError(err.message || 'Failed to set up payment allocation system');
      toast.error('Setup failed. Check console for details.');
    } finally {
      setIsApplying(false);
    }
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

        <Button 
          onClick={applyDatabaseFunction}
          disabled={isApplying}
          className="w-full"
        >
          {isApplying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Setting up payment allocation system...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Set Up Payment Allocation System
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
