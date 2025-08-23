import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export function TestInvoiceEnhancements() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testEnhancements = async () => {
    setTesting(true);
    setResults(null);

    const testResults = {
      lpoColumnExists: false,
      discountBeforeVatExists: false,
      taxColumnsExist: false,
      error: null as any
    };

    try {
      // Test 1: Check if LPO number column exists in invoices table
      const { data: invoiceColumns, error: invoiceError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'invoices')
        .eq('column_name', 'lpo_number');

      if (invoiceError) {
        testResults.error = invoiceError;
      } else {
        testResults.lpoColumnExists = invoiceColumns && invoiceColumns.length > 0;
      }

      // Test 2: Check if discount_before_vat column exists in invoice_items table
      const { data: discountColumns, error: discountError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'invoice_items')
        .eq('column_name', 'discount_before_vat');

      if (discountError) {
        testResults.error = testResults.error || discountError;
      } else {
        testResults.discountBeforeVatExists = discountColumns && discountColumns.length > 0;
      }

      // Test 3: Check if tax columns exist in invoice_items table
      const { data: taxColumns, error: taxError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'invoice_items')
        .in('column_name', ['tax_percentage', 'tax_amount', 'tax_inclusive']);

      if (taxError) {
        testResults.error = testResults.error || taxError;
      } else {
        testResults.taxColumnsExist = taxColumns && taxColumns.length >= 3;
      }

      toast.success('Enhancement verification completed!');

    } catch (error: any) {
      testResults.error = error;
      toast.error('Verification failed: ' + error.message);
    }

    setResults(testResults);
    setTesting(false);
  };

  const applyEnhancements = async () => {
    setTesting(true);
    
    try {
      // Run the SQL enhancement script
      const enhancementSQL = `
        -- Add LPO number reference column to invoices table
        ALTER TABLE invoices 
        ADD COLUMN IF NOT EXISTS lpo_number VARCHAR(255);

        -- Add discount before VAT column to invoice_items table (if not already exists)
        ALTER TABLE invoice_items
        ADD COLUMN IF NOT EXISTS discount_before_vat DECIMAL(15,2) DEFAULT 0;

        -- Ensure tax columns exist in invoice_items (in case they were missed)
        ALTER TABLE invoice_items
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

        -- Update existing records with proper default values for new columns
        UPDATE invoices 
        SET lpo_number = NULL
        WHERE lpo_number IS NULL;

        UPDATE invoice_items 
        SET discount_before_vat = COALESCE(discount_before_vat, 0),
            tax_percentage = COALESCE(tax_percentage, 0),
            tax_amount = COALESCE(tax_amount, 0),
            tax_inclusive = COALESCE(tax_inclusive, false)
        WHERE discount_before_vat IS NULL 
           OR tax_percentage IS NULL 
           OR tax_amount IS NULL 
           OR tax_inclusive IS NULL;
      `;

      const { error } = await supabase.rpc('exec_sql', { sql: enhancementSQL });

      if (error) {
        throw error;
      }

      toast.success('Invoice enhancements applied successfully!');
      
      // Re-run the test to verify
      setTimeout(() => testEnhancements(), 1000);

    } catch (error: any) {
      console.error('Error applying enhancements:', error);
      toast.error('Failed to apply enhancements: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Invoice Enhancement Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={testEnhancements} 
            disabled={testing}
            variant="outline"
          >
            {testing ? "Testing..." : "Test Enhancements"}
          </Button>
          
          <Button 
            onClick={applyEnhancements} 
            disabled={testing}
          >
            {testing ? "Applying..." : "Apply Enhancements"}
          </Button>
        </div>

        {results && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold">Enhancement Status:</h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {results.lpoColumnExists ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>LPO Number Column (invoices table)</span>
              </div>

              <div className="flex items-center gap-2">
                {results.discountBeforeVatExists ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Discount Before VAT Column (invoice_items table)</span>
              </div>

              <div className="flex items-center gap-2">
                {results.taxColumnsExist ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Tax Columns (invoice_items table)</span>
              </div>
            </div>

            {results.error && (
              <div className="mt-4 p-3 bg-destructive/10 rounded border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-semibold">Error:</span>
                </div>
                <p className="text-sm mt-1">{results.error.message}</p>
              </div>
            )}

            {results.lpoColumnExists && results.discountBeforeVatExists && results.taxColumnsExist && (
              <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-semibold">All enhancements are ready!</span>
                </div>
                <p className="text-sm mt-1">
                  ✅ LPO number reference field available<br/>
                  ✅ Discount before VAT field available<br/>
                  ✅ PDF columns will show only when they contain values
                </p>
              </div>
            )}
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p><strong>Enhancements Include:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>LPO number reference field in invoices</li>
            <li>Discount before VAT field in invoice items</li>
            <li>Dynamic PDF columns (show only when containing values)</li>
            <li>Updated CreateInvoiceModal and EditInvoiceModal forms</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
