import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Zap, RefreshCw } from 'lucide-react';
import { executeMigrationNow } from '@/utils/executeMigrationNow';

export function ImmediateMigrationButton() {
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      await executeMigrationNow();
    } catch (error) {
      console.error('Migration execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p><strong>Quick Fix: Missing Database Tables</strong></p>
            <p>Click the button below to immediately create all necessary database tables.</p>
            <p className="text-sm text-muted-foreground">
              This will create: Companies, Profiles, Customers, Products, Quotations, Invoices, LPOs, Credit Notes, and more.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      <div className="text-center">
        <Button 
          onClick={handleExecute}
          disabled={isExecuting}
          size="lg"
          className="w-full max-w-md"
        >
          {isExecuting ? (
            <>
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Creating Tables...
            </>
          ) : (
            <>
              <Zap className="h-5 w-5 mr-2" />
              Create All Database Tables Now
            </>
          )}
        </Button>
      </div>

      {isExecuting && (
        <div className="text-center text-sm text-muted-foreground">
          Please wait while we create all database tables. This may take a moment.
        </div>
      )}
    </div>
  );
}
