import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Settings, 
  Copy,
  Play,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  auditCompaniesTable, 
  fixCompaniesTable, 
  ensureCompaniesTableComplete,
  testCompaniesTable,
  MANUAL_COMPANIES_FIX_SQL,
  type CompaniesTableAudit 
} from '@/utils/auditAndFixCompaniesTable';

export function CompaniesTableAuditPanel() {
  const [audit, setAudit] = useState<CompaniesTableAudit | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [fixResults, setFixResults] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<string[]>([]);

  const handleAudit = async () => {
    setIsAuditing(true);
    try {
      const auditResult = await auditCompaniesTable();
      setAudit(auditResult);
      
      if (auditResult.hasAllRequiredColumns) {
        toast.success('Companies table audit completed - all columns present!');
      } else {
        toast.warning(`Audit completed - ${auditResult.missingColumns.length} columns missing`);
      }
    } catch (error) {
      toast.error('Audit failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsAuditing(false);
    }
  };

  const handleQuickFix = async () => {
    setIsFixing(true);
    setFixResults([]);
    
    try {
      const result = await ensureCompaniesTableComplete();
      setFixResults(result.details);
      
      if (result.success) {
        toast.success(result.message);
        // Re-audit after fix
        await handleAudit();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast.error('Fix failed: ' + errorMsg);
      setFixResults([errorMsg]);
    } finally {
      setIsFixing(false);
    }
  };

  const handleTestTable = async () => {
    setIsTesting(true);
    setTestResults([]);
    
    try {
      const result = await testCompaniesTable();
      setTestResults([result.message, ...result.errors]);
      
      if (result.success) {
        toast.success('All companies table tests passed!');
      } else {
        toast.error(`Tests failed: ${result.errors.length} issues found`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast.error('Testing failed: ' + errorMsg);
      setTestResults([errorMsg]);
    } finally {
      setIsTesting(false);
    }
  };

  const copyManualSQL = () => {
    navigator.clipboard.writeText(MANUAL_COMPANIES_FIX_SQL);
    toast.success('Manual SQL copied to clipboard! Paste it in Supabase SQL Editor.');
  };

  const getStatusIcon = (hasAllColumns: boolean, exists: boolean) => {
    if (!exists) return <XCircle className="h-5 w-5 text-destructive" />;
    if (hasAllColumns) return <CheckCircle className="h-5 w-5 text-success" />;
    return <AlertTriangle className="h-5 w-5 text-warning" />;
  };

  const getStatusBadge = (hasAllColumns: boolean, exists: boolean) => {
    if (!exists) return <Badge variant="destructive">Table Missing</Badge>;
    if (hasAllColumns) return <Badge variant="default" className="bg-success text-success-foreground">Complete</Badge>;
    return <Badge variant="secondary" className="bg-warning text-warning-foreground">Incomplete</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="h-6 w-6" />
            Companies Table Audit
          </h2>
          <p className="text-muted-foreground">
            Diagnose and fix companies table schema issues
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleAudit}
            disabled={isAuditing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${isAuditing ? 'animate-spin' : ''}`} />
            {isAuditing ? 'Auditing...' : 'Run Audit'}
          </Button>
        </div>
      </div>

      {/* Current Issue Alert */}
      <Alert className="border-destructive bg-destructive/5">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Issue:</strong> "Could not find the 'fiscal_year_start' column of 'companies' in the schema cache"
          <br />
          This indicates missing columns in the companies table. Run the audit below to diagnose and fix.
        </AlertDescription>
      </Alert>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Button 
              onClick={handleQuickFix}
              disabled={isFixing}
              className="w-full"
              variant="default"
            >
              <Play className={`h-4 w-4 ${isFixing ? 'animate-spin' : ''}`} />
              {isFixing ? 'Fixing...' : 'Auto-Fix Table'}
            </Button>
            
            <Button 
              onClick={handleTestTable}
              disabled={isTesting}
              variant="outline"
              className="w-full"
            >
              <CheckCircle className={`h-4 w-4 ${isTesting ? 'animate-pulse' : ''}`} />
              {isTesting ? 'Testing...' : 'Test Functionality'}
            </Button>
            
            <Button 
              onClick={copyManualSQL}
              variant="secondary"
              className="w-full"
            >
              <Copy className="h-4 w-4" />
              Copy Manual SQL
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            <strong>Auto-Fix:</strong> Automatically adds missing columns to companies table.
            <br />
            <strong>Manual SQL:</strong> If auto-fix fails, copy SQL to run manually in Supabase.
          </p>
        </CardContent>
      </Card>

      {/* Audit Results */}
      {audit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {getStatusIcon(audit.hasAllRequiredColumns, audit.exists)}
                Audit Results
              </span>
              {getStatusBadge(audit.hasAllRequiredColumns, audit.exists)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium text-foreground mb-2">Table Status</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Table Exists:</span>
                    <span className={audit.exists ? 'text-success' : 'text-destructive'}>
                      {audit.exists ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Columns Found:</span>
                    <span>{audit.columns.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expected Columns:</span>
                    <span>{audit.expectedColumns.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Missing Columns:</span>
                    <span className={audit.missingColumns.length > 0 ? 'text-warning' : 'text-success'}>
                      {audit.missingColumns.length}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-2">Schema Health</h4>
                <div className="space-y-2">
                  {audit.hasAllRequiredColumns ? (
                    <div className="flex items-center gap-2 text-success text-sm">
                      <CheckCircle className="h-4 w-4" />
                      All required columns present
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-warning text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      Schema incomplete - action required
                    </div>
                  )}
                </div>
              </div>
            </div>

            {audit.missingColumns.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    Missing Columns ({audit.missingColumns.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {audit.missingColumns.map((col) => (
                      <Badge key={col} variant="destructive" className="text-xs">
                        {col}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {audit.columns.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Existing Columns ({audit.columns.length})
                  </h4>
                  <div className="grid gap-2 max-h-40 overflow-y-auto">
                    {audit.columns.map((col) => (
                      <div key={col.column_name} className="flex justify-between items-center text-sm bg-muted/50 p-2 rounded">
                        <span className="font-mono">{col.column_name}</span>
                        <span className="text-muted-foreground">{col.data_type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fix Results */}
      {fixResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Fix Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {fixResults.map((result, index) => (
                <div key={index} className="text-sm p-2 bg-muted/50 rounded font-mono">
                  {result}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`text-sm p-2 rounded font-mono ${
                    result.includes('✅') ? 'bg-success/10 text-success-foreground' :
                    result.includes('❌') ? 'bg-destructive/10 text-destructive-foreground' :
                    'bg-muted/50'
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Manual Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            If the auto-fix doesn't work, you can manually run the SQL in Supabase:
          </p>
          <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
            <li>Click "Copy Manual SQL" button above</li>
            <li>Go to your Supabase Dashboard → SQL Editor</li>
            <li>Paste the copied SQL and run it</li>
            <li>Come back here and click "Run Audit" to verify</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
