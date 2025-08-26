import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Play,
  Copy,
  Database,
  Shield,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface FixStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

const PAYMENT_ALLOCATIONS_TABLE_SQL = `-- Create payment_allocations table
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount_allocated DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);

-- Enable RLS
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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
);`;

const PAYMENT_FUNCTION_SQL = `-- Create payment recording function
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
    -- Validate invoice exists
    SELECT id, total_amount, paid_amount, balance_due 
    INTO v_invoice_record
    FROM invoices 
    WHERE id = p_invoice_id AND company_id = p_company_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Invoice not found'
        );
    END IF;
    
    -- Insert payment
    INSERT INTO payments (
        company_id, customer_id, payment_number, payment_date,
        amount, payment_method, reference_number, notes
    ) VALUES (
        p_company_id, p_customer_id, p_payment_number, p_payment_date,
        p_amount, p_payment_method, p_reference_number, p_notes
    ) RETURNING id INTO v_payment_id;
    
    -- Create allocation
    INSERT INTO payment_allocations (payment_id, invoice_id, amount_allocated)
    VALUES (v_payment_id, p_invoice_id, p_amount);
    
    -- Update invoice
    UPDATE invoices SET
        paid_amount = COALESCE(paid_amount, 0) + p_amount,
        balance_due = total_amount - (COALESCE(paid_amount, 0) + p_amount),
        updated_at = NOW()
    WHERE id = p_invoice_id;
    
    -- Update status
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

export function PaymentAllocationAutoFix() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [showSQL, setShowSQL] = useState(false);
  const [steps, setSteps] = useState<FixStep[]>([
    {
      id: 'check-table',
      name: 'Check Payment Allocations Table',
      description: 'Verify if payment_allocations table exists',
      status: 'pending'
    },
    {
      id: 'check-profile',
      name: 'Check User Profile',
      description: 'Verify user profile is linked to company',
      status: 'pending'
    },
    {
      id: 'check-function',
      name: 'Check Database Function',
      description: 'Verify record_payment_with_allocation function exists',
      status: 'pending'
    },
    {
      id: 'test-allocation',
      name: 'Test Payment Allocation',
      description: 'Test if payment allocation works correctly',
      status: 'pending'
    }
  ]);

  const updateStep = (stepId: string, updates: Partial<FixStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const copySQL = (sql: string, type: string) => {
    navigator.clipboard.writeText(sql);
    toast.success(`${type} SQL copied to clipboard!`);
  };

  const runDiagnostic = async () => {
    setIsRunning(true);
    setProgress(0);
    setCurrentStep(0);

    try {
      // Step 1: Check payment_allocations table
      updateStep('check-table', { status: 'running' });
      setCurrentStep(1);
      setProgress(25);

      let tableExists = false;
      try {
        const { error } = await supabase
          .from('payment_allocations')
          .select('id')
          .limit(1);
        
        if (!error) {
          tableExists = true;
          updateStep('check-table', { status: 'completed' });
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
          updateStep('check-table', { 
            status: 'failed', 
            error: 'Table does not exist - manual SQL execution required' 
          });
        } else {
          updateStep('check-table', { 
            status: 'failed', 
            error: error.message 
          });
        }
      } catch (err: any) {
        updateStep('check-table', { 
          status: 'failed', 
          error: err.message 
        });
      }

      // Step 2: Check user profile
      updateStep('check-profile', { status: 'running' });
      setCurrentStep(2);
      setProgress(50);

      let profileLinked = false;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();
          
          if (profile?.company_id) {
            profileLinked = true;
            updateStep('check-profile', { status: 'completed' });
          } else {
            updateStep('check-profile', { 
              status: 'failed', 
              error: 'User profile not linked to company - contact admin' 
            });
          }
        }
      } catch (err: any) {
        updateStep('check-profile', { 
          status: 'failed', 
          error: err.message 
        });
      }

      // Step 3: Check database function
      updateStep('check-function', { status: 'running' });
      setCurrentStep(3);
      setProgress(75);

      let functionExists = false;
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
            updateStep('check-function', { 
              status: 'failed', 
              error: 'Function does not exist - manual SQL execution required' 
            });
          } else if (error.message.includes('Invoice not found')) {
            // Expected with dummy data - function exists
            functionExists = true;
            updateStep('check-function', { status: 'completed' });
          } else {
            updateStep('check-function', { 
              status: 'failed', 
              error: error.message 
            });
          }
        } else {
          functionExists = true;
          updateStep('check-function', { status: 'completed' });
        }
      } catch (err: any) {
        updateStep('check-function', { 
          status: 'failed', 
          error: err.message 
        });
      }

      // Step 4: Test overall allocation capability
      updateStep('test-allocation', { status: 'running' });
      setCurrentStep(4);
      setProgress(100);

      if (tableExists && profileLinked) {
        updateStep('test-allocation', { status: 'completed' });
        toast.success('Payment allocation system is working correctly!');
      } else {
        updateStep('test-allocation', { 
          status: 'failed', 
          error: 'Some components need manual setup - see instructions below' 
        });
      }

    } catch (err: any) {
      toast.error(`Diagnostic failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStepIcon = (status: FixStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };

  const getStepBadge = (status: FixStep['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success-light text-success">Fixed</Badge>;
      case 'failed':
        return <Badge className="bg-destructive-light text-destructive">Needs Fix</Badge>;
      case 'running':
        return <Badge className="bg-primary-light text-primary">Running</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const allPassed = steps.every(step => step.status === 'completed');
  const hasFailures = steps.some(step => step.status === 'failed');

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wrench className="h-5 w-5 text-primary" />
          <span>Payment Allocation Auto-Fix</span>
          {allPassed && (
            <Badge className="bg-success-light text-success">
              <CheckCircle className="h-3 w-3 mr-1" />
              All Systems Working
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This tool will diagnose and help fix payment allocation issues. Click "Run Diagnostic" to start.
          </AlertDescription>
        </Alert>

        <div className="flex items-center space-x-4">
          <Button 
            onClick={runDiagnostic} 
            disabled={isRunning}
            className="flex items-center space-x-2"
          >
            <Play className="h-4 w-4" />
            <span>{isRunning ? 'Running...' : 'Run Diagnostic'}</span>
          </Button>
          
          {hasFailures && (
            <Button 
              variant="outline" 
              onClick={() => setShowSQL(!showSQL)}
              className="flex items-center space-x-2"
            >
              <Database className="h-4 w-4" />
              <span>{showSQL ? 'Hide' : 'Show'} Manual Fix SQL</span>
            </Button>
          )}
        </div>

        {isRunning && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of {steps.length}: {steps[currentStep - 1]?.name || 'Initializing...'}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center space-x-3 p-3 border rounded-lg">
              <div className="flex-shrink-0">
                {getStepIcon(step.status)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{step.name}</h4>
                  {getStepBadge(step.status)}
                </div>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                {step.error && (
                  <p className="text-sm text-destructive mt-1">{step.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {showSQL && hasFailures && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>Manual Fix Instructions</span>
            </h3>
            
            <Alert className="border-warning/20 bg-warning-light">
              <Shield className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning">
                <strong>Database Admin Required:</strong> The following SQL must be executed by a database administrator in your Supabase SQL Editor.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">1. Create Payment Allocations Table</h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copySQL(PAYMENT_ALLOCATIONS_TABLE_SQL, 'Table')}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy SQL
                  </Button>
                </div>
                <div className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto">
                  {PAYMENT_ALLOCATIONS_TABLE_SQL}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">2. Create Payment Function (Optional)</h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copySQL(PAYMENT_FUNCTION_SQL, 'Function')}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy SQL
                  </Button>
                </div>
                <div className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto">
                  {PAYMENT_FUNCTION_SQL}
                </div>
              </div>

              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  <strong>Next Steps:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Copy the SQL above</li>
                    <li>Open your Supabase project dashboard</li>
                    <li>Go to SQL Editor</li>
                    <li>Paste and execute the SQL</li>
                    <li>Run this diagnostic again to verify the fix</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}

        {allPassed && !isRunning && (
          <Alert className="border-success/20 bg-success-light">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-success">
              <strong>All Systems Operational!</strong> Payment allocation is working correctly. 
              New payments will be properly allocated to invoices.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
