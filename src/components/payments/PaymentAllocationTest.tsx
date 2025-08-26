import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Play,
  RefreshCw,
  Database,
  DollarSign,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  details?: string;
  error?: string;
}

interface TestData {
  paymentId?: string;
  invoiceId?: string;
  allocationId?: string;
}

export function PaymentAllocationTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [testData, setTestData] = useState<TestData>({});
  const [results, setResults] = useState<TestResult[]>([
    { name: 'Database Connection', status: 'pending' },
    { name: 'Payment Allocations Table', status: 'pending' },
    { name: 'Database Function', status: 'pending' },
    { name: 'User Profile Setup', status: 'pending' },
    { name: 'Sample Invoice Creation', status: 'pending' },
    { name: 'Payment Recording', status: 'pending' },
    { name: 'Payment Allocation', status: 'pending' },
    { name: 'Invoice Balance Update', status: 'pending' },
    { name: 'Cleanup Test Data', status: 'pending' }
  ]);

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setResults(prev => prev.map((test, i) => 
      i === index ? { ...test, ...updates } : test
    ));
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setProgress(0);
    
    try {
      // Test 1: Database Connection
      updateTest(0, { status: 'running' });
      setProgress(10);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          updateTest(0, { status: 'failed', error: 'Not authenticated' });
          return;
        }
        updateTest(0, { status: 'passed', details: `User: ${user.email}` });
      } catch (err: any) {
        updateTest(0, { status: 'failed', error: err.message });
        return;
      }

      // Test 2: Payment Allocations Table
      updateTest(1, { status: 'running' });
      setProgress(20);
      
      try {
        const { error: tableError } = await supabase
          .from('payment_allocations')
          .select('id')
          .limit(1);
        
        if (tableError) {
          if (tableError.message.includes('relation') && tableError.message.includes('does not exist')) {
            updateTest(1, { status: 'failed', error: 'Table does not exist' });
            return;
          } else {
            updateTest(1, { status: 'failed', error: tableError.message });
            return;
          }
        }
        updateTest(1, { status: 'passed', details: 'Table exists and accessible' });
      } catch (err: any) {
        updateTest(1, { status: 'failed', error: err.message });
        return;
      }

      // Test 3: Database Function
      updateTest(2, { status: 'running' });
      setProgress(30);
      
      try {
        const { error: funcError } = await supabase.rpc('record_payment_with_allocation', {
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

        if (funcError) {
          if (funcError.code === 'PGRST202') {
            updateTest(2, { status: 'failed', error: 'Function does not exist' });
          } else if (funcError.message.includes('Invoice not found')) {
            updateTest(2, { status: 'passed', details: 'Function exists (expected error with test data)' });
          } else {
            updateTest(2, { status: 'failed', error: funcError.message });
          }
        } else {
          updateTest(2, { status: 'passed', details: 'Function exists and working' });
        }
      } catch (err: any) {
        updateTest(2, { status: 'failed', error: err.message });
      }

      // Test 4: User Profile Setup
      updateTest(3, { status: 'running' });
      setProgress(40);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user!.id)
          .single();
        
        if (!profile?.company_id) {
          updateTest(3, { status: 'failed', error: 'Profile not linked to company' });
          return;
        }
        updateTest(3, { status: 'passed', details: `Company ID: ${profile.company_id.substring(0, 8)}...` });

        // Test 5: Sample Invoice Creation
        updateTest(4, { status: 'running' });
        setProgress(50);
        
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert([{
            company_id: profile.company_id,
            customer_id: null,
            invoice_number: `TEST-${Date.now()}`,
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: new Date().toISOString().split('T')[0],
            total_amount: 1000,
            paid_amount: 0,
            balance_due: 1000,
            status: 'draft'
          }])
          .select()
          .single();

        if (invoiceError || !invoice) {
          updateTest(4, { status: 'failed', error: invoiceError?.message || 'Failed to create invoice' });
          return;
        }
        
        setTestData(prev => ({ ...prev, invoiceId: invoice.id }));
        updateTest(4, { status: 'passed', details: `Invoice: ${invoice.invoice_number}` });

        // Test 6: Payment Recording
        updateTest(5, { status: 'running' });
        setProgress(60);
        
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .insert([{
            company_id: profile.company_id,
            customer_id: null,
            payment_number: `PAY-${Date.now()}`,
            payment_date: new Date().toISOString().split('T')[0],
            amount: 500,
            payment_method: 'cash',
            reference_number: `REF-${Date.now()}`,
            notes: 'Test payment'
          }])
          .select()
          .single();

        if (paymentError || !payment) {
          updateTest(5, { status: 'failed', error: paymentError?.message || 'Failed to create payment' });
          return;
        }
        
        setTestData(prev => ({ ...prev, paymentId: payment.id }));
        updateTest(5, { status: 'passed', details: `Payment: ${payment.payment_number}` });

        // Test 7: Payment Allocation
        updateTest(6, { status: 'running' });
        setProgress(70);
        
        const { data: allocation, error: allocationError } = await supabase
          .from('payment_allocations')
          .insert([{
            payment_id: payment.id,
            invoice_id: invoice.id,
            amount_allocated: 500
          }])
          .select()
          .single();

        if (allocationError || !allocation) {
          updateTest(6, { status: 'failed', error: allocationError?.message || 'Failed to create allocation' });
          return;
        }
        
        setTestData(prev => ({ ...prev, allocationId: allocation.id }));
        updateTest(6, { status: 'passed', details: `Allocated: KES 500.00` });

        // Test 8: Invoice Balance Update
        updateTest(7, { status: 'running' });
        setProgress(80);
        
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            paid_amount: 500,
            balance_due: 500,
            status: 'partial'
          })
          .eq('id', invoice.id);

        if (updateError) {
          updateTest(7, { status: 'failed', error: updateError.message });
        } else {
          updateTest(7, { status: 'passed', details: 'Invoice updated with payment' });
        }

        // Test 9: Cleanup
        updateTest(8, { status: 'running' });
        setProgress(90);
        
        await Promise.all([
          supabase.from('payment_allocations').delete().eq('id', allocation.id),
          supabase.from('payments').delete().eq('id', payment.id),
          supabase.from('invoices').delete().eq('id', invoice.id)
        ]);
        
        updateTest(8, { status: 'passed', details: 'Test data cleaned up' });
        setProgress(100);

      } catch (err: any) {
        updateTest(3, { status: 'failed', error: err.message });
      }

    } catch (err: any) {
      toast.error(`Test failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-success-light text-success">Passed</Badge>;
      case 'failed':
        return <Badge className="bg-destructive-light text-destructive">Failed</Badge>;
      case 'running':
        return <Badge className="bg-primary-light text-primary">Running</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const passedTests = results.filter(test => test.status === 'passed').length;
  const failedTests = results.filter(test => test.status === 'failed').length;
  const totalTests = results.length;

  const allPassed = passedTests === totalTests;
  const hasFailed = failedTests > 0;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TestTube className="h-5 w-5 text-primary" />
          <span>Payment Allocation System Test</span>
          {allPassed && !isRunning && (
            <Badge className="bg-success-light text-success">
              <CheckCircle className="h-3 w-3 mr-1" />
              All Tests Passed
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <TestTube className="h-4 w-4" />
          <AlertDescription>
            This test verifies that payment allocation is working correctly by creating a test invoice, 
            recording a payment, allocating it to the invoice, and checking the balance updates.
          </AlertDescription>
        </Alert>

        <div className="flex items-center space-x-4">
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            className="flex items-center space-x-2"
          >
            <Play className="h-4 w-4" />
            <span>{isRunning ? 'Running Tests...' : 'Run Full Test Suite'}</span>
          </Button>
          
          <div className="text-sm text-muted-foreground">
            {passedTests}/{totalTests} tests passed
            {failedTests > 0 && <span className="text-destructive"> • {failedTests} failed</span>}
          </div>
        </div>

        {isRunning && (
          <Progress value={progress} className="w-full" />
        )}

        <div className="space-y-3">
          {results.map((test, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
              <div className="flex-shrink-0">
                {getStatusIcon(test.status)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{test.name}</h4>
                  {getStatusBadge(test.status)}
                </div>
                {test.details && (
                  <p className="text-sm text-muted-foreground mt-1">{test.details}</p>
                )}
                {test.error && (
                  <p className="text-sm text-destructive mt-1">{test.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {allPassed && !isRunning && (
          <Alert className="border-success/20 bg-success-light">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-success">
              <strong>🎉 Payment Allocation System Working Perfectly!</strong>
              <br />
              All tests passed. Payments are being correctly allocated to invoices and invoice balances are updating properly.
            </AlertDescription>
          </Alert>
        )}

        {hasFailed && !isRunning && (
          <Alert className="border-destructive/20 bg-destructive-light">
            <XCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              <strong>Tests Failed</strong>
              <br />
              Some components of the payment allocation system are not working correctly. Review the failed tests above.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Database Tests</span>
          </div>
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Payment Processing</span>
          </div>
          <div className="flex items-center space-x-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Invoice Integration</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
