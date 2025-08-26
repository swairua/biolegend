import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  FileText, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from '@/contexts/CompanyContext';

export function TestInvoiceCreator() {
  const { currentCompany } = useCurrentCompany();
  const [isCreating, setIsCreating] = useState(false);
  const [testAmount, setTestAmount] = useState('1000.00');
  const [customerName, setCustomerName] = useState('Test Customer');

  const createTestInvoice = async () => {
    if (!currentCompany?.id) {
      toast.error('No company found. Please check your setup.');
      return;
    }

    setIsCreating(true);

    try {
      // Generate test invoice data
      const invoiceNumber = `TEST-INV-${Date.now()}`;
      const testInvoiceData = {
        company_id: currentCompany.id,
        customer_id: null, // No specific customer for test
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        total_amount: parseFloat(testAmount),
        paid_amount: 0,
        balance_due: parseFloat(testAmount),
        status: 'pending',
        notes: 'Test invoice - automatically generated for payment testing',
        currency: 'KES'
      };

      console.log('📋 Creating test invoice:', testInvoiceData);

      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert([testInvoiceData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Test invoice created:', invoice);

      toast.success(`Test invoice ${invoiceNumber} created successfully!`, {
        description: `Amount: KES ${testAmount} • Now you can test payments`
      });

      // Reset form
      setTestAmount('1000.00');
      setCustomerName('Test Customer');

    } catch (error: any) {
      console.error('❌ Failed to create test invoice:', error);
      toast.error(`Failed to create test invoice: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const formatCurrency = (amount: string) => {
    try {
      return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(parseFloat(amount));
    } catch {
      return `KES ${amount}`;
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-primary" />
          <span>Test Invoice Creator</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Create a test invoice to use for payment testing. This invoice will be added to your system.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="invoice-amount">Invoice Amount (KES)</Label>
            <Input
              id="invoice-amount"
              type="number"
              value={testAmount}
              onChange={(e) => setTestAmount(e.target.value)}
              min="0.01"
              max="100000"
              step="0.01"
              disabled={isCreating}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customer-name">Customer Name</Label>
            <Input
              id="customer-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={isCreating}
              placeholder="Test Customer"
            />
          </div>
        </div>

        <div className="p-3 bg-muted/50 rounded">
          <h4 className="font-medium mb-2">Test Invoice Preview</h4>
          <div className="text-sm space-y-1">
            <div>Invoice Number: TEST-INV-{Date.now().toString().slice(-6)}</div>
            <div>Amount: {formatCurrency(testAmount)}</div>
            <div>Customer: {customerName}</div>
            <div>Status: Pending Payment</div>
            <div>Due Date: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
          </div>
        </div>

        <Button 
          onClick={createTestInvoice} 
          disabled={isCreating || !testAmount || parseFloat(testAmount) <= 0}
          className="w-full flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>{isCreating ? 'Creating Test Invoice...' : 'Create Test Invoice'}</span>
        </Button>

        <Alert className="border-success/20 bg-success-light">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            <strong>Pro Tip:</strong> After creating a test invoice, you can use the Payment Functionality Test above to verify that payments are properly allocated to invoices.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
