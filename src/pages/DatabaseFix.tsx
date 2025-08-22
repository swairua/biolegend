import React, { useEffect, useState } from 'react';
import { DatabaseFixInterface } from '@/components/DatabaseFixInterface';
import { executeDirectDatabaseFix, testApplicationFunctionality } from '@/utils/executeDirectFix';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Wrench } from 'lucide-react';
import { toast } from 'sonner';

export default function DatabaseFix() {
  const [diagnosticsResult, setDiagnosticsResult] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runFullDiagnostics = async () => {
    setIsRunning(true);
    try {
      console.log('🚀 Running comprehensive database diagnostics...');
      
      // Run direct database fix check
      const fixResult = await executeDirectDatabaseFix();
      setDiagnosticsResult(fixResult);
      
      // Test application functionality
      const appTest = await testApplicationFunctionality();
      setTestResult(appTest);
      
      if (fixResult.success) {
        toast.success('Database is fully operational!');
      } else if (fixResult.needsManualAction) {
        toast.warning('Database needs manual SQL execution to complete setup');
      } else {
        toast.error('Database has issues that need attention');
      }
      
    } catch (error) {
      console.error('Error running diagnostics:', error);
      toast.error('Failed to run diagnostics');
    } finally {
      setIsRunning(false);
    }
  };

  // Auto-run diagnostics on page load
  useEffect(() => {
    runFullDiagnostics();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Fix & Diagnostics</h1>
          <p className="text-muted-foreground">
            Resolve database issues and ensure all systems are operational
          </p>
        </div>
        <Button 
          onClick={runFullDiagnostics} 
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          <Wrench className="h-4 w-4" />
          {isRunning ? 'Running...' : 'Run Full Diagnostics'}
        </Button>
      </div>

      {/* Diagnostics Results */}
      {diagnosticsResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {diagnosticsResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              Database Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={diagnosticsResult.taxColumnsFixed ? 'default' : 'destructive'}>
                    {diagnosticsResult.taxColumnsFixed ? '✅' : '❌'}
                  </Badge>
                  <span>Tax Columns</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={diagnosticsResult.lpoTablesCreated ? 'default' : 'destructive'}>
                    {diagnosticsResult.lpoTablesCreated ? '✅' : '❌'}
                  </Badge>
                  <span>LPO Tables</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm">
                  <strong>Status:</strong> {diagnosticsResult.success ? 'Fully Operational' : 'Needs Setup'}
                </div>
                <div className="text-sm">
                  <strong>Action Required:</strong> {diagnosticsResult.needsManualAction ? 'Yes - Manual SQL' : 'None'}
                </div>
              </div>
            </div>

            {diagnosticsResult.warnings && diagnosticsResult.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Warnings:</h4>
                {diagnosticsResult.warnings.map((warning: string, index: number) => (
                  <Alert key={index}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{warning}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {diagnosticsResult.errors && diagnosticsResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Errors:</h4>
                {diagnosticsResult.errors.map((error: string, index: number) => (
                  <Alert key={index} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {diagnosticsResult.guidance && (
              <div className="space-y-2">
                <h4 className="font-medium">Next Steps:</h4>
                {diagnosticsResult.guidance.urgentFixes.map((fix: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge variant="destructive">URGENT</Badge>
                    <span className="text-sm">{fix}</span>
                  </div>
                ))}
                {diagnosticsResult.guidance.nextSteps.map((step: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge variant="secondary">TODO</Badge>
                    <span className="text-sm">{step}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Application Test Results */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult.allWorking ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              Application Functionality Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm font-medium">{testResult.summary}</div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Badge variant={testResult.quotationSystemWorking ? 'default' : 'destructive'}>
                  {testResult.quotationSystemWorking ? '✅' : '❌'}
                </Badge>
                <span>Quotations</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={testResult.lpoSystemWorking ? 'default' : 'destructive'}>
                  {testResult.lpoSystemWorking ? '✅' : '❌'}
                </Badge>
                <span>LPO System</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={testResult.authenticationWorking ? 'default' : 'destructive'}>
                  {testResult.authenticationWorking ? '✅' : '❌'}
                </Badge>
                <span>Authentication</span>
              </div>
            </div>

            {testResult.errors && testResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Test Errors:</h4>
                {testResult.errors.map((error: string, index: number) => (
                  <Alert key={index} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Interactive Fix Interface */}
      <DatabaseFixInterface />

      {/* Current Issues Summary */}
      <Card>
        <CardHeader>
          <CardTitle>🚨 Known Issues & Solutions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Primary Issue:</strong> Missing tax_amount columns in quotation_items and invoice_items tables.
              This causes "could not find the tax_amount column" errors when creating quotations.
            </AlertDescription>
          </Alert>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Secondary Issue:</strong> Missing LPO (Local Purchase Order) system tables.
              This prevents the purchase order functionality from working.
            </AlertDescription>
          </Alert>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Solution:</strong> Execute the provided SQL scripts in your Supabase dashboard.
              Use the tabs above to copy the appropriate SQL and run it in Supabase SQL Editor.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
