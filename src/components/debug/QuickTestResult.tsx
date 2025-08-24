import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Play, AlertTriangle } from 'lucide-react';
import { testUserCompanyFixProcess } from '@/utils/testUserCompanyFix';
import { toast } from 'sonner';

export function QuickTestResult() {
  const [testResult, setTestResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runQuickTest = async () => {
    setIsRunning(true);
    setTestResult(null);
    
    try {
      toast.info('Running comprehensive test...', { 
        description: 'This will diagnose, fix, and verify the user-company association' 
      });
      
      const result = await testUserCompanyFixProcess();
      setTestResult(result);
      
      if (result.success) {
        toast.success('All tests passed!', {
          description: 'User-company association is working correctly'
        });
      } else {
        toast.error('Some tests failed', {
          description: 'Check the results below for details'
        });
      }
    } catch (error: any) {
      toast.error('Test failed', { description: error.message });
      setTestResult({
        success: false,
        errors: [error.message]
      });
    }
    
    setIsRunning(false);
  };

  const getStatusIcon = (success: boolean | undefined) => {
    if (success === undefined) return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    return success ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusBadge = (success: boolean | undefined, label: string) => {
    if (success === undefined) return <Badge variant="secondary">{label}</Badge>;
    return (
      <Badge variant={success ? "default" : "destructive"}>
        {success ? "✓" : "✗"} {label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Quick Test & Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          This will run a comprehensive test that diagnoses your user-company association, 
          attempts to fix any issues, and verifies that quotation creation works.
        </div>

        <Button 
          onClick={runQuickTest} 
          disabled={isRunning}
          className="w-full"
        >
          <Play className={`h-4 w-4 mr-2 ${isRunning ? 'animate-pulse' : ''}`} />
          {isRunning ? 'Running Test...' : 'Run Complete Test'}
        </Button>

        {testResult && (
          <div className="space-y-4">
            {/* Overall Status */}
            <div className="flex items-center gap-2">
              {getStatusIcon(testResult.success)}
              <span className="font-medium">
                {testResult.success ? 'All Tests Passed' : 'Issues Found'}
              </span>
            </div>

            {/* Test Steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="text-sm font-medium">User Association</div>
                <div className="space-y-1">
                  {getStatusBadge(testResult.initialDiagnosis?.success, "Initial Check")}
                  {testResult.fixAttempt && getStatusBadge(testResult.fixAttempt.success, "Fix Applied")}
                  {testResult.finalDiagnosis && getStatusBadge(testResult.finalDiagnosis.success, "Final Check")}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Quotation Creation</div>
                <div className="space-y-1">
                  {getStatusBadge(testResult.quotationTest?.success, "Quote Test")}
                </div>
              </div>
            </div>

            {/* Success Message */}
            {testResult.success && (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Ready to Create Quotations!</span>
                </div>
                <div className="text-sm text-green-700 mt-1">
                  Your user-company association is properly configured. You can now create quotations without foreign key constraint violations.
                </div>
              </div>
            )}

            {/* Error Details */}
            {testResult.errors && testResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Issues Found</span>
                </div>
                <ul className="text-sm text-red-700 space-y-1">
                  {testResult.errors.map((error: string, index: number) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Steps */}
            <div className="text-xs text-muted-foreground space-y-1">
              {testResult.success ? (
                <>
                  <div><strong>✅ You're all set!</strong></div>
                  <div>• Try creating a quotation using the main app</div>
                  <div>• The "User has no associated company" error should be resolved</div>
                </>
              ) : (
                <>
                  <div><strong>⚠️ Manual intervention may be needed:</strong></div>
                  <div>• Use the "User-Company Association Fix" tool above</div>
                  <div>• Contact support if issues persist</div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
