import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuotations, useInvoices, useCompanies } from '@/hooks/useDatabase';
import { downloadQuotationPDF, downloadInvoicePDF } from '@/utils/pdfGenerator';
import { toast } from 'sonner';

export default function PDFLineItemsDiagnostic() {
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showRawData, setShowRawData] = useState(false);
  const [logoTestMode, setLogoTestMode] = useState(false);
  
  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];
  const { data: quotations, isLoading: quotationsLoading } = useQuotations(currentCompany?.id);
  const { data: invoices, isLoading: invoicesLoading } = useInvoices(currentCompany?.id);

  const testQuotationPDF = (quotation: any, testLogo = false) => {
    console.log('Testing quotation PDF with data:', quotation);
    console.log('Quotation items:', quotation.quotation_items);

    if (!testLogo && (!quotation.quotation_items || quotation.quotation_items.length === 0)) {
      toast.error(`No line items found in quotation ${quotation.quotation_number}!`);
      return;
    }

    try {
      // Add company details with logo for testing
      const companyWithLogo = {
        name: 'Biolegend Scientific Ltd',
        address: 'P.O. Box 85988-00200, Nairobi\nAlpha Center, Eastern Bypass, Membley',
        city: 'Nairobi',
        country: 'Kenya',
        phone: '0741207690/0780165490',
        email: 'biolegend@biolegendscientific.co.ke',
        tax_number: 'P051701091X',
        logo_url: 'https://cdn.builder.io/api/v1/image/assets%2F69400b16069b456f9aaefcb4af79d463%2F1183a0a5c37e4fe69d12256c4d461bcd?format=webp&width=800'
      };

      downloadQuotationPDF(quotation, companyWithLogo);
      const itemCount = quotation.quotation_items?.length || 0;
      toast.success(`PDF generated for quotation ${quotation.quotation_number} with ${itemCount} line items ${testLogo ? '+ LOGO TEST' : ''}`);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('PDF generation failed');
    }
  };

  const testInvoicePDF = (invoice: any, testLogo = false) => {
    console.log('Testing invoice PDF with data:', invoice);
    console.log('Invoice items:', invoice.invoice_items);

    if (!testLogo && (!invoice.invoice_items || invoice.invoice_items.length === 0)) {
      toast.error(`No line items found in invoice ${invoice.invoice_number}!`);
      return;
    }

    try {
      // Add company details with logo for testing
      const companyWithLogo = {
        name: 'Biolegend Scientific Ltd',
        address: 'P.O. Box 85988-00200, Nairobi\nAlpha Center, Eastern Bypass, Membley',
        city: 'Nairobi',
        country: 'Kenya',
        phone: '0741207690/0780165490',
        email: 'biolegend@biolegendscientific.co.ke',
        tax_number: 'P051701091X',
        logo_url: 'https://cdn.builder.io/api/v1/image/assets%2F69400b16069b456f9aaefcb4af79d463%2F1183a0a5c37e4fe69d12256c4d461bcd?format=webp&width=800'
      };

      downloadInvoicePDF(invoice, 'INVOICE', companyWithLogo);
      const itemCount = invoice.invoice_items?.length || 0;
      toast.success(`PDF generated for invoice ${invoice.invoice_number} with ${itemCount} line items ${testLogo ? '+ LOGO TEST' : ''}`);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('PDF generation failed');
    }
  };

  if (quotationsLoading || invoicesLoading) {
    return <div>Loading documents...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>PDF Line Items Diagnostic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Logo Test Toggle */}
          <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded">
            <input
              type="checkbox"
              id="logoTest"
              checked={logoTestMode}
              onChange={(e) => setLogoTestMode(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="logoTest" className="text-sm font-medium">
              Logo Test Mode (Forces logo display even without line items)
            </label>
          </div>

          {/* Quotations Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Quotations ({quotations?.length || 0})</h3>
            <div className="space-y-2">
              {quotations?.slice(0, 5).map(quotation => (
                <div key={quotation.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="font-medium">{quotation.quotation_number}</div>
                    <div className="text-sm text-muted-foreground">
                      Customer: {quotation.customers?.name || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={quotation.quotation_items?.length > 0 ? "default" : "destructive"}>
                        {quotation.quotation_items?.length || 0} line items
                      </Badge>
                      {quotation.quotation_items?.length > 0 && (
                        <Badge variant="outline">
                          Total: {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(quotation.total_amount)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedDocument(quotation);
                        setShowRawData(true);
                      }}
                    >
                      View Data
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => testQuotationPDF(quotation)}
                      disabled={!quotation.quotation_items || quotation.quotation_items.length === 0}
                    >
                      Test PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoices Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Invoices ({invoices?.length || 0})</h3>
            <div className="space-y-2">
              {invoices?.slice(0, 5).map(invoice => (
                <div key={invoice.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="font-medium">{invoice.invoice_number}</div>
                    <div className="text-sm text-muted-foreground">
                      Customer: {invoice.customers?.name || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={invoice.invoice_items?.length > 0 ? "default" : "destructive"}>
                        {invoice.invoice_items?.length || 0} line items
                      </Badge>
                      {invoice.invoice_items?.length > 0 && (
                        <Badge variant="outline">
                          Total: {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(invoice.total_amount)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedDocument(invoice);
                        setShowRawData(true);
                      }}
                    >
                      View Data
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => testInvoicePDF(invoice)}
                      disabled={!invoice.invoice_items || invoice.invoice_items.length === 0}
                    >
                      Test PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Data Modal */}
          {showRawData && selectedDocument && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-auto p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    Raw Data: {selectedDocument.quotation_number || selectedDocument.invoice_number}
                  </h3>
                  <Button variant="outline" onClick={() => setShowRawData(false)}>
                    Close
                  </Button>
                </div>
                <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
                  {JSON.stringify(selectedDocument, null, 2)}
                </pre>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
