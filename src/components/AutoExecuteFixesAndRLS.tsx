import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Database,
  Shield,
  Play
} from 'lucide-react';
import { runFixesAndRemoveRLS, type FixAndRLSResult } from '@/utils/runFixesAndRemoveRLS';

export function AutoExecuteFixesAndRLS() {
  const [isExecuting, setIsExecuting] = useState(true);
  const [result, setResult] = useState<FixAndRLSResult | null>(null);

  useEffect(() => {
    const executeAutomatically = async () => {
      console.log('🚀 Auto-executing database fixes and RLS removal...');
      
      try {
        const fixResult = await runFixesAndRemoveRLS();
        setResult(fixResult);
      } catch (error: any) {
        setResult({
          success: false,
          message: 'Auto-execution failed',
          error: error.message
        });
      } finally {
        setIsExecuting(false);
      }
    };

    // Execute immediately when component mounts
    executeAutomatically();
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Fixes & RLS Removal</h1>
          <p className="text-muted-foreground">
            Executing all database structure fixes and removing RLS policies
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Database className="h-3 w-3" />
          Auto-Execute
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isExecuting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600" />
                Executing Database Fixes and RLS Removal...
              </>
            ) : result?.success ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Execution Completed Successfully
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                Execution Failed
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isExecuting && (
            <Alert>
              <Play className="h-4 w-4" />
              <AlertDescription>
                Running database fixes and removing RLS policies. This may take a few moments...
              </AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription className="text-sm">
                {result.message}
              </AlertDescription>
            </Alert>
          )}

          {result?.error && (
            <div className="mt-4">
              <h4 className="font-medium text-red-600 mb-2">Error Details:</h4>
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded border">
                {result.error}
              </div>
            </div>
          )}

          {result?.success && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-green-200 bg-green-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Database className="h-5 w-5 text-green-600" />
                      Database Fixes Applied
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>Missing columns added</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>Tax structure fixed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>Form field mapping resolved</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>Stock level naming fixed</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      RLS Policies Removed
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-blue-600" />
                        <span>Row Level Security disabled</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-blue-600" />
                        <span>All RLS policies dropped</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-blue-600" />
                        <span>Full access granted</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-blue-600" />
                        <span>Sequence permissions granted</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Success!</strong> All database structure issues have been resolved and RLS policies have been removed. 
                  Your forms should now work without any database-related errors.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {!result?.success && result?.details?.sql && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Manual SQL Required:</h4>
              <div className="text-xs font-mono bg-gray-100 p-3 rounded border max-h-40 overflow-y-auto">
                {result.details.sql}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Copy the SQL above and run it manually in Supabase SQL Editor.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
