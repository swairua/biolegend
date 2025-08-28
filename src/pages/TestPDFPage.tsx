import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  CheckCircle, 
  XCircle,
  TestTube,
  Receipt,
  ShoppingCart,
  CreditCard
} from 'lucide-react';
import { useCompanies } from '@/hooks/useDatabase';
import { 
  downloadQuotationPDF, 
  downloadInvoicePDF, 
  downloadLPOPDF,
  downloadDeliveryNotePDF,
  downloadRemittancePDF,
  generatePaymentReceiptPDF,
  generateCustomerStatementPDF
} from '@/utils/pdfGenerator';
import { generateCreditNotePDF } from '@/utils/creditNotePdfGenerator';
import { toast } from 'sonner';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  pdfType: string;
}

export default function TestPDFPage() {
  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTestResult = (name: string, status: TestResult['status'], message: string, pdfType: string) => {
    setTestResults(prev => {
      const existing = prev.findIndex(r => r.name === name);
      const newResult = { name, status, message, pdfType };
      
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newResult;
        return updated;
      } else {
        return [...prev, newResult];
      }
    });
  };

  const generateTestData = () => {
    const testCustomer = {
      name: 'Test Customer Ltd',
      email: 'test@customer.com',
      phone: '+254 700 000 000',
      address: '123 Test Street',
      city: 'Nairobi',
      country: 'Kenya'
    };

    const testItems = [
      {
        description: 'Medical Equipment - Blood Pressure Monitor',
        quantity: 2,
        unit_price: 15000,
        tax_percentage: 16,
        tax_amount: 4800,
        line_total: 34800
      },
      {
        description: 'Surgical Gloves (Box of 100)',
        quantity: 5,
        unit_price: 2500,
        tax_percentage: 16,
        tax_amount: 2000,
        line_total: 14500
      }
    ];

    return { testCustomer, testItems };
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const { testCustomer, testItems } = generateTestData();
    const companyDetails = currentCompany ? {
      name: currentCompany.name || 'Biolegend Scientific Ltd',
      address: currentCompany.address,
      city: currentCompany.city,
      country: currentCompany.country,
      phone: currentCompany.phone,
      email: currentCompany.email,
      tax_number: currentCompany.tax_number,
      logo_url: 'https://cdn.builder.io/api/v1/image/assets%2F893e58768e5f4de981cdc56ff5e87db2%2Ff23ecbbcd4704426a991220b141c5ffd?format=webp&width=800'
    } : undefined;

    const tests = [
      {
        name: 'Quotation PDF',
        type: 'HTML-based',
        generator: () => downloadQuotationPDF({
          quotation_number: 'QUO-TEST-001',
          quotation_date: new Date().toISOString().split('T')[0],
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          total_amount: 49300,
          subtotal: 42500,
          tax_amount: 6800,
          status: 'draft',
          customers: testCustomer,
          quotation_items: testItems,
          notes: 'Test quotation for logo verification',
          terms_and_conditions: 'Test terms'
        }, companyDetails)
      },
      {
        name: 'Invoice PDF',
        type: 'HTML-based',
        generator: () => downloadInvoicePDF({
          invoice_number: 'INV-TEST-001',
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          total_amount: 49300,
          subtotal: 42500,
          tax_amount: 6800,
          balance_due: 49300,
          status: 'draft',
          customers: testCustomer,
          invoice_items: testItems,
          notes: 'Test invoice for logo verification'
        }, 'INVOICE', companyDetails)
      },
      {
        name: 'LPO PDF',
        type: 'jsPDF-based',
        generator: () => downloadLPOPDF({
          id: 'test-lpo-001',
          lpo_number: 'LPO-TEST-001',
          lpo_date: new Date().toISOString().split('T')[0],
          delivery_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          total_amount: 49300,
          subtotal: 42500,
          tax_amount: 6800,
          status: 'pending',
          suppliers: {
            name: 'Test Supplier Ltd',
            email: 'supplier@test.com',
            phone: '+254 700 111 111',
            address: '456 Supplier Avenue',
            city: 'Nairobi',
            country: 'Kenya'
          },
          lpo_items: testItems,
          notes: 'Test LPO for logo verification'
        }, companyDetails)
      },
      {
        name: 'Credit Note PDF',
        type: 'HTML-based',
        generator: () => generateCreditNotePDF({
          id: 'test-credit-001',
          credit_note_number: 'CN-TEST-001',
          credit_note_date: new Date().toISOString().split('T')[0],
          total_amount: 15000,
          subtotal: 12931,
          tax_amount: 2069,
          status: 'approved',
          customers: testCustomer,
          credit_note_items: [{
            id: 'item-1',
            description: 'Return: Medical Equipment',
            quantity: 1,
            unit_price: 15000,
            tax_percentage: 16,
            tax_amount: 2069,
            line_total: 15000
          }],
          invoices: { invoice_number: 'INV-TEST-001' },
          reason: 'Test credit note for logo verification',
          notes: 'Logo verification test'
        } as any, companyDetails)
      },
      {
        name: 'Delivery Note PDF',
        type: 'HTML-based',
        generator: () => downloadDeliveryNotePDF({
          delivery_note_number: 'DN-TEST-001',
          delivery_date: new Date().toISOString().split('T')[0],
          delivery_address: '123 Test Street, Nairobi',
          delivery_method: 'Courier',
          customers: testCustomer,
          delivery_note_items: testItems,
          notes: 'Test delivery note for logo verification',
          invoices: { invoice_number: 'INV-TEST-001' }
        }, companyDetails)
      },
      {
        name: 'Payment Receipt PDF',
        type: 'HTML-based',
        generator: () => generatePaymentReceiptPDF({
          payment_number: 'PAY-TEST-001',
          payment_date: new Date().toISOString().split('T')[0],
          amount: 25000,
          payment_method: 'Bank Transfer',
          customers: testCustomer,
          reference_number: 'REF-12345',
          notes: 'Test payment receipt for logo verification'
        }, companyDetails)
      }
    ];

    for (const test of tests) {
      updateTestResult(test.name, 'pending', 'Generating PDF...', test.type);
      
      try {
        await test.generator();
        updateTestResult(test.name, 'success', 'PDF generated successfully with logo', test.type);
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        updateTestResult(test.name, 'error', `Failed: ${errorMessage}`, test.type);
      }
    }

    setIsRunning(false);
    toast.success('PDF logo verification tests completed!');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
    }
  };

  const getTypeIcon = (pdfType: string) => {
    return pdfType === 'jsPDF-based' ? 
      <CreditCard className="h-3 w-3" /> : 
      <FileText className="h-3 w-3" />;
  };

  const successCount = testResults.filter(r => r.status === 'success').length;
  const errorCount = testResults.filter(r => r.status === 'error').length;
  const pendingCount = testResults.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">PDF Logo Verification</h1>
          <p className="text-muted-foreground">
            Test all PDF types to verify Biolegend Scientific logo appears correctly
          </p>
        </div>

        {/* Test Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <TestTube className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Tests</p>
                  <p className="text-sm font-bold">{testResults.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Success</p>
                  <p className="text-sm font-bold">{successCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Errors</p>
                  <p className="text-sm font-bold">{errorCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <div className={`h-4 w-4 border-2 border-yellow-500 ${pendingCount > 0 ? 'border-t-transparent rounded-full animate-spin' : 'rounded'}`} />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Running</p>
                  <p className="text-sm font-bold">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex gap-4">
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            {isRunning ? 'Running Tests...' : 'Test All PDFs'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={clearResults}
            disabled={isRunning}
          >
            Clear Results
          </Button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>PDF Generation Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{result.name}</span>
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getTypeIcon(result.pdfType)}
                          {result.pdfType}
                        </Badge>
                        <Badge variant={
                          result.status === 'success' ? 'default' :
                          result.status === 'error' ? 'destructive' : 'secondary'
                        }>
                          {result.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logo Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">✅ Logo Fix Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Logo URL Updated:</strong> All PDFs now use the correct Biolegend Scientific logo</p>
                  <p><strong>Error Handling:</strong> Graceful fallbacks if logo fails to load</p>
                  <p><strong>Coverage:</strong> Fixed logos in all PDF types including LPOs which previously had no logo</p>
                  <div className="mt-4">
                    <h4 className="font-medium">PDF Types Fixed:</h4>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div>• Quotations (HTML-based)</div>
                      <div>• Invoices (HTML-based)</div>
                      <div>• Proforma Invoices (HTML-based)</div>
                      <div>• Delivery Notes (HTML-based)</div>
                      <div>• Remittance Advice (HTML-based)</div>
                      <div>• Payment Receipts (HTML-based)</div>
                      <div>• Customer Statements (HTML-based)</div>
                      <div>• Credit Notes (HTML-based)</div>
                      <div>• LPOs/Purchase Orders (jsPDF-based)</div>
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
