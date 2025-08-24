import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Play } from 'lucide-react';
import { verifyQuotationConstraintFixes, testQuotationCreation } from '@/utils/verifyQuotationConstraintFixes';
import { UserCompanyFix } from '@/components/debug/UserCompanyFix';
import { UserProfileFix } from '@/components/debug/UserProfileFix';
import { QuickTestResult } from '@/components/debug/QuickTestResult';
import { toast } from 'sonner';

interface TestResult {
  success: boolean;
  results?: any;
  errors?: string[];
  testData?: any;
  error?: string;
}

export default function TestQuotationFixes() {
  const [verificationResult, setVerificationResult] = useState<TestResult | null>(null);
  const [creationTestResult, setCreationTestResult] = useState<TestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runVerification = async () => {
    setIsRunning(true);
    try {
      const result = await verifyQuotationConstraintFixes();
      setVerificationResult(result);
      
      if (result.success) {
        toast.success('Verification completed successfully!');
      } else {
        toast.error('Verification found issues - check results below');
      }
    } catch (error: any) {
      toast.error(`Verification failed: ${error.message}`);
      setVerificationResult({ 
        success: false, 
        errors: [error.message] 
      });
    }
    setIsRunning(false);
  };

  const runCreationTest = async () => {
    setIsRunning(true);
    try {
      const result = await testQuotationCreation();
      setCreationTestResult(result);
      
      if (result.success) {
        toast.success('Quotation creation test passed!');
      } else {
        toast.error('Quotation creation test failed');
      }
    } catch (error: any) {
      toast.error(`Creation test failed: ${error.message}`);
      setCreationTestResult({ 
        success: false, 
        error: error.message 
      });
    }
    setIsRunning(false);
  };

  const runAllTests = async () => {
    await runVerification();
    await runCreationTest();
  };

  const getStatusIcon = (success: boolean | undefined) => {
    if (success === undefined) return <AlertCircle className="h-4 w-4 text-gray-400" />;
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotation Fixes Test</h1>
          <p className="text-muted-foreground">
            Fix "User has no associated company" error and test quotation creation functionality
          </p>
        </div>
      </div>

      {/* Quick Test & Verification */}
      <QuickTestResult />

      {/* User Profile Fix - Fix missing profiles first */}
      <UserProfileFix />

      {/* User-Company Association Fix */}
      <UserCompanyFix />

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Test Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button onClick={runVerification} disabled={isRunning}>
              Run Verification
            </Button>
            <Button onClick={runCreationTest} disabled={isRunning}>
              Test Creation
            </Button>
            <Button onClick={runAllTests} disabled={isRunning} variant="default">
              Run All Tests
            </Button>
          </div>
          {isRunning && (
            <div className="text-sm text-muted-foreground">
              Running tests... Check browser console for detailed logs.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Results */}
      {verificationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(verificationResult.success)}
              Database Verification Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {verificationResult.results && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Schema Check</div>
                  {getStatusBadge(verificationResult.results.schemaCheck, "Schema")}
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Foreign Keys</div>
                  {getStatusBadge(verificationResult.results.foreignKeyCheck, "FK Check")}
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">User Auth</div>
                  {getStatusBadge(verificationResult.results.userAuthCheck, "Auth")}
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Company</div>
                  {getStatusBadge(verificationResult.results.companyCheck, "Company")}
                </div>
              </div>
            )}

            {verificationResult.errors && verificationResult.errors.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-red-600">Errors Found:</div>
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <ul className="text-sm text-red-800 space-y-1">
                    {verificationResult.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {verificationResult.success && (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <div className="text-sm text-green-800 font-medium">
                  ✅ All verification checks passed! Constraint violations should be resolved.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Creation Test Results */}
      {creationTestResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(creationTestResult.success)}
              Quotation Creation Test Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {creationTestResult.success ? (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <div className="text-sm text-green-800 font-medium">
                    ✅ Quotation creation test passed successfully!
                  </div>
                </div>
                
                {creationTestResult.testData && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Test Quotation Data Structure:</div>
                    <div className="bg-gray-50 border rounded p-3">
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(creationTestResult.testData, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <div className="text-sm text-red-800">
                  ❌ Quotation creation test failed: {creationTestResult.error}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary and Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Summary & Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            This test page verifies that the foreign key constraint violations in the quotations table have been resolved.
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium">Fixed Issues:</div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Replaced hardcoded created_by ID with current user ID</li>
              <li>• Replaced hardcoded company_id fallbacks with proper validation</li>
              <li>• Added authentication and company validation before quotation creation</li>
              <li>• Fixed CreateQuotationModal.tsx, Quotations.tsx, and CreateInvoiceModal.tsx</li>
              <li>• Added user-company association diagnostic and fix tools</li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Next Steps:</div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Use the "User-Company Association Fix" tool above if you get "no associated company" error</li>
              <li>• Try creating a new quotation using the standard UI</li>
              <li>• Verify that all foreign key relationships work correctly</li>
              <li>• Test quotation-to-invoice conversion functionality</li>
              <li>• Monitor for any remaining constraint violations</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
