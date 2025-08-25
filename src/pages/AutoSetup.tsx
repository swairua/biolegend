import { AutoMigrationTrigger } from '@/components/AutoMigrationTrigger';
import { BiolegendLogo } from '@/components/ui/biolegend-logo';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PaymentAllocationSetup } from '@/components/PaymentAllocationSetup';

export default function AutoSetup() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <BiolegendLogo size="lg" showText={false} />
          <h1 className="text-3xl font-bold mt-4 biolegend-brand">Biolegend Scientific Ltd</h1>
          <p className="text-muted-foreground mt-2">Automatic Database Setup</p>
        </div>

        {/* Back Button */}
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Application
          </Button>
        </div>

        {/* Auto Migration Trigger */}
        <AutoMigrationTrigger autoStart={true} />

        {/* Payment Allocation Setup */}
        <div className="mt-8">
          <PaymentAllocationSetup />
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>The migration will start automatically and create all necessary database tables.</p>
          <p>Once complete, you'll be able to use the full application functionality.</p>
          <p className="mt-2">After basic setup, configure payment allocation to properly sync payment and invoice balances.</p>
        </div>
      </div>
    </div>
  );
}
