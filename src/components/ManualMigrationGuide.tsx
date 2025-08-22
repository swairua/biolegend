import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  ExternalLink, 
  Copy, 
  RefreshCw,
  CheckCircle, 
  AlertTriangle,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { executeDirectMigration, getManualMigrationSQL, type MigrationResult } from '@/utils/directMigration';
import { verifyDatabaseComponents } from '@/utils/verifyDatabaseFix';

export function ManualMigrationGuide() {
  const [isChecking, setIsChecking] = useState(false);
  const [migrationResults, setMigrationResults] = useState<MigrationResult[]>([]);
  const [showSQL, setShowSQL] = useState(false);
  const migrationSQL = getManualMigrationSQL();

  const checkMigrationStatus = async () => {
    setIsChecking(true);
    try {
      // Use the new verification approach
      const verification = await verifyDatabaseComponents();

      // Convert to the expected format
      const results: MigrationResult[] = [
        {
          step: 'LPO Tables',
          success: verification.lpoTables,
          message: verification.lpoTables ? 'LPO tables are ready' : 'LPO tables need to be created'
        },
        {
          step: 'Tax Columns',
          success: verification.taxColumns,
          message: verification.taxColumns ? 'Tax columns are ready' : 'Tax columns need to be added'
        },
        {
          step: 'RPC Functions',
          success: verification.rpcFunction,
          message: verification.rpcFunction ? 'RPC functions are ready' : 'RPC functions need to be created'
        }
      ];

      setMigrationResults(results);

      if (verification.isReady) {
        toast.success('🎉 All database components are ready!');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.warning(`${verification.totalCount - verification.readyCount} components need manual setup`);
        setShowSQL(true);
      }
    } catch (error) {
      console.error('Migration check failed:', error);
      toast.error('Failed to check migration status');
    } finally {
      setIsChecking(false);
    }
  };

  const copySQL = () => {
    navigator.clipboard.writeText(migrationSQL);
    toast.success('SQL copied to clipboard!');
  };

  const openSupabaseSQL = () => {
    // Try to open Supabase SQL editor - this is a generic URL pattern
    window.open('https://supabase.com/dashboard/project', '_blank');
    toast.info('Opening Supabase dashboard. Navigate to SQL Editor to paste the migration.');
  };

  useEffect(() => {
    // Auto-check status when component mounts
    checkMigrationStatus();
  }, []);

  const getStatusBadge = (success: boolean) => (
    <Badge variant={success ? "default" : "destructive"}>
      {success ? (
        <><CheckCircle className="h-3 w-3 mr-1" />Ready</>
      ) : (
        <><AlertTriangle className="h-3 w-3 mr-1" />Missing</>
      )}
    </Badge>
  );

  const allReady = migrationResults.length > 0 && migrationResults.every(r => r.success);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Migration Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Check */}
          <div className="flex items-center gap-3">
            <Button
              onClick={checkMigrationStatus}
              disabled={isChecking}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Checking...' : 'Check Database Status'}
            </Button>
            
            {allReady && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                All Components Ready
              </Badge>
            )}
          </div>

          {/* Migration Results */}
          {migrationResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium">Database Component Status:</h3>
              <div className="grid gap-3">
                {migrationResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{result.step}</div>
                      <div className="text-xs text-muted-foreground">{result.message}</div>
                    </div>
                    {getStatusBadge(result.success)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual Migration Instructions */}
          {showSQL && !allReady && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Manual Database Setup Required</strong><br />
                Your Supabase instance doesn't have the exec_sql RPC function, so we need to run the migration manually.
              </AlertDescription>
            </Alert>
          )}

          {showSQL && !allReady && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">Manual Migration Steps:</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center font-medium">1</span>
                  <span>Open your Supabase SQL Editor</span>
                  <Button onClick={openSupabaseSQL} variant="outline" size="sm">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open Supabase
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center font-medium">2</span>
                  <span>Copy the migration SQL</span>
                  <Button onClick={copySQL} variant="outline" size="sm">
                    <Copy className="h-3 w-3 mr-1" />
                    Copy SQL
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center font-medium">3</span>
                  <span>Paste and run the SQL in Supabase SQL Editor</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center font-medium">4</span>
                  <span>Return here and click "Check Database Status" to verify</span>
                </div>
              </div>

              {/* SQL Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Migration SQL
                  </h4>
                  <Button onClick={copySQL} variant="outline" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All
                  </Button>
                </div>
                <Textarea
                  value={migrationSQL}
                  readOnly
                  className="font-mono text-xs h-64"
                  placeholder="Migration SQL will appear here..."
                />
              </div>
            </div>
          )}

          {/* Success Message */}
          {allReady && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>🎉 Database Ready!</strong><br />
                All required tables and functions are in place. Your purchase order system is ready to use.
                The page will refresh automatically.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
