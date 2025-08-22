import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Play
} from 'lucide-react';
import { executeMigrationNow } from '@/utils/executeMigrationNow';
import { toast } from 'sonner';

export function AutoMigrationTrigger({ autoStart = false }: { autoStart?: boolean }) {
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);

  const startMigration = async () => {
    setIsRunning(true);
    setHasError(false);
    setProgress(10);

    try {
      console.log('🚀 Starting automatic migration...');
      toast.info('Starting database migration...', {
        description: 'Creating all necessary tables for Biolegend Scientific'
      });

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 15;
        });
      }, 500);

      const success = await executeMigrationNow();
      
      clearInterval(progressInterval);
      setProgress(100);

      if (success) {
        setIsComplete(true);
        toast.success('🎉 Database migration completed successfully!');
      } else {
        setHasError(true);
        toast.warning('Migration completed with issues - check the details');
      }
    } catch (error) {
      console.error('Migration trigger error:', error);
      setHasError(true);
      toast.error('Migration failed - see console for details');
    } finally {
      setIsRunning(false);
    }
  };

  // Auto-start if requested
  useEffect(() => {
    if (autoStart) {
      startMigration();
    }
  }, [autoStart]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Automatic Database Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status */}
        {!isRunning && !isComplete && !hasError && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>3 critical tables are missing</strong></p>
                <p>The following tables need to be created:</p>
                <ul className="list-disc list-inside text-sm">
                  <li>companies - Organization data</li>
                  <li>profiles - User management</li>
                  <li>customers - Client database</li>
                </ul>
                <p>Click below to create all necessary database tables automatically.</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Progress */}
        {isRunning && (
          <div className="space-y-4">
            <Alert>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertDescription>
                <strong>Creating database tables...</strong><br />
                Setting up complete database structure for Biolegend Scientific.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Migration Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </div>
        )}

        {/* Success */}
        {isComplete && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="space-y-2 text-green-700">
                <p><strong>🎉 Database setup completed successfully!</strong></p>
                <p>All necessary tables have been created:</p>
                <ul className="list-disc list-inside text-sm">
                  <li>✅ Companies table</li>
                  <li>✅ Profiles table</li>
                  <li>✅ Customers table</li>
                  <li>✅ Products & Categories</li>
                  <li>✅ Quotations & Invoices</li>
                  <li>✅ LPOs & Credit Notes</li>
                  <li>✅ Stock Movements</li>
                  <li>✅ And many more...</li>
                </ul>
                <p className="font-medium">The application will refresh automatically to load the updated database.</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error */}
        {hasError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Migration completed with issues</strong></p>
                <p>Some tables may need manual creation. Check the migration interface for manual SQL.</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Button */}
        {!isRunning && !isComplete && (
          <div className="text-center">
            <Button 
              onClick={startMigration}
              size="lg"
              className="w-full max-w-md"
              disabled={isRunning}
            >
              <Play className="h-5 w-5 mr-2" />
              Setup Database Automatically
            </Button>
          </div>
        )}

        {/* Retry Button */}
        {hasError && (
          <div className="text-center">
            <Button 
              onClick={startMigration}
              variant="outline"
              disabled={isRunning}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Setup
            </Button>
          </div>
        )}

        {/* Additional Info */}
        <div className="text-xs text-muted-foreground text-center">
          This will create approximately 20+ database tables including all business logic, 
          indexes, functions, and security policies needed for the application.
        </div>
      </CardContent>
    </Card>
  );
}
