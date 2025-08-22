import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertTriangle, Database, RefreshCw } from 'lucide-react';

interface DatabaseTestResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export function DatabaseConnectionTest() {
  const [results, setResults] = useState<DatabaseTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runTests = async () => {
    setIsLoading(true);
    const testResults: DatabaseTestResult[] = [];

    // Test 1: Basic connection
    try {
      const { data, error } = await supabase.from('companies').select('id').limit(1);
      testResults.push({
        test: 'Basic Connection',
        status: error ? 'error' : 'success',
        message: error ? `Connection failed: ${error.message}` : 'Successfully connected to Supabase',
        details: error
      });
    } catch (err) {
      testResults.push({
        test: 'Basic Connection',
        status: 'error',
        message: `Connection exception: ${err}`,
        details: err
      });
    }

    // Test 2: Check payments table exists
    try {
      const { data, error } = await supabase.from('payments').select('id').limit(1);
      testResults.push({
        test: 'Payments Table',
        status: error ? 'error' : 'success',
        message: error ? `Payments table error: ${error.message}` : 'Payments table exists and accessible',
        details: error
      });
    } catch (err) {
      testResults.push({
        test: 'Payments Table',
        status: 'error',
        message: `Payments table exception: ${err}`,
        details: err
      });
    }

    // Test 3: Check payment_method enum
    try {
      const { data, error } = await supabase
        .rpc('exec_sql', { 
          sql: "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method')" 
        });
      testResults.push({
        test: 'Payment Method Enum',
        status: error ? 'error' : 'success',
        message: error ? `Enum check failed: ${error.message}` : `Payment method enum found with values: ${data?.map((d: any) => d.enumlabel).join(', ') || 'unknown'}`,
        details: { data, error }
      });
    } catch (err) {
      testResults.push({
        test: 'Payment Method Enum',
        status: 'warning',
        message: `Could not check enum (might not have RPC access): ${err}`,
        details: err
      });
    }

    // Test 4: Check payment_allocations table
    try {
      const { data, error } = await supabase.from('payment_allocations').select('id').limit(1);
      testResults.push({
        test: 'Payment Allocations Table',
        status: error ? 'error' : 'success',
        message: error ? `Payment allocations error: ${error.message}` : 'Payment allocations table exists',
        details: error
      });
    } catch (err) {
      testResults.push({
        test: 'Payment Allocations Table',
        status: 'error',
        message: `Payment allocations exception: ${err}`,
        details: err
      });
    }

    // Test 5: Check table schema info
    try {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['payments', 'payment_allocations', 'companies']);
      
      testResults.push({
        test: 'Schema Check',
        status: error ? 'error' : 'success',
        message: error ? `Schema check failed: ${error.message}` : `Found tables: ${data?.map((d: any) => d.table_name).join(', ') || 'none'}`,
        details: { data, error }
      });
    } catch (err) {
      testResults.push({
        test: 'Schema Check',
        status: 'warning',
        message: `Schema check failed: ${err}`,
        details: err
      });
    }

    setResults(testResults);
    setIsLoading(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Database className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-100 text-green-700">✓ Pass</Badge>;
      case 'error': return <Badge variant="destructive">✗ Fail</Badge>;
      case 'warning': return <Badge className="bg-yellow-100 text-yellow-700">⚠ Warning</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Connection & Payments Table Test
        </CardTitle>
        <Button onClick={runTests} disabled={isLoading} size="sm">
          {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {isLoading ? 'Testing...' : 'Retest'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
              <div className="flex items-start gap-3">
                {getIcon(result.status)}
                <div>
                  <h4 className="font-medium text-sm">{result.test}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                  {result.details && result.status === 'error' && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">Error Details</summary>
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
              {getStatusBadge(result.status)}
            </div>
          ))}
        </div>

        {results.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Summary</h4>
            <div className="text-sm space-y-1">
              <div>Total Tests: {results.length}</div>
              <div>Passed: {results.filter(r => r.status === 'success').length}</div>
              <div>Failed: {results.filter(r => r.status === 'error').length}</div>
              <div>Warnings: {results.filter(r => r.status === 'warning').length}</div>
            </div>
            
            {results.some(r => r.status === 'error' && r.test === 'Payments Table') && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <h5 className="font-medium text-red-800 mb-2">⚠️ Payments Table Missing</h5>
                <p className="text-sm text-red-700">
                  The payments table does not exist in your database. You need to run the database migration.
                  Go to the <strong>Force Migration</strong> page or manually execute the payments table creation SQL.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
