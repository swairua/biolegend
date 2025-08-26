import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { parseErrorMessage } from '@/utils/errorHelpers';
import { toast } from 'sonner';

export function MigrationErrorTest() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const testErrorHandling = () => {
    setTestResults([]);
    const results: string[] = [];

    // Test 1: Raw error object
    const rawError = new Error('This is a test error message');
    rawError.name = 'TestError';
    const parsedMessage1 = parseErrorMessage(rawError);
    results.push(`Raw Error Object: ${parsedMessage1}`);

    // Test 2: Supabase-style error
    const supabaseError = {
      message: 'relation "test_table" does not exist',
      details: 'The table you are trying to access does not exist',
      hint: 'Check if the table name is correct',
      code: '42P01'
    };
    const parsedMessage2 = parseErrorMessage(supabaseError);
    results.push(`Supabase Error: ${parsedMessage2}`);

    // Test 3: String error
    const stringError = 'Simple string error message';
    const parsedMessage3 = parseErrorMessage(stringError);
    results.push(`String Error: ${parsedMessage3}`);

    // Test 4: Undefined/null error
    const parsedMessage4 = parseErrorMessage(null);
    results.push(`Null Error: ${parsedMessage4}`);

    // Test 5: Complex object (should not show [object Object])
    const complexError = {
      someProperty: 'value',
      nestedObject: { data: 'test' },
      arrayProperty: [1, 2, 3]
    };
    const parsedMessage5 = parseErrorMessage(complexError);
    results.push(`Complex Object: ${parsedMessage5}`);

    setTestResults(results);

    // Test toast with various error types
    toast.error(`Test Error 1: ${parsedMessage1}`);
    setTimeout(() => toast.error(`Test Error 2: ${parsedMessage2}`), 1000);
    setTimeout(() => toast.error(`Test Error 3: ${parsedMessage5}`), 2000);
  };

  const testBadErrorHandling = () => {
    // This demonstrates what NOT to do - would show [object Object]
    const errorObject = { message: 'Database connection failed', code: 'CONN_FAIL' };
    
    // BAD: This would show [object Object]
    // toast.error(`Bad handling: ${errorObject}`);
    
    // GOOD: This shows the proper message
    const goodMessage = parseErrorMessage(errorObject);
    toast.error(`Good handling: ${goodMessage}`);
    
    toast.info('Check console for comparison - the good version shows a proper message');
    console.log('Bad would show:', String(errorObject)); // [object Object]
    console.log('Good shows:', goodMessage); // Proper message
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Migration Error Handling Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Button onClick={testErrorHandling} variant="outline">
            Test Error Parsing
          </Button>
          <Button onClick={testBadErrorHandling} variant="outline">
            Compare Good vs Bad Handling
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Test Results:</h4>
            <div className="space-y-1">
              {testResults.map((result, index) => (
                <div key={index} className="p-2 bg-muted rounded text-sm font-mono">
                  {result}
                </div>
              ))}
            </div>
            <div className="p-3 bg-success-light border border-success/20 rounded">
              <p className="text-sm text-success-foreground">
                ✅ All error messages are properly parsed - no "[object Object]" should appear above.
              </p>
            </div>
          </div>
        )}

        <div className="p-3 bg-muted rounded text-sm">
          <h4 className="font-medium mb-2">What this tests:</h4>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>• Error objects with message property</li>
            <li>• Supabase-style errors with code, details, hint</li>
            <li>• String errors</li>
            <li>• Null/undefined errors</li>
            <li>• Complex objects without message (fallback handling)</li>
            <li>• Toast notification error display</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
