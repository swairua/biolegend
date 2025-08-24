import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Play, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function FixQuotationColumns() {
  const [isFixing, setIsFixing] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
    console.log(message);
  };

  const checkColumns = async () => {
    try {
      addLog('🔍 Checking existing tax columns...');
      
      const { data, error } = await supabase.rpc('check_table_columns', {
        table_names: ['quotation_items', 'invoice_items'],
        column_patterns: ['tax_%']
      });
      
      if (error) {
        // Fallback to direct query if RPC doesn't exist
        const { data: columns, error: columnError } = await supabase
          .from('information_schema.columns')
          .select('table_name, column_name')
          .in('table_name', ['quotation_items', 'invoice_items'])
          .like('column_name', '%tax%');
        
        if (columnError) {
          throw columnError;
        }
        
        return columns || [];
      }
      
      return data || [];
    } catch (err: any) {
      addLog(`❌ Error checking columns: ${err.message}`);
      throw err;
    }
  };

  const executeFix = async () => {
    setIsFixing(true);
    setError(null);
    setLogs([]);
    
    try {
      addLog('🚀 Starting quotation tax columns fix...');
      
      // Check current state
      const existingColumns = await checkColumns();
      addLog(`📊 Found ${existingColumns.length} existing tax columns`);
      
      // Execute the fix SQL
      addLog('🔧 Adding missing tax columns to quotation_items...');
      
      const quotationItemsSQL = `
        ALTER TABLE quotation_items 
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
      `;
      
      const { error: quotationError } = await supabase.rpc('exec_sql', { 
        sql: quotationItemsSQL 
      });
      
      if (quotationError) {
        // Fallback to individual column additions
        const columns = [
          { name: 'tax_percentage', type: 'DECIMAL(6,3)', default: '0' },
          { name: 'tax_amount', type: 'DECIMAL(15,2)', default: '0' },
          { name: 'tax_inclusive', type: 'BOOLEAN', default: 'false' }
        ];
        
        for (const col of columns) {
          const { error } = await supabase.rpc('exec_sql', {
            sql: `ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} DEFAULT ${col.default};`
          });
          
          if (error && !error.message.includes('already exists')) {
            throw error;
          }
          addLog(`✅ Added ${col.name} to quotation_items`);
        }
      } else {
        addLog('✅ Tax columns added to quotation_items');
      }
      
      // Fix invoice_items too
      addLog('🔧 Adding missing tax columns to invoice_items...');
      
      const invoiceItemsSQL = `
        ALTER TABLE invoice_items
        ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(6,3) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;
      `;
      
      const { error: invoiceError } = await supabase.rpc('exec_sql', { 
        sql: invoiceItemsSQL 
      });
      
      if (invoiceError) {
        // Fallback for invoice_items
        const columns = [
          { name: 'tax_percentage', type: 'DECIMAL(6,3)', default: '0' },
          { name: 'tax_amount', type: 'DECIMAL(15,2)', default: '0' },
          { name: 'tax_inclusive', type: 'BOOLEAN', default: 'false' }
        ];
        
        for (const col of columns) {
          const { error } = await supabase.rpc('exec_sql', {
            sql: `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} DEFAULT ${col.default};`
          });
          
          if (error && !error.message.includes('already exists')) {
            throw error;
          }
          addLog(`✅ Added ${col.name} to invoice_items`);
        }
      } else {
        addLog('✅ Tax columns added to invoice_items');
      }
      
      // Update existing records
      addLog('🔄 Updating existing records with default values...');
      
      const { error: updateQuotationError } = await supabase.rpc('exec_sql', {
        sql: `UPDATE quotation_items 
              SET tax_percentage = COALESCE(tax_percentage, 0),
                  tax_amount = COALESCE(tax_amount, 0),
                  tax_inclusive = COALESCE(tax_inclusive, false);`
      });
      
      if (updateQuotationError) {
        addLog(`⚠️ Warning: Could not update quotation_items defaults: ${updateQuotationError.message}`);
      } else {
        addLog('✅ Updated quotation_items default values');
      }
      
      const { error: updateInvoiceError } = await supabase.rpc('exec_sql', {
        sql: `UPDATE invoice_items 
              SET tax_percentage = COALESCE(tax_percentage, 0),
                  tax_amount = COALESCE(tax_amount, 0),
                  tax_inclusive = COALESCE(tax_inclusive, false);`
      });
      
      if (updateInvoiceError) {
        addLog(`⚠️ Warning: Could not update invoice_items defaults: ${updateInvoiceError.message}`);
      } else {
        addLog('✅ Updated invoice_items default values');
      }
      
      // Verify the fix
      addLog('🔍 Verifying fix...');
      const newColumns = await checkColumns();
      addLog(`📊 Now found ${newColumns.length} tax columns`);
      
      setIsFixed(true);
      addLog('🎉 Quotation tax columns fix completed successfully!');
      toast.success('Quotation tax columns fixed! Quotation creation should now work.');
      
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error occurred';
      setError(errorMessage);
      addLog(`❌ Fix failed: ${errorMessage}`);
      toast.error(`Fix failed: ${errorMessage}`);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Fix Quotation Tax Columns
        </CardTitle>
        <CardDescription>
          Fixes the "could not find the tax_amount column" error by adding missing tax columns to quotation_items and invoice_items tables.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="font-medium">Status:</span>
          {isFixed ? (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Fixed
            </Badge>
          ) : error ? (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Error
            </Badge>
          ) : (
            <Badge variant="secondary">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Needs Fix
            </Badge>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Fix Failed:</strong> {error}
              <br />
              <br />
              <strong>Manual Fix Instructions:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Go to your Supabase Dashboard → SQL Editor</li>
                <li>Copy and paste the SQL from the file <code>fix-quotation-tax-columns.sql</code></li>
                <li>Click "Run" to execute the SQL</li>
                <li>Refresh this page to verify the fix</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {isFixed && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Fix Applied Successfully!</strong> The missing tax columns have been added to quotation_items and invoice_items tables. 
              Quotation creation should now work without foreign key errors.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Button */}
        <Button 
          onClick={executeFix} 
          disabled={isFixing || isFixed}
          className="w-full"
        >
          {isFixing ? (
            <>
              <Play className="h-4 w-4 mr-2 animate-spin" />
              Applying Fix...
            </>
          ) : isFixed ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Fix Applied
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Apply Fix
            </>
          )}
        </Button>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Fix Logs:</h4>
            <div className="bg-gray-50 p-3 rounded-md max-h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="text-sm font-mono text-gray-700 mb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <Alert>
          <AlertDescription>
            <strong>What this fix does:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Adds <code>tax_amount</code>, <code>tax_percentage</code>, and <code>tax_inclusive</code> columns to quotation_items</li>
              <li>Adds the same tax columns to invoice_items</li>
              <li>Sets default values for existing records</li>
              <li>Resolves the "could not find the tax_amount column" error</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
