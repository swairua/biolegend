import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Wrench, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { fixMissingColumns, generateSchemaFixSQL } from '@/utils/directSchemaFix';

interface QuickSchemaFixProps {
  onSuccess?: () => void;
}

export function QuickSchemaFix({ onSuccess }: QuickSchemaFixProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [sqlStatements, setSqlStatements] = useState<string[]>([]);

  const runQuickFix = async () => {
    setIsRunning(true);
    setResult(null);
    
    try {
      const fixResult = await fixMissingColumns();
      setResult(fixResult);
      
      if (fixResult.success) {
        toast.success('Schema fixed successfully! Currency column added.');
        onSuccess?.();
      } else if (fixResult.errors.length > 0) {
        // If automatic fix failed, generate SQL for manual execution
        const { sql, missing } = await generateSchemaFixSQL();
        setSqlStatements(sql);
        toast.error('Automatic fix failed. Manual SQL provided below.');
      }
    } catch (error) {
      console.error('Quick schema fix error:', error);
      toast.error('Schema fix failed. Please try the manual setup page.');
    } finally {
      setIsRunning(false);
    }
  };

  const generateSQL = async () => {
    try {
      const { sql, missing } = await generateSchemaFixSQL();
      setSqlStatements(sql);
      
      if (sql.length > 0) {
        toast.success(`Generated SQL for ${missing.length} missing columns`);
      } else {
        toast.info('No missing columns detected');
      }
    } catch (error) {
      toast.error('Failed to generate SQL');
    }
  };

  const copySQL = () => {
    const sqlText = sqlStatements.join('\n');
    navigator.clipboard.writeText(sqlText);
    toast.success('SQL copied to clipboard!');
  };

  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-orange-800 dark:text-orange-200">
          <AlertTriangle className="h-5 w-5" />
          <span>Database Schema Issue Detected</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-orange-200 bg-orange-100 dark:bg-orange-900/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            The 'currency' column is missing from the companies table. This needs to be fixed before you can save company settings.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={runQuickFix}
            disabled={isRunning}
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:text-orange-200"
          >
            {isRunning ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600" />
            ) : (
              <Wrench className="h-4 w-4" />
            )}
            {isRunning ? 'Fixing...' : 'Quick Fix'}
          </Button>

          <Button
            onClick={generateSQL}
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:text-orange-200"
          >
            <Copy className="h-4 w-4 mr-2" />
            Generate SQL
          </Button>

          <Button
            onClick={() => window.open('/manual-setup', '_blank')}
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:text-orange-200"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Manual Setup
          </Button>
        </div>

        {result && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <span className={result.success ? 'text-green-800' : 'text-red-800'}>
                {result.message}
              </span>
            </div>

            {result.columnsAdded && result.columnsAdded.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-sm text-muted-foreground">Added columns:</span>
                {result.columnsAdded.map((col: string) => (
                  <Badge key={col} variant="secondary" className="text-xs">
                    {col}
                  </Badge>
                ))}
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="space-y-1">
                <span className="text-sm font-medium text-red-800">Errors:</span>
                {result.errors.map((error: string, index: number) => (
                  <div key={index} className="text-sm text-red-700">
                    • {error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {sqlStatements.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Manual SQL (execute in Supabase SQL Editor):
              </span>
              <Button onClick={copySQL} size="sm" variant="ghost">
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-sm font-mono overflow-x-auto">
              {sqlStatements.map((sql, index) => (
                <div key={index} className="mb-1">
                  {sql}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-orange-700 dark:text-orange-300 space-y-1">
          <p>• <strong>Quick Fix:</strong> Attempts to add missing columns automatically</p>
          <p>• <strong>Generate SQL:</strong> Provides SQL commands for manual execution</p>
          <p>• <strong>Manual Setup:</strong> Opens the full database setup page</p>
        </div>
      </CardContent>
    </Card>
  );
}
