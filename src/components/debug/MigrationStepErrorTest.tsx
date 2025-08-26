import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { executeSQL, formatSQLForManualExecution } from '@/utils/execSQL';
import { parseErrorMessage } from '@/utils/errorHelpers';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Database,
  Play,
  Zap
} from 'lucide-react';

interface TestResult {
  stepName: string;
  sql: string;
  result: 'success' | 'error' | 'manual_required';
  message: string;
  rawError?: any;
  parsedError?: string;
}

export function MigrationStepErrorTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const testMigrationSteps = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test scenarios that might cause "[object Object]" errors
    const testSteps = [
      {
        name: 'Drop Incorrect Tables (Expected to fail)',
        sql: `
          DROP TABLE IF EXISTS non_existent_table CASCADE;
          DROP TABLE IF EXISTS another_fake_table CASCADE;
        `
      },
      {
        name: 'Create Table with Invalid Syntax',
        sql: `
          CREATE TABLE test_invalid_table (
            id UUID PRIMARY KEY,
            invalid_column INVALID_TYPE
          );
        `
      },
      {
        name: 'Create Function (May require manual execution)',
        sql: `
          CREATE OR REPLACE FUNCTION test_function()
          RETURNS TEXT AS $$
          BEGIN
            RETURN 'test';
          END;
          $$ LANGUAGE plpgsql;
        `
      },
      {
        name: 'Valid Simple Query',
        sql: `SELECT 1 as test_column;`
      }
    ];

    const results: TestResult[] = [];

    for (const step of testSteps) {
      try {
        console.log(`Testing step: ${step.name}`);
        
        const result = await executeSQL(step.sql);
        
        if (result.manual_execution_required) {
          results.push({
            stepName: step.name,
            sql: step.sql,
            result: 'manual_required',
            message: 'Manual execution required in Supabase SQL Editor',
            parsedError: 'N/A - requires manual execution'
          });
          
          toast.warning(`⚠️ ${step.name} requires manual execution`);
          
        } else if (result.error) {
          // This is where the error should be properly parsed
          const parsedErrorMessage = parseErrorMessage(result.error);
          
          results.push({
            stepName: step.name,
            sql: step.sql,
            result: 'error',
            message: parsedErrorMessage,
            rawError: result.error,
            parsedError: parsedErrorMessage
          });
          
          // Check if the error contains "[object Object]"
          if (parsedErrorMessage.includes('[object Object]')) {
            toast.error(`❌ Found [object Object] in: ${step.name}`);
          } else {
            toast.info(`ℹ️ ${step.name} failed with proper error message`);
          }
          
        } else {
          results.push({
            stepName: step.name,
            sql: step.sql,
            result: 'success',
            message: 'Executed successfully',
            parsedError: 'N/A - success'
          });
          
          toast.success(`✅ ${step.name} completed`);
        }
        
      } catch (stepError: any) {
        // Test the error handling that would happen in ForceCreditNoteCorrectMigration
        const parsedStepError = parseErrorMessage(stepError);
        
        results.push({
          stepName: step.name,
          sql: step.sql,
          result: 'error',
          message: parsedStepError,
          rawError: stepError,
          parsedError: parsedStepError
        });
        
        // Check if we get "[object Object]" in the catch block
        if (parsedStepError.includes('[object Object]')) {
          toast.error(`❌ Found [object Object] in catch block for: ${step.name}`);
        } else {
          toast.info(`ℹ️ ${step.name} catch block handled error properly`);
        }
      }
    }

    setTestResults(results);
    setIsRunning(false);

    // Summary analysis
    const hasObjectObjectErrors = results.some(r => 
      r.parsedError?.includes('[object Object]') || 
      r.message.includes('[object Object]')
    );

    if (hasObjectObjectErrors) {
      toast.error('🚨 Found "[object Object]" errors in migration step handling!');
    } else {
      toast.success('🎉 All migration step errors are properly parsed!');
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'success': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'manual_required': return <AlertTriangle className="h-4 w-4 text-warning" />;
      default: return <Database className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getResultBadge = (result: string) => {
    const variants = {
      success: 'default',
      error: 'destructive',
      manual_required: 'secondary'
    } as const;
    
    return (
      <Badge variant={variants[result] || 'outline'} className="text-xs">
        {result.toUpperCase().replace('_', ' ')}
      </Badge>
    );
  };

  const hasObjectObjectErrors = testResults.some(r => 
    r.parsedError?.includes('[object Object]') || 
    r.message.includes('[object Object]')
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-primary" />
          <span>Migration Step Error Test</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <Button onClick={testMigrationSteps} disabled={isRunning}>
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Testing Migration Steps...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Test Migration Error Handling
              </>
            )}
          </Button>
        </div>

        {testResults.length > 0 && (
          <>
            {hasObjectObjectErrors ? (
              <Alert className="border-destructive/20 bg-destructive-light/10">
                <XCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive-foreground">
                  <strong>❌ Found "[object Object]" Errors!</strong><br />
                  Some migration steps are still showing object references instead of proper error messages.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-success/20 bg-success-light/10">
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertDescription className="text-success-foreground">
                  <strong>✅ All Error Messages Properly Parsed!</strong><br />
                  No "[object Object]" errors found in migration step handling.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <h4 className="font-medium">Test Results:</h4>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getResultIcon(result.result)}
                        <span className="font-medium text-sm">{result.stepName}</span>
                      </div>
                      {getResultBadge(result.result)}
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div><strong>Message:</strong> {result.message}</div>
                      <div><strong>Parsed Error:</strong> {result.parsedError}</div>
                      {result.rawError && (
                        <div><strong>Raw Error Type:</strong> {typeof result.rawError}</div>
                      )}
                    </div>

                    {result.parsedError?.includes('[object Object]') && (
                      <div className="mt-2 p-2 bg-destructive-light border border-destructive/20 rounded">
                        <div className="text-xs text-destructive">
                          🚨 <strong>ISSUE FOUND:</strong> This error contains "[object Object]"
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-lg font-bold text-success">
                  {testResults.filter(r => r.result === 'success').length}
                </div>
                <div className="text-xs text-muted-foreground">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-destructive">
                  {testResults.filter(r => r.result === 'error').length}
                </div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-warning">
                  {testResults.filter(r => r.result === 'manual_required').length}
                </div>
                <div className="text-xs text-muted-foreground">Manual Required</div>
              </div>
            </div>
          </>
        )}

        <div className="p-3 bg-muted rounded text-sm">
          <h4 className="font-medium mb-2">What this tests:</h4>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>• executeSQL function error handling</li>
            <li>• parseErrorMessage utility function</li>
            <li>• Migration step catch block error parsing</li>
            <li>• Detection of "[object Object]" error display</li>
            <li>• Toast notification error formatting</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
