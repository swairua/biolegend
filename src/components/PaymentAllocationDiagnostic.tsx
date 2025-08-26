import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, AlertTriangle, CheckCircle, RefreshCw, Calculator } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface AllocationDiagnostic {
  totalAllocations: number;
  orphanedAllocations: number;
  negativeAmounts: number;
  overAllocations: number;
  missingReferences: number;
  totalAmount: number;
}

export function PaymentAllocationDiagnostic() {
  const [isChecking, setIsChecking] = React.useState(false);
  const [results, setResults] = React.useState<AllocationDiagnostic | null>(null);
  const [lastCheck, setLastCheck] = React.useState<Date | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const checkAllocations = async () => {
    setIsChecking(true);
    setError(null);

    try {
      // Check if payment_allocations table exists
      const { data: allocations, error: allocationsError } = await supabase
        .from('payment_allocations')
        .select('id, payment_id, invoice_id, amount');

      if (allocationsError) {
        // Table might not exist
        setResults({
          totalAllocations: 0,
          orphanedAllocations: 0,
          negativeAmounts: 0,
          overAllocations: 0,
          missingReferences: 0,
          totalAmount: 0
        });
        setError('Payment allocations table may not exist or be accessible');
        setLastCheck(new Date());
        return;
      }

      let orphanedCount = 0;
      let negativeCount = 0;
      let missingRefsCount = 0;
      let totalAmount = 0;

      if (allocations) {
        // Count various issues
        allocations.forEach(allocation => {
          if (!allocation.payment_id || !allocation.invoice_id) {
            missingRefsCount++;
          }
          if (allocation.amount < 0) {
            negativeCount++;
          }
          totalAmount += allocation.amount || 0;
        });

        // Check for orphaned allocations (references to non-existent payments/invoices)
        const paymentIds = allocations.map(a => a.payment_id).filter(Boolean);
        const invoiceIds = allocations.map(a => a.invoice_id).filter(Boolean);

        if (paymentIds.length > 0) {
          const { data: payments } = await supabase
            .from('payments')
            .select('id')
            .in('id', paymentIds);
          
          const validPaymentIds = new Set(payments?.map(p => p.id) || []);
          orphanedCount += allocations.filter(a => 
            a.payment_id && !validPaymentIds.has(a.payment_id)
          ).length;
        }

        if (invoiceIds.length > 0) {
          const { data: invoices } = await supabase
            .from('invoices')
            .select('id')
            .in('id', invoiceIds);
          
          const validInvoiceIds = new Set(invoices?.map(i => i.id) || []);
          orphanedCount += allocations.filter(a => 
            a.invoice_id && !validInvoiceIds.has(a.invoice_id)
          ).length;
        }
      }

      setResults({
        totalAllocations: allocations?.length || 0,
        orphanedAllocations: orphanedCount,
        negativeAmounts: negativeCount,
        overAllocations: 0, // Would need more complex logic to detect
        missingReferences: missingRefsCount,
        totalAmount
      });

      setLastCheck(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check failed');
    } finally {
      setIsChecking(false);
    }
  };

  React.useEffect(() => {
    checkAllocations();
  }, []);

  const hasIssues = results && (
    results.orphanedAllocations > 0 || 
    results.negativeAmounts > 0 || 
    results.missingReferences > 0
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Allocation Diagnostic
          </div>
          <Button 
            onClick={checkAllocations} 
            variant="outline" 
            size="sm"
            disabled={isChecking}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Check'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span>Total Allocations:</span>
                  <Badge variant="outline">{results.totalAllocations}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span>Total Amount:</span>
                  <Badge variant="outline">
                    <Calculator className="h-3 w-3 mr-1" />
                    ${results.totalAmount.toFixed(2)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span>Orphaned:</span>
                  <Badge variant={results.orphanedAllocations > 0 ? 'destructive' : 'default'}>
                    {results.orphanedAllocations}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span>Negative Amounts:</span>
                  <Badge variant={results.negativeAmounts > 0 ? 'destructive' : 'default'}>
                    {results.negativeAmounts}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span>Missing References:</span>
                  <Badge variant={results.missingReferences > 0 ? 'destructive' : 'default'}>
                    {results.missingReferences}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span>Status:</span>
                  <Badge variant={hasIssues ? 'destructive' : 'default'}>
                    {hasIssues ? 'Issues Found' : 'Healthy'}
                  </Badge>
                </div>
              </div>

              {lastCheck && (
                <div className="text-xs text-muted-foreground">
                  Last check: {lastCheck.toLocaleString()}
                </div>
              )}

              {!hasIssues && results.totalAllocations > 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Payment allocations are healthy</span>
                </div>
              )}

              {results.totalAllocations === 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No payment allocations found. This could indicate the feature hasn't been set up yet.
                  </AlertDescription>
                </Alert>
              )}

              {hasIssues && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Found {results.orphanedAllocations + results.negativeAmounts + results.missingReferences} allocation issues that need attention.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
