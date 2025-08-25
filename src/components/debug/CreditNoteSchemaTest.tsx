import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle, Database, Play } from 'lucide-react';

interface SchemaTestResult {
  column: string;
  exists: boolean;
  error?: string;
}

export function CreditNoteSchemaTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SchemaTestResult[]>([]);
  const [schemaType, setSchemaType] = useState<string>('');
  const [fixesCompatible, setFixesCompatible] = useState<boolean | null>(null);

  const testDatabaseSchema = async () => {
    setIsLoading(true);
    const testResults: SchemaTestResult[] = [];
    
    try {
      // Test columns that should exist in credit_note_items
      const testColumns = [
        'id',
        'credit_note_id',
        'product_id',
        'description',
        'quantity', 
        'unit_price',
        'tax_percentage',  // Schema A (Complete)
        'tax_rate',        // Schema B (Incomplete)
        'tax_amount',
        'tax_inclusive',   // Schema A only
        'tax_setting_id',  // Schema A only
        'line_total',
        'sort_order',
        'created_at',
        'updated_at'
      ];

      for (const column of testColumns) {
        try {
          const { error } = await supabase
            .from('credit_note_items')
            .select(column)
            .limit(1);
          
          testResults.push({
            column,
            exists: !error,
            error: error?.message
          });
        } catch (err: any) {
          testResults.push({
            column,
            exists: false,
            error: err.message
          });
        }
      }

      setResults(testResults);

      // Analyze schema type
      const hasSchemaA = testResults.some(r => r.column === 'tax_percentage' && r.exists) &&
                         testResults.some(r => r.column === 'tax_inclusive' && r.exists) &&
                         testResults.some(r => r.column === 'tax_setting_id' && r.exists);

      const hasSchemaB = testResults.some(r => r.column === 'tax_rate' && r.exists) &&
                         testResults.some(r => r.column === 'tax_inclusive' && !r.exists) &&
                         testResults.some(r => r.column === 'tax_setting_id' && !r.exists);

      if (hasSchemaA) {
        setSchemaType('Schema A (Complete - creditNoteMigration.sql)');
        setFixesCompatible(true);
      } else if (hasSchemaB) {
        setSchemaType('Schema B (Incomplete - comprehensiveMigration.ts)');
        setFixesCompatible(false);
      } else {
        setSchemaType('Custom/Mixed Schema');
        setFixesCompatible(null);
      }

    } catch (error: any) {
      console.error('Schema test failed:', error);
      testResults.push({
        column: 'TEST_ERROR',
        exists: false,
        error: error.message
      });
      setResults(testResults);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (exists: boolean) => {
    return exists ? (
      <CheckCircle className="h-4 w-4 text-success" />
    ) : (
      <AlertCircle className="h-4 w-4 text-destructive" />
    );
  };

  const getStatusBadge = (exists: boolean) => {
    return (
      <Badge variant={exists ? "default" : "destructive"} className="text-xs">
        {exists ? 'Exists' : 'Missing'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-primary" />
            <span>Credit Note Database Schema Test</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={testDatabaseSchema}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>{isLoading ? 'Testing...' : 'Test Database Schema'}</span>
            </Button>
            
            {schemaType && (
              <Badge variant="outline" className="bg-primary-light text-primary">
                {schemaType}
              </Badge>
            )}
          </div>

          {fixesCompatible !== null && (
            <div className={`p-4 rounded-lg border ${
              fixesCompatible 
                ? 'bg-success-light border-success/20 text-success-foreground' 
                : 'bg-destructive-light border-destructive/20 text-destructive-foreground'
            }`}>
              <div className="flex items-center space-x-2">
                {getStatusIcon(fixesCompatible)}
                <span className="font-medium">
                  {fixesCompatible 
                    ? '✅ My credit note fixes are compatible and REQUIRED'
                    : '❌ My credit note fixes will FAIL - database migration needed'
                  }
                </span>
              </div>
              
              {!fixesCompatible && (
                <div className="mt-2 text-sm">
                  <p>The database is missing required fields:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li><code>tax_percentage</code> (instead has <code>tax_rate</code>)</li>
                    <li><code>tax_inclusive</code> boolean field</li>
                    <li><code>tax_setting_id</code> reference field</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Column Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(result.exists)}
                        <code className="text-sm font-mono">{result.column}</code>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(result.exists)}
                        {result.error && (
                          <span className="text-xs text-muted-foreground max-w-md truncate">
                            {result.error}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
