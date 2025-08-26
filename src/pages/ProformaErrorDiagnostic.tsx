// Debug component removed during cleanup
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProformaErrorDiagnosticPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Navigation */}
        <div className="mb-6 flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Home
          </Button>
          <div className="text-sm text-muted-foreground">
            Proforma Error Diagnostic & Fix
          </div>
        </div>

        {/* Main Content */}
        <div className="text-center py-8">
          <p className="text-muted-foreground">Proforma error diagnostic component has been disabled in this version.</p>
        </div>
      </div>
    </div>
  );
}
