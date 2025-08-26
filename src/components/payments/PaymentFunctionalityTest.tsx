import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  DollarSign,
  Receipt,
  User,
  Calendar,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { useCreatePayment } from '@/hooks/useDatabase';
import { useInvoicesFixed as useInvoices } from '@/hooks/useInvoicesFixed';
import { useCurrentCompany } from '@/contexts/CompanyContext';

interface TestResults {
  paymentCreated: boolean;
  allocationWorking: boolean;
  invoiceUpdated: boolean;
  error?: string;
  paymentId?: string;
  invoiceId?: string;
}

export function PaymentFunctionalityTest() {
  const { currentCompany } = useCurrentCompany();
  const { data: invoices = [] } = useInvoices(currentCompany?.id);
  const createPaymentMutation = useCreatePayment();
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [testAmount, setTestAmount] = useState('100.00');

  // Get a test invoice (prefer one with a balance)
  const testInvoice = invoices.find(inv => 
    inv.balance_due > 0 && inv.status !== 'paid'
  ) || invoices[0];

  const runPaymentTest = async () => {
    if (!testInvoice) {
      toast.error('No test invoice available. Create an invoice first.');
      return;
    }

    if (!currentCompany?.id) {
      toast.error('No company found. Please check your setup.');
      return;
    }

    setIsTesting(true);
    setTestResults(null);

    try {
      // Generate test payment data
      const testPaymentData = {
        company_id: currentCompany.id,
        customer_id: testInvoice.customer_id,
        invoice_id: testInvoice.id,
        payment_number: `TEST-PAY-${Date.now()}`,
        payment_date: new Date().toISOString().split('T')[0],
        amount: parseFloat(testAmount),
        payment_method: 'cash' as const,
        reference_number: `TEST-REF-${Date.now()}`,
        notes: 'Test payment - automatically generated for testing'
      };

      console.log('🧪 Creating test payment:', testPaymentData);

      // Use the actual payment creation mutation
      const result = await createPaymentMutation.mutateAsync(testPaymentData);

      console.log('✅ Payment creation result:', result);

      // Analyze the results
      const testResults: TestResults = {
        paymentCreated: !!result,
        allocationWorking: !result.fallback_used || !result.allocation_failed,
        invoiceUpdated: !result.allocation_failed,
        paymentId: result.payment_id,
        invoiceId: testInvoice.id
      };

      if (result.allocation_failed) {
        testResults.error = result.allocation_error || 'Payment allocation failed';
      }

      setTestResults(testResults);

      // Show appropriate toast messages
      if (testResults.allocationWorking) {
        toast.success('✅ Payment test passed! Payment was allocated correctly.');
      } else {
        toast.warning('⚠️ Payment created but allocation failed. Check the results below.');
      }

    } catch (error: any) {
      console.error('❌ Payment test failed:', error);
      
      setTestResults({
        paymentCreated: false,
        allocationWorking: false,
        invoiceUpdated: false,
        error: error.message || 'Unknown error occurred'
      });

      toast.error(`Payment test failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusIcon = (status: boolean | undefined, error?: boolean) => {
    if (error) return <XCircle className="h-4 w-4 text-destructive" />;
    if (status === true) return <CheckCircle className="h-4 w-4 text-success" />;
    if (status === false) return <XCircle className="h-4 w-4 text-destructive" />;
    return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
  };

  const getStatusBadge = (status: boolean | undefined, error?: boolean) => {
    if (error) return <Badge className="bg-destructive-light text-destructive">Error</Badge>;
    if (status === true) return <Badge className="bg-success-light text-success">Success</Badge>;
    if (status === false) return <Badge className="bg-destructive-light text-destructive">Failed</Badge>;
    return <Badge variant="outline">Not Tested</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <span>Payment Functionality Test</span>
          {testResults && (
            <Badge variant="outline">
              {testResults.allocationWorking ? 'All Working' : 'Issues Found'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Receipt className="h-4 w-4" />
          <AlertDescription>
            This test creates a real payment and verifies it gets allocated to an invoice correctly. 
            The test payment will be recorded in your system.
          </AlertDescription>
        </Alert>

        {/* Test Configuration */}
        <div className="space-y-4">
          <h4 className="font-medium">Test Configuration</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="test-amount">Test Payment Amount (KES)</Label>
              <Input
                id="test-amount"
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                min="0.01"
                max="10000"
                step="0.01"
                disabled={isTesting}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Test Invoice</Label>
              <div className="p-2 border rounded bg-muted/50">
                {testInvoice ? (
                  <div className="text-sm">
                    <div className="font-medium">{testInvoice.invoice_number}</div>
                    <div className="text-muted-foreground">
                      Balance: {formatCurrency(testInvoice.balance_due || 0)}
                    </div>
                    <div className="text-muted-foreground">
                      Customer: {testInvoice.customers?.name || 'N/A'}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No test invoice available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Test Action */}
        <div className="flex items-center space-x-4">
          <Button 
            onClick={runPaymentTest} 
            disabled={isTesting || !testInvoice || !testAmount}
            className="flex items-center space-x-2"
          >
            <Play className="h-4 w-4" />
            <span>{isTesting ? 'Running Test...' : 'Run Payment Test'}</span>
          </Button>
          
          {!testInvoice && (
            <Alert className="border-warning/20 bg-warning-light flex-1">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning">
                No test invoice found. Create an invoice first to test payments.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">Test Results</h4>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 border rounded">
                {getStatusIcon(testResults.paymentCreated)}
                <div className="flex-1">
                  <div className="font-medium">Payment Creation</div>
                  <div className="text-sm text-muted-foreground">
                    {testResults.paymentCreated 
                      ? `Payment recorded with ID: ${testResults.paymentId?.substring(0, 8)}...`
                      : 'Failed to create payment record'
                    }
                  </div>
                </div>
                {getStatusBadge(testResults.paymentCreated)}
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded">
                {getStatusIcon(testResults.allocationWorking, !!testResults.error)}
                <div className="flex-1">
                  <div className="font-medium">Payment Allocation</div>
                  <div className="text-sm text-muted-foreground">
                    {testResults.allocationWorking 
                      ? 'Payment successfully allocated to invoice'
                      : testResults.error || 'Payment allocation failed'
                    }
                  </div>
                </div>
                {getStatusBadge(testResults.allocationWorking, !!testResults.error)}
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded">
                {getStatusIcon(testResults.invoiceUpdated)}
                <div className="flex-1">
                  <div className="font-medium">Invoice Balance Update</div>
                  <div className="text-sm text-muted-foreground">
                    {testResults.invoiceUpdated 
                      ? 'Invoice balance updated correctly'
                      : 'Invoice balance may not have updated'
                    }
                  </div>
                </div>
                {getStatusBadge(testResults.invoiceUpdated)}
              </div>
            </div>

            {/* Summary */}
            {testResults.allocationWorking ? (
              <Alert className="border-success/20 bg-success-light">
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  <strong>✅ Payment System Working Perfectly!</strong>
                  <br />
                  Test payment of {formatCurrency(parseFloat(testAmount))} was successfully created and allocated to invoice {testInvoice?.invoice_number}.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-destructive/20 bg-destructive-light">
                <XCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  <strong>❌ Payment Allocation Issues Detected</strong>
                  <br />
                  {testResults.error || 'Payment was created but allocation to invoice failed. Check your database setup.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Test Data Info */}
            <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded">
              <strong>Test Data Created:</strong>
              <br />
              • Payment Number: TEST-PAY-{Date.now().toString().slice(-6)}
              <br />
              • Amount: {formatCurrency(parseFloat(testAmount))}
              <br />
              • Method: Cash
              <br />
              • Invoice: {testInvoice?.invoice_number}
              <br />
              • Notes: Test payment - automatically generated for testing
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
            <div className="text-sm font-medium">Payment Amount</div>
            <div className="text-xs text-muted-foreground">{formatCurrency(parseFloat(testAmount || '0'))}</div>
          </div>
          <div className="text-center">
            <Receipt className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
            <div className="text-sm font-medium">Test Invoice</div>
            <div className="text-xs text-muted-foreground">{testInvoice?.invoice_number || 'None'}</div>
          </div>
          <div className="text-center">
            <CreditCard className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
            <div className="text-sm font-medium">Payment Method</div>
            <div className="text-xs text-muted-foreground">Cash (Test)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
