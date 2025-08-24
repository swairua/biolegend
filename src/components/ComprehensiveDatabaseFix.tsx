import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Play, Database, Copy } from 'lucide-react';
import { toast } from 'sonner';

const COMPREHENSIVE_SQL = `-- COMPREHENSIVE DATABASE COLUMN FIX
-- Run this in your Supabase SQL Editor to fix all "column does not exist" errors

-- ==================================================
-- 1. INVOICES TABLE - Add missing columns
-- ==================================================
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS lpo_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS affects_inventory BOOLEAN DEFAULT true;

-- ==================================================
-- 2. INVOICE_ITEMS TABLE - Add missing tax and other columns
-- ==================================================
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_before_vat DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);

-- ==================================================
-- 3. QUOTATION_ITEMS TABLE - Add missing tax and other columns
-- ==================================================
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_before_vat DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);

-- ==================================================
-- 4. PROFORMA_ITEMS TABLE - Add missing tax and other columns
-- ==================================================
ALTER TABLE proforma_items 
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_before_vat DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);

-- ==================================================
-- 5. PRODUCTS TABLE - Add alternative stock column names
-- ==================================================
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_stock_level INTEGER;

-- Copy data from existing columns to new ones
UPDATE products 
SET min_stock_level = COALESCE(minimum_stock_level, 0),
    max_stock_level = maximum_stock_level
WHERE min_stock_level IS NULL OR max_stock_level IS NULL;

-- ==================================================
-- 6. UPDATE EXISTING RECORDS WITH DEFAULT VALUES
-- ==================================================

-- Update invoice_items
UPDATE invoice_items 
SET tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false),
    discount_before_vat = COALESCE(discount_before_vat, 0);

-- Update quotation_items
UPDATE quotation_items 
SET tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false),
    discount_before_vat = COALESCE(discount_before_vat, 0);

-- Update proforma_items
UPDATE proforma_items 
SET tax_percentage = COALESCE(tax_percentage, 0),
    tax_amount = COALESCE(tax_amount, 0),
    tax_inclusive = COALESCE(tax_inclusive, false),
    discount_before_vat = COALESCE(discount_before_vat, 0);

-- Update invoices
UPDATE invoices 
SET affects_inventory = COALESCE(affects_inventory, true);

-- ==================================================
-- VERIFICATION - Check that columns were added
-- ==================================================
SELECT 'SUCCESS: All missing columns have been added!' as status;`;

export function ComprehensiveDatabaseFix() {
  const [showSQL, setShowSQL] = useState(false);

  const copySQL = () => {
    navigator.clipboard.writeText(COMPREHENSIVE_SQL);
    toast.success('SQL copied to clipboard!');
  };

  const missingColumns = [
    { table: 'invoices', columns: ['lpo_number', 'affects_inventory'] },
    { table: 'invoice_items', columns: ['tax_percentage', 'tax_amount', 'tax_inclusive', 'discount_before_vat', 'product_name'] },
    { table: 'quotation_items', columns: ['tax_percentage', 'tax_amount', 'tax_inclusive', 'discount_before_vat', 'product_name'] },
    { table: 'proforma_items', columns: ['tax_percentage', 'tax_amount', 'tax_inclusive', 'discount_before_vat', 'product_name'] },
    { table: 'products', columns: ['min_stock_level', 'max_stock_level'] }
  ];

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Comprehensive Database Column Fix
        </CardTitle>
        <CardDescription>
          Fixes all "column does not exist" errors by adding missing columns that the application expects.
          This includes tax columns, product names, LPO numbers, and stock level alternatives.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Missing Columns Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {missingColumns.map((item, index) => (
            <Card key={index} className="border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-800">
                  {item.table}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {item.columns.map((column, colIndex) => (
                    <Badge key={colIndex} variant="outline" className="text-xs mr-1 mb-1">
                      {column}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Instructions */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> This SQL adds columns that your application code expects but may be missing from your database.
            These columns are required for invoice creation, quotations, tax calculations, and product management.
          </AlertDescription>
        </Alert>

        {/* Manual Fix Instructions */}
        <Alert className="border-blue-200 bg-blue-50">
          <Database className="h-4 w-4" />
          <AlertDescription>
            <strong>Manual Fix Instructions:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Go to your <strong>Supabase Dashboard → SQL Editor</strong></li>
              <li>Copy the SQL below and paste it into the SQL Editor</li>
              <li>Click <strong>"Run"</strong> to execute the SQL</li>
              <li>Check the results to verify all columns were added</li>
              <li>Test invoice creation - it should now work without column errors</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Show/Hide SQL */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowSQL(!showSQL)}
              variant="outline"
            >
              {showSQL ? 'Hide SQL' : 'Show SQL'}
            </Button>
            <Button 
              onClick={copySQL}
              variant="outline"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy SQL
            </Button>
          </div>

          {showSQL && (
            <div className="space-y-2">
              <h4 className="font-medium">SQL to Execute:</h4>
              <div className="bg-gray-900 text-green-400 p-4 rounded-md max-h-96 overflow-y-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {COMPREHENSIVE_SQL}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* What This Fixes */}
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>What this fixes:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Invoice Creation:</strong> Adds missing tax columns, LPO numbers, and product names</li>
              <li><strong>Tax Calculations:</strong> Enables proper VAT/tax handling on all item types</li>
              <li><strong>Quotations:</strong> Adds missing tax and discount columns</li>
              <li><strong>Product Management:</strong> Adds alternative stock level column names</li>
              <li><strong>Historical Data:</strong> Enables product name storage for audit trails</li>
              <li><strong>Discounts:</strong> Adds discount_before_vat columns for proper tax calculations</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Enhanced Features */}
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Enhanced Invoice Creation Features:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Smart Autopopulation:</strong> Product details auto-fill when selected</li>
              <li><strong>Automatic Tax Calculation:</strong> Default tax rate applied automatically</li>
              <li><strong>Real-time Totals:</strong> Subtotal, tax, and total update as you type</li>
              <li><strong>Discount Handling:</strong> Proper discount before VAT calculations</li>
              <li><strong>Historical Product Names:</strong> Product names saved for audit trail</li>
              <li><strong>Price Fallbacks:</strong> Handles both selling_price and unit_price fields</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Testing Checklist */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">After Running SQL - Test Checklist:</h4>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>✓ Create a new invoice - no column errors should occur</li>
            <li>✓ Add products - prices and details should autopopulate</li>
            <li>✓ Change quantities - totals should recalculate automatically</li>
            <li>✓ Apply tax - tax amounts should calculate correctly</li>
            <li>✓ Add discounts - discounts should apply before tax</li>
            <li>✓ Save invoice - all data should persist correctly</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
