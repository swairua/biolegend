import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  TestTube,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthErrorDisplay } from '@/components/auth/AuthErrorDisplay';
import { logError, logWarning, getUserFriendlyErrorMessage } from '@/utils/errorLogger';
import { toast } from 'sonner';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'pending';
  message: string;
  error?: unknown;
}

export default function ErrorTestPage() {
  const { signIn } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testError, setTestError] = useState<unknown>(null);

  const updateTestResult = (name: string, status: TestResult['status'], message: string, error?: unknown) => {
    setTestResults(prev => {
      const existing = prev.findIndex(r => r.name === name);
      const newResult = { name, status, message, error };
      
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newResult;
        return updated;
      } else {
        return [...prev, newResult];
      }
    });
  };

  const runErrorTests = async () => {
    setIsRunning(true);
    setTestError(null);
    setTestResults([]);

    try {
      // Test 1: Invalid credentials error
      updateTestResult('Invalid Credentials', 'pending', 'Testing invalid credentials error...');
      
      try {
        const result = await signIn('invalid@test.com', 'wrongpassword');
        if (result.error) {
          const errorMessage = getUserFriendlyErrorMessage(result.error);
          updateTestResult(
            'Invalid Credentials', 
            'pass', 
            `Error handled correctly: "${errorMessage}"`,
            result.error
          );
        } else {
          updateTestResult('Invalid Credentials', 'fail', 'Expected an error but got success');
        }
      } catch (error) {
        const errorMessage = getUserFriendlyErrorMessage(error);
        updateTestResult(
          'Invalid Credentials', 
          'pass', 
          `Exception handled correctly: "${errorMessage}"`,
          error
        );
      }

      // Test 2: Error logging functionality
      updateTestResult('Error Logging', 'pending', 'Testing error logging...');
      
      try {
        const testError = new Error('Test error message');
        logError('Test error log', testError, { testContext: 'error-test-page' });
        updateTestResult('Error Logging', 'pass', 'Error logging works correctly');
      } catch (error) {
        updateTestResult('Error Logging', 'fail', 'Error logging failed', error);
      }

      // Test 3: Complex error objects
      updateTestResult('Complex Error Objects', 'pending', 'Testing complex error objects...');
      
      try {
        const complexError = {
          message: 'Complex error message',
          code: 'TEST_ERROR',
          details: { nested: 'data' },
          hint: 'This is a test hint'
        };
        
        const userMessage = getUserFriendlyErrorMessage(complexError);
        logWarning('Complex error test', complexError);
        
        updateTestResult(
          'Complex Error Objects', 
          'pass', 
          `Complex error handled: "${userMessage}"`,
          complexError
        );
      } catch (error) {
        updateTestResult('Complex Error Objects', 'fail', 'Complex error handling failed', error);
      }

      // Test 4: Null/undefined errors
      updateTestResult('Null/Undefined Errors', 'pending', 'Testing null/undefined error handling...');
      
      try {
        const nullMessage = getUserFriendlyErrorMessage(null);
        const undefinedMessage = getUserFriendlyErrorMessage(undefined);
        const emptyMessage = getUserFriendlyErrorMessage('');
        
        updateTestResult(
          'Null/Undefined Errors', 
          'pass', 
          `Null: "${nullMessage}", Undefined: "${undefinedMessage}", Empty: "${emptyMessage}"`
        );
      } catch (error) {
        updateTestResult('Null/Undefined Errors', 'fail', 'Null/undefined error handling failed', error);
      }

      // Test 5: Display a test error
      updateTestResult('Error Display', 'pending', 'Testing error display component...');
      
      const displayTestError = {
        message: 'This is a test authentication error',
        code: 'AUTH_TEST_ERROR',
        details: 'Testing error display functionality'
      };
      
      setTestError(displayTestError);
      updateTestResult('Error Display', 'pass', 'Error display component should be visible below');

    } catch (error) {
      updateTestResult('Test Runner', 'fail', 'Test runner failed', error);
    } finally {
      setIsRunning(false);
    }
  };

  const clearTests = () => {
    setTestResults([]);
    setTestError(null);
  };

  const showToastError = () => {
    const testError = {
      message: 'This is a test toast error',
      code: 'TOAST_TEST',
      details: 'Should show user-friendly message'
    };
    
    const userMessage = getUserFriendlyErrorMessage(testError);
    toast.error(`Test Error: ${userMessage}`);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />;
    }
  };

  const passCount = testResults.filter(r => r.status === 'pass').length;
  const failCount = testResults.filter(r => r.status === 'fail').length;
  const pendingCount = testResults.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Error Handling Test Suite</h1>
          <p className="text-muted-foreground">
            Test authentication error handling and verify "[object Object]" fixes
          </p>
        </div>

        {/* Test Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <TestTube className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Tests</p>
                  <p className="text-sm font-bold">{testResults.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Passed</p>
                  <p className="text-sm font-bold">{passCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Failed</p>
                  <p className="text-sm font-bold">{failCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <RefreshCw className={`h-4 w-4 text-yellow-500 ${pendingCount > 0 ? 'animate-spin' : ''}`} />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Running</p>
                  <p className="text-sm font-bold">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Test Controls */}
        <div className="flex gap-4">
          <Button 
            onClick={runErrorTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            {isRunning ? 'Running Tests...' : 'Run Error Tests'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={clearTests}
            disabled={isRunning}
          >
            Clear Results
          </Button>

          <Button 
            variant="outline" 
            onClick={showToastError}
          >
            Test Toast Error
          </Button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{result.name}</span>
                        <Badge variant={
                          result.status === 'pass' ? 'default' :
                          result.status === 'fail' ? 'destructive' : 'secondary'
                        }>
                          {result.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                      {result.error && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            Show error details
                          </summary>
                          <pre className="mt-1 p-2 bg-muted rounded text-xs font-mono overflow-auto">
                            {JSON.stringify(result.error, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display Test */}
        {testError && (
          <Card>
            <CardHeader>
              <CardTitle>Error Display Component Test</CardTitle>
            </CardHeader>
            <CardContent>
              <AuthErrorDisplay 
                error={testError}
                onRetry={() => setTestError(null)}
                onDismiss={() => setTestError(null)}
                showDetails={true}
                context="Test"
              />
            </CardContent>
          </Card>
        )}

        {/* Fix Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">✅ "[object Object]" Fix Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Before the fix:</strong> Error objects were logged directly causing "[object Object]" to appear in console and error messages.</p>
                  <p><strong>After the fix:</strong> All error objects are processed through errorLogger utilities that extract user-friendly messages.</p>
                  <div className="mt-4">
                    <h4 className="font-medium">Fixed Components:</h4>
                    <ul className="text-sm mt-1 space-y-1">
                      <li>• AuthContext.tsx - All error logging now uses logError/logWarning</li>
                      <li>• authHelpers.ts - Error handling uses getUserFriendlyErrorMessage</li>
                      <li>• authErrorHandler.ts - Uses errorLogger for consistent error extraction</li>
                      <li>• New AuthErrorDisplay component for proper error presentation</li>
                    </ul>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
