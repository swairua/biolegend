import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Wrench, 
  CheckCircle, 
  XCircle, 
  Copy,
  ExternalLink,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { createPaymentsTableNow, testPaymentsTable } from '@/utils/createPaymentsTableNow';
import { toast } from 'sonner';

export function ImmediatePaymentsFix() {
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<any>(null);
  const [showSQL, setShowSQL] = useState(false);

  const executeImmediateFix = async () => {
    setIsFixing(true);
    setFixResult(null);
    
    try {
      toast.info('Creating payments table...');
      
      // First test if table exists
      const testResult = await testPaymentsTable();
      if (testResult.exists) {
        setFixResult({
          success: true,
          message: 'Payments table already exists!',
          details: 'No fix needed - table is accessible.'
        });
        toast.success('Table already exists!');
        return;
      }

      // Try to create the table
      const result = await createPaymentsTableNow();
      setFixResult(result);

      if (result.success) {
        toast.success('Payments table created successfully!');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error('Automatic fix failed - manual SQL required');
        setShowSQL(true);
      }
    } catch (error) {
      console.error('Fix failed:', error);
      setFixResult({
        success: false,
        message: `Fix failed: ${error}`,
        sqlRequired: true
      });
      toast.error('Fix failed - see manual instructions');
      setShowSQL(true);
    } finally {
      setIsFixing(false);
    }
  };

  const copyManualSQL = () => {
    const sql = `-- MANUAL PAYMENTS TABLE FIX
-- Copy and paste this into Supabase SQL Editor

-- Create payment method enum
CREATE TYPE payment_method AS ENUM ('cash', 'cheque', 'bank_transfer', 'mobile_money', 'credit_card', 'other');

-- Create payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    payment_number VARCHAR(100) UNIQUE NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method payment_method NOT NULL,
    reference_number VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_allocations table
CREATE TABLE payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount_allocated DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "payments_policy" ON payments FOR ALL USING (true);
CREATE POLICY "payment_allocations_policy" ON payment_allocations FOR ALL USING (true);

-- Verify table creation
SELECT 'SUCCESS' as status, COUNT(*) as payments_table_count FROM information_schema.tables WHERE table_name = 'payments';`;

    navigator.clipboard.writeText(sql);
    toast.success('Manual SQL copied to clipboard!');
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard', '_blank');
    toast.info('Opening Supabase dashboard - navigate to SQL Editor');
  };

  return (
    <Card className="w-full border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800">
          <XCircle className="h-5 w-5" />
          Payments Table Missing - Immediate Fix Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-red-200 bg-red-100">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <strong>Error:</strong> Could not find the table 'public.payments' in the schema cache.
            <br />This table is required for payments functionality to work.
          </AlertDescription>
        </Alert>

        {/* Quick Fix Button */}
        <div className="flex gap-3">
          <Button 
            onClick={executeImmediateFix}
            disabled={isFixing}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isFixing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Table...
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4 mr-2" />
                Create Payments Table Now
              </>
            )}
          </Button>
          
          <Button
            onClick={() => setShowSQL(!showSQL)}
            variant="outline"
            className="border-red-300 text-red-700"
          >
            <Database className="h-4 w-4 mr-2" />
            Show Manual SQL
          </Button>
        </div>

        {/* Fix Results */}
        {fixResult && (
          <div className={`p-4 border rounded-lg ${fixResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {fixResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">
                {fixResult.success ? 'Success!' : 'Fix Failed'}
              </span>
              <Badge variant={fixResult.success ? 'default' : 'destructive'}>
                {fixResult.success ? 'CREATED' : 'FAILED'}
              </Badge>
            </div>
            <p className="text-sm">{fixResult.message}</p>
            
            {fixResult.success && (
              <div className="mt-3 text-sm text-green-700">
                The page will refresh automatically in 2 seconds to show the working payments table.
              </div>
            )}
          </div>
        )}

        {/* Manual SQL Section */}
        {(showSQL || (fixResult && !fixResult.success)) && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium flex items-center gap-2 text-yellow-800 mb-3">
              <Copy className="h-4 w-4" />
              Manual Fix Required
            </h4>
            
            <p className="text-sm text-yellow-700 mb-3">
              If the automatic fix failed, manually execute SQL in Supabase:
            </p>
            
            <ol className="text-sm text-yellow-700 mb-4 space-y-1 list-decimal list-inside">
              <li>Copy the SQL below</li>
              <li>Open Supabase dashboard</li>
              <li>Go to SQL Editor</li>
              <li>Paste and run the SQL</li>
              <li>Refresh this page</li>
            </ol>
            
            <div className="flex gap-2">
              <Button
                onClick={copyManualSQL}
                size="sm"
                variant="outline"
                className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy SQL
              </Button>
              <Button
                onClick={openSupabase}
                size="sm"
                variant="outline"
                className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Supabase
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
