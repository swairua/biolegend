import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Copy, Database, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const PAYMENT_ALLOCATIONS_SQL = `-- Create payment_allocations table for linking payments to invoices
-- Run this SQL in your database admin panel (Supabase SQL Editor, pgAdmin, etc.)

-- Create payment_allocations table
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount_allocated DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);

-- Enable Row Level Security (RLS)
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust these based on your security requirements)
CREATE POLICY "Users can view allocations in their company" ON payment_allocations 
FOR SELECT USING (
    payment_id IN (
        SELECT id FROM payments WHERE company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can insert allocations in their company" ON payment_allocations 
FOR INSERT WITH CHECK (
    payment_id IN (
        SELECT id FROM payments WHERE company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can update allocations in their company" ON payment_allocations 
FOR UPDATE USING (
    payment_id IN (
        SELECT id FROM payments WHERE company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can delete allocations in their company" ON payment_allocations 
FOR DELETE USING (
    payment_id IN (
        SELECT id FROM payments WHERE company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    )
);`;

export function PaymentAllocationsTableSetup() {
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [tableExists, setTableExists] = useState<boolean | null>(null);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(PAYMENT_ALLOCATIONS_SQL);
    setCopied(true);
    toast.success('SQL copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const checkTableExists = async () => {
    setIsChecking(true);
    try {
      const { error } = await supabase
        .from('payment_allocations')
        .select('id')
        .limit(1);

      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          setTableExists(false);
          toast.info('payment_allocations table not found');
        } else {
          throw error;
        }
      } else {
        setTableExists(true);
        toast.success('payment_allocations table exists!');
      }
    } catch (err: any) {
      console.error('Error checking table:', err);
      setTableExists(false);
      toast.error('Failed to check table existence');
    } finally {
      setIsChecking(false);
    }
  };

  if (tableExists === true) {
    return (
      <Card className="border-success/50 bg-success/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            Payment Allocations Table Ready
            <Badge variant="secondary" className="text-success">
              <CheckCircle className="h-3 w-3 mr-1" />
              Exists
            </Badge>
          </CardTitle>
          <CardDescription>
            The payment_allocations table exists and is ready for use.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-5 w-5" />
          Payment Allocations Table Missing
          <Badge variant="outline" className="text-warning border-warning">
            Setup Required
          </Badge>
        </CardTitle>
        <CardDescription>
          The payment_allocations table is required for linking payments to invoices. Create it manually using the SQL below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-info/50 bg-info/5">
          <Database className="h-4 w-4" />
          <AlertDescription>
            <strong>Required for synchronization:</strong> This table stores the relationships between payments 
            and invoices, enabling proper payment allocation tracking.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">How to create the table:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Copy the SQL code below</li>
              <li>Open your database admin panel (Supabase SQL Editor, pgAdmin, etc.)</li>
              <li>Paste and execute the SQL</li>
              <li>Click "Check Table" to verify creation</li>
            </ol>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">SQL Code:</h4>
              <div className="flex gap-2">
                <Button 
                  onClick={checkTableExists}
                  size="sm"
                  variant="outline"
                  disabled={isChecking}
                  className="flex items-center gap-2"
                >
                  {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  {isChecking ? 'Checking...' : 'Check Table'}
                </Button>
                <Button 
                  onClick={copyToClipboard}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy SQL'}
                </Button>
              </div>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                {PAYMENT_ALLOCATIONS_SQL}
              </pre>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Database Access Links:</h4>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-3 w-3" />
                Supabase Dashboard
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('https://supabase.com/dashboard/project/_/sql', '_blank')}
                className="flex items-center gap-2"
              >
                <Database className="h-3 w-3" />
                Supabase SQL Editor
              </Button>
            </div>
          </div>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> Without this table, payment synchronization cannot create proper 
            links between payments and invoices. Existing payments will appear as unallocated.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
