import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Database, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Zap, 
  Table,
  Settings,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { auditDatabaseState, forceAllMigrations, type DatabaseAuditResult } from '@/utils/databaseAudit';
import { MigrationExecutor } from './MigrationExecutor';

export function DatabaseAuditPanel() {
  const [isAuditing, setIsAuditing] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [auditResult, setAuditResult] = useState<DatabaseAuditResult | null>(null);
  const [migrationResults, setMigrationResults] = useState<any[] | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleAudit = async () => {
    setIsAuditing(true);
    setAuditResult(null);
    setMigrationResults(null);

    try {
      const result = await auditDatabaseState();
      setAuditResult(result);
      
      if (result.summary.criticalIssues.length > 0) {
        toast.warning(`Found ${result.summary.criticalIssues.length} critical issues that need migration`);
      } else {
        toast.success('Database audit completed - no critical issues found!');
      }
    } catch (error) {
      console.error('Audit error:', error);
      toast.error('Database audit failed. Check console for details.');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleForceAllMigrations = async () => {
    setIsMigrating(true);
    setMigrationResults(null);

    try {
      const result = await forceAllMigrations();
      setMigrationResults(result.details);
      
      if (result.success) {
        toast.success('All migrations completed successfully!');
        // Re-run audit after successful migration
        setTimeout(() => handleAudit(), 1000);
      } else {
        toast.error('Some migrations failed. Check details below.');
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Migration process failed. Check console for details.');
    } finally {
      setIsMigrating(false);
    }
  };

  const getStatusBadge = (exists: boolean, label: string) => (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Badge variant={exists ? "default" : "destructive"}>
        {exists ? (
          <><CheckCircle className="h-3 w-3 mr-1" />Exists</>
        ) : (
          <><AlertTriangle className="h-3 w-3 mr-1" />Missing</>
        )}
      </Badge>
    </div>
  );

  const getRpcStatusBadge = (exists: boolean, label: string) => (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Badge variant={exists ? "default" : "destructive"}>
        {exists ? (
          <><CheckCircle className="h-3 w-3 mr-1" />Available</>
        ) : (
          <><AlertTriangle className="h-3 w-3 mr-1" />Missing</>
        )}
      </Badge>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Primary Migration Interface */}
      <MigrationExecutor />

      {/* Advanced Audit Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Advanced Database Audit & Manual Migration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={handleAudit}
              disabled={isAuditing || isMigrating}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isAuditing ? 'animate-spin' : ''}`} />
              {isAuditing ? 'Auditing...' : 'Run Database Audit'}
            </Button>

            {auditResult && auditResult.summary.criticalIssues.length > 0 && (
              <Button
                onClick={handleForceAllMigrations}
                disabled={isAuditing || isMigrating}
              >
                <Zap className="h-4 w-4 mr-2" />
                {isMigrating ? 'Running Migrations...' : 'Force All Migrations'}
              </Button>
            )}
          </div>

          {auditResult && (
            <div className="space-y-4">
              <Separator />
              
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Table className="h-4 w-4" />
                      LPO System Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {getStatusBadge(auditResult.lposTable.exists, 'Main LPO Table')}
                    {getStatusBadge(auditResult.lpoItemsTable.exists, 'LPO Items Table')}
                    {getRpcStatusBadge(auditResult.rpcFunctions.generateLpoNumber, 'LPO Number Generator')}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Tax System Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {getStatusBadge(auditResult.taxSettingsTable.exists, 'Tax Settings Table')}
                    {getStatusBadge(auditResult.quotationItemsTaxColumns.exists, 'Quotation Tax Columns')}
                    {getStatusBadge(auditResult.invoiceItemsTaxColumns.exists, 'Invoice Tax Columns')}
                  </CardContent>
                </Card>
              </div>

              {/* Critical Issues */}
              {auditResult.summary.criticalIssues.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div>
                      <strong>Critical Issues Found ({auditResult.summary.criticalIssues.length}):</strong>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        {auditResult.summary.criticalIssues.map((issue, index) => (
                          <li key={index} className="text-sm">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Success Message */}
              {auditResult.summary.criticalIssues.length === 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>All systems operational!</strong> No critical database issues found. 
                    Your purchase order system is ready to use.
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Details */}
              {(auditResult.lposTable.error || auditResult.quotationItemsTaxColumns.error) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Error Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {auditResult.lposTable.error && (
                      <div className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
                        <strong>LPO Table Error:</strong> {auditResult.lposTable.error}
                      </div>
                    )}
                    {auditResult.quotationItemsTaxColumns.error && (
                      <div className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
                        <strong>Tax Columns Error:</strong> {auditResult.quotationItemsTaxColumns.error}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Migration Results */}
          {migrationResults && (
            <div className="space-y-4">
              <Separator />
              <h3 className="font-medium">Migration Results:</h3>
              <div className="space-y-2">
                {migrationResults.map((result, index) => (
                  <Alert key={index} variant={result.success ? "default" : "destructive"}>
                    {result.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      <strong>{result.step}:</strong> {result.message}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
