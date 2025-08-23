import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Database,
  Copy,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { runDatabaseFixes, verifyDatabaseStructure, getManualMigrationSQL, type DatabaseFixResult } from '@/utils/runDatabaseFixes';

export function DatabaseFixRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DatabaseFixResult | null>(null);
  const [verification, setVerification] = useState<any[]>([]);
  const [manualSQL, setManualSQL] = useState<string>('');

  const handleRunFixes = async () => {
    setIsRunning(true);
    setResult(null);
    setVerification([]);
    
    try {
      const fixResult = await runDatabaseFixes();
      setResult(fixResult);

      if (fixResult.success) {
        // Get verification data
        const verifyData = await verifyDatabaseStructure();
        if (verifyData) {
          setVerification(verifyData);
        }
      } else {
        // Get manual SQL for copy-paste
        const sql = await getManualMigrationSQL();
        setManualSQL(sql);
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: 'Unexpected error occurred',
        error: error.message
      });
    } finally {
      setIsRunning(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const groupedColumns = verification.reduce((acc, col) => {
    if (!acc[col.table_name]) {
      acc[col.table_name] = [];
    }
    acc[col.table_name].push(col);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Structure Fixes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            This will fix all identified issues between forms and database structure:
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Issues to Fix:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Missing unit_of_measure columns</li>
                <li>• Missing delivery tracking fields</li>
                <li>• Missing LPO number on invoices</li>
                <li>• Missing discount columns</li>
                <li>• Missing tax columns</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Tables to Update:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• lpo_items, delivery_note_items</li>
                <li>• invoices, delivery_notes</li>
                <li>• invoice_items, quotation_items</li>
                <li>• proforma_items, products</li>
                <li>• customers, payments</li>
              </ul>
            </div>
          </div>

          <Button 
            onClick={handleRunFixes} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Running Database Fixes...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Database Fixes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Execution Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription className="text-sm">
                {result.message}
              </AlertDescription>
            </Alert>

            {result.error && (
              <div className="mt-4">
                <h4 className="font-medium text-red-600 mb-2">Error Details:</h4>
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded border">
                  {result.error}
                </div>
              </div>
            )}

            {!result.success && manualSQL && (
              <div className="mt-4 space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Automatic execution failed. Please copy the SQL below and run it manually in Supabase SQL Editor.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Manual Migration SQL:</h4>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(manualSQL)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy SQL
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('https://supabase.com/dashboard/project/_/sql', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open Supabase
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={manualSQL}
                    readOnly
                    className="h-40 font-mono text-xs"
                    placeholder="Loading SQL..."
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {verification.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Database Structure Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Verified {verification.length} columns across {Object.keys(groupedColumns).length} tables.
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(groupedColumns).map(([tableName, columns]) => (
                  <div key={tableName} className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2 text-sm">{tableName}</h4>
                    <div className="space-y-1">
                      {columns.slice(0, 5).map((col, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{col.column_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {col.data_type}
                          </Badge>
                        </div>
                      ))}
                      {columns.length > 5 && (
                        <div className="text-xs text-muted-foreground">
                          +{columns.length - 5} more columns
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
