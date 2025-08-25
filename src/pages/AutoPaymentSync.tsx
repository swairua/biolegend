import { useEffect } from 'react';
import { BiolegendLogo } from '@/components/ui/biolegend-logo';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AutoPaymentSync } from '@/components/AutoPaymentSync';

// This is a setup page that should work without authentication

export default function AutoPaymentSyncPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Set page title
    document.title = 'Auto Payment Sync - Biolegend Scientific';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <BiolegendLogo size="lg" showText={false} />
          <h1 className="text-3xl font-bold mt-4 biolegend-brand flex items-center justify-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            Biolegend Scientific Ltd
          </h1>
          <p className="text-muted-foreground mt-2">Automatic Payment-Invoice Synchronization</p>
          <p className="text-sm text-muted-foreground mt-1">
            Setting up real-time payment tracking and invoice balance updates
          </p>
        </div>

        {/* Back Button */}
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Application
          </Button>
        </div>

        {/* Auto Payment Sync Component */}
        <AutoPaymentSync autoStart={true} />

        {/* Instructions */}
        <div className="mt-8 text-center text-sm text-muted-foreground space-y-2">
          <p className="font-medium">How Payment Auto-Sync Works:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-card p-4 rounded-lg border">
              <h4 className="font-medium text-foreground mb-2">1. Record Payment</h4>
              <p>When you record a payment against an invoice</p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <h4 className="font-medium text-foreground mb-2">2. Auto Update</h4>
              <p>Invoice balance and status update automatically</p>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <h4 className="font-medium text-foreground mb-2">3. Real-time Sync</h4>
              <p>All views show current payment status instantly</p>
            </div>
          </div>
          <p className="mt-4 text-xs">
            This setup ensures payment data stays synchronized across invoices, reports, and PDFs.
          </p>
        </div>
      </div>
    </div>
  );
}
