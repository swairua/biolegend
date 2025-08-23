import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Database,
  Play,
  RefreshCw
} from 'lucide-react';
import { quickDatabaseAudit, checkFormFunctionality, type QuickAuditResult } from '@/utils/quickDatabaseAudit';

export function QuickAuditRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [auditResult, setAuditResult] = useState<QuickAuditResult | null>(null);
  const [formTests, setFormTests] = useState<any[]>([]);
  const [autoRun, setAutoRun] = useState(false);

  const runAudit = async () => {
    setIsRunning(true);
    setAuditResult(null);
    setFormTests([]);

    try {
      console.log('🔍 Running quick database audit...');
      
      // Run database structure audit
      const dbResult = await quickDatabaseAudit();
      setAuditResult(dbResult);

      // Run form functionality tests
      const formResult = await checkFormFunctionality();
      setFormTests(formResult);

    } catch (error: any) {
      console.error('Audit failed:', error);
      setAuditResult({
        tablesChecked: 0,
        columnsVerified: 0,
        missingColumns: [],
        criticalIssues: [`Audit failed: ${error.message}`],
        status: 'error',
        details: { error }
      });
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (autoRun) {
      runAudit();
    }
  }, [autoRun]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-600';
      case 'incomplete': return 'text-orange-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'incomplete': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Database className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Structure Audit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={runAudit} disabled={isRunning}>
              {isRunning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Running Audit...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Quick Audit
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setAutoRun(true)}
              disabled={isRunning}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Auto-Run
            </Button>
          </div>

          {auditResult && (
            <Alert className={auditResult.status === 'complete' ? 'border-green-200 bg-green-50' : 
                             auditResult.status === 'incomplete' ? 'border-orange-200 bg-orange-50' : 
                             'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-2">
                {getStatusIcon(auditResult.status)}
                <AlertDescription className={getStatusColor(auditResult.status)}>
                  <strong>Status: {auditResult.status.toUpperCase()}</strong>
                  <br />
                  {auditResult.columnsVerified}/{auditResult.tablesChecked} critical columns verified
                  {auditResult.criticalIssues.length > 0 && (
                    <>
                      <br />Issues: {auditResult.criticalIssues.join(', ')}
                    </>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {auditResult?.missingColumns && auditResult.missingColumns.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-red-600">Missing Columns ({auditResult.missingColumns.length}):</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {auditResult.missingColumns.map((col, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <XCircle className="h-3 w-3 text-red-500" />
                    <span className="font-mono">{col.table}.{col.column}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formTests.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Form Functionality Tests:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {formTests.map((test, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 border rounded text-sm">
                    <span>{test.form}</span>
                    <Badge variant={test.status === 'PASS' ? 'default' : 'destructive'}>
                      {test.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {auditResult?.status === 'complete' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ✅ All critical database fixes have been verified! Your forms should work correctly.
              </AlertDescription>
            </Alert>
          )}

          {auditResult?.status === 'incomplete' && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                ⚠️ Some database fixes are still missing. Consider running the migration script.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
