import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { parseErrorMessage } from '@/utils/errorHelpers';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Database,
  Play,
  Wifi,
  Key,
  Server
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export function SupabaseConnectionTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setTestResults([]);
    setConnectionInfo(null);

    const results: TestResult[] = [];

    try {
      // Test 1: Basic client configuration
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mfhcbgnkxpifbhrtmgbv.supabase.co';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      
      results.push({
        name: 'Configuration Check',
        status: supabaseUrl && supabaseKey ? 'pass' : 'fail',
        message: supabaseUrl && supabaseKey 
          ? `Connected to: ${supabaseUrl.substring(0, 30)}...`
          : 'Missing Supabase URL or API key',
        details: { url: supabaseUrl, hasKey: !!supabaseKey }
      });

      // Test 2: Basic connection test
      try {
        const { data: basicTest, error: basicError } = await supabase
          .from('auth.users')
          .select('count')
          .limit(0);
        
        results.push({
          name: 'Basic Connection',
          status: basicError ? 'fail' : 'pass',
          message: basicError 
            ? `Connection failed: ${parseErrorMessage(basicError)}`
            : 'Successfully connected to Supabase',
          details: { error: basicError }
        });
      } catch (err: any) {
        results.push({
          name: 'Basic Connection',
          status: 'fail',
          message: `Connection error: ${parseErrorMessage(err)}`,
          details: { error: err }
        });
      }

      // Test 3: Auth status
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        results.push({
          name: 'Authentication',
          status: user ? 'pass' : 'warning',
          message: user 
            ? `Authenticated as: ${user.email}`
            : 'Not authenticated (anonymous access)',
          details: { user, error: authError }
        });
      } catch (err: any) {
        results.push({
          name: 'Authentication',
          status: 'fail',
          message: `Auth check failed: ${parseErrorMessage(err)}`,
          details: { error: err }
        });
      }

      // Test 4: Try accessing a simple public table
      try {
        const { data: tableTest, error: tableError } = await supabase
          .from('companies')
          .select('id')
          .limit(1);
        
        results.push({
          name: 'Table Access (companies)',
          status: tableError ? 'fail' : 'pass',
          message: tableError 
            ? `Table access failed: ${parseErrorMessage(tableError)}`
            : 'Successfully accessed companies table',
          details: { error: tableError, hasData: !!tableTest?.length }
        });
      } catch (err: any) {
        results.push({
          name: 'Table Access (companies)',
          status: 'fail',
          message: `Table access error: ${parseErrorMessage(err)}`,
          details: { error: err }
        });
      }

      // Test 5: Information schema access (the failing one)
      try {
        const { data: schemaTest, error: schemaError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .limit(1);
        
        results.push({
          name: 'Information Schema Access',
          status: schemaError ? 'fail' : 'pass',
          message: schemaError 
            ? `Schema access failed: ${parseErrorMessage(schemaError)}`
            : 'Successfully accessed information_schema',
          details: { error: schemaError }
        });
      } catch (err: any) {
        results.push({
          name: 'Information Schema Access',
          status: 'fail',
          message: `Schema access error: ${parseErrorMessage(err)}`,
          details: { error: err }
        });
      }

      // Test 6: Try RPC function access
      try {
        const { data: rpcTest, error: rpcError } = await supabase.rpc('get_table_info', {});
        
        results.push({
          name: 'RPC Function Access',
          status: rpcError ? 'warning' : 'pass',
          message: rpcError 
            ? `RPC functions may not be available: ${parseErrorMessage(rpcError)}`
            : 'RPC functions are accessible',
          details: { error: rpcError }
        });
      } catch (err: any) {
        results.push({
          name: 'RPC Function Access',
          status: 'warning',
          message: 'RPC functions not available (this is usually fine)',
          details: { error: err }
        });
      }

      // Test 7: Alternative table checking method
      try {
        // Try to access some common tables to check if they exist
        const tablesToCheck = ['customers', 'products', 'invoices', 'quotations'];
        const tableResults = [];

        for (const tableName of tablesToCheck) {
          try {
            const { error } = await supabase
              .from(tableName)
              .select('id')
              .limit(0);
            
            tableResults.push({
              table: tableName,
              exists: !error,
              error: error?.message
            });
          } catch (err: any) {
            tableResults.push({
              table: tableName,
              exists: false,
              error: err.message
            });
          }
        }

        const existingTables = tableResults.filter(t => t.exists).length;
        
        results.push({
          name: 'Alternative Table Check',
          status: existingTables > 0 ? 'pass' : 'fail',
          message: `Found ${existingTables}/${tablesToCheck.length} expected tables`,
          details: { tableResults }
        });

      } catch (err: any) {
        results.push({
          name: 'Alternative Table Check',
          status: 'fail',
          message: `Table checking failed: ${parseErrorMessage(err)}`,
          details: { error: err }
        });
      }

      setTestResults(results);

      // Set connection info
      setConnectionInfo({
        url: supabaseUrl,
        hasValidConfig: !!(supabaseUrl && supabaseKey),
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      results.push({
        name: 'Diagnostic Error',
        status: 'fail',
        message: `Diagnostic failed: ${parseErrorMessage(error)}`,
        details: { error }
      });
      setTestResults(results);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'fail': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      default: return <Database className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pass: 'default',
      fail: 'destructive',
      warning: 'secondary'
    } as const;
    
    return (
      <Badge variant={variants[status] || 'outline'} className="text-xs">
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-primary" />
          <span>Supabase Connection Diagnostics</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <Button onClick={runDiagnostics} disabled={isRunning}>
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Running Diagnostics...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Connection Test
              </>
            )}
          </Button>
        </div>

        {connectionInfo && (
          <Alert>
            <Server className="h-4 w-4" />
            <AlertDescription>
              <strong>Connection Info:</strong><br />
              URL: {connectionInfo.url}<br />
              Config Valid: {connectionInfo.hasValidConfig ? 'Yes' : 'No'}<br />
              Last Tested: {new Date(connectionInfo.timestamp).toLocaleString()}
            </AlertDescription>
          </Alert>
        )}

        {testResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Test Results:</h4>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded border">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <div className="font-medium text-sm">{result.name}</div>
                      <div className="text-xs text-muted-foreground">{result.message}</div>
                    </div>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
              ))}
            </div>
          </div>
        )}

        {testResults.some(r => r.name === 'Information Schema Access' && r.status === 'fail') && (
          <Alert className="border-warning/20 bg-warning-light/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription>
              <strong>Information Schema Issue Detected</strong><br />
              The system cannot access PostgreSQL system tables through Supabase. This is common and can be fixed by:
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>Using alternative table checking methods</li>
                <li>Creating RPC functions for schema introspection</li>
                <li>Bypassing information_schema queries entirely</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {testResults.filter(r => r.status === 'pass').length === testResults.length && testResults.length > 0 && (
          <Alert className="border-success/20 bg-success-light/10">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-success-foreground">
              🎉 All connection tests passed! Your Supabase connection is working properly.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
