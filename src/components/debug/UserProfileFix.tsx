import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, UserCheck, AlertTriangle } from 'lucide-react';
import { diagnoseUserProfile, fixUserProfile, testProfileFixProcess } from '@/utils/userProfileDiagnostic';
import { toast } from 'sonner';

interface ProfileDiagnosisResult {
  success: boolean;
  issue?: string;
  message: string;
  details?: string;
  user?: any;
  profile?: any;
  missingFields?: string[];
}

interface ProfileFixResult {
  success: boolean;
  message: string;
  diagnosis?: ProfileDiagnosisResult;
  action?: string;
  error?: string;
}

export function UserProfileFix() {
  const [diagnosis, setDiagnosis] = useState<ProfileDiagnosisResult | null>(null);
  const [fixResult, setFixResult] = useState<ProfileFixResult | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnosis = async () => {
    setIsRunning(true);
    setFixResult(null);
    setTestResult(null);
    
    try {
      const result = await diagnoseUserProfile();
      setDiagnosis(result);
      
      if (result.success && result.issue !== 'profile_incomplete') {
        toast.success('User profile is valid');
      } else {
        toast.warning(`Profile issue found: ${result.message}`);
      }
    } catch (error: any) {
      toast.error(`Diagnosis failed: ${error.message}`);
      setDiagnosis({
        success: false,
        message: 'Diagnosis failed',
        details: error.message
      });
    }
    
    setIsRunning(false);
  };

  const runFix = async () => {
    setIsRunning(true);
    
    try {
      const result = await fixUserProfile();
      setFixResult(result);
      
      if (result.success) {
        toast.success('User profile fixed!');
        // Re-run diagnosis to show updated state
        await runDiagnosis();
      } else {
        toast.error(`Fix failed: ${result.message}`);
      }
    } catch (error: any) {
      toast.error(`Fix failed: ${error.message}`);
      setFixResult({
        success: false,
        message: 'Fix failed',
        error: error.message
      });
    }
    
    setIsRunning(false);
  };

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setTestResult(null);
    
    try {
      const result = await testProfileFixProcess();
      setTestResult(result);
      
      if (result.success) {
        toast.success('Profile test completed successfully!');
      } else {
        toast.error('Profile test found issues - check results below');
      }
    } catch (error: any) {
      toast.error(`Test failed: ${error.message}`);
      setTestResult({
        success: false,
        errors: [error.message]
      });
    }
    
    setIsRunning(false);
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

  const getIssueDescription = (issue?: string) => {
    switch (issue) {
      case 'not_authenticated':
        return 'User is not authenticated. Please sign in.';
      case 'profile_missing':
        return 'User profile record not found in database. This needs to be created.';
      case 'profile_access_error':
        return 'Cannot access the profiles table. May be a permissions issue.';
      case 'profile_incomplete':
        return 'User profile exists but is missing required fields.';
      default:
        return 'Unknown profile issue detected.';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          User Profile Fix
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          This tool diagnoses and fixes user profile issues that can cause "No associated user profile found" errors.
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={runDiagnosis} disabled={isRunning} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            Check Profile
          </Button>
          {diagnosis && !diagnosis.success && (
            <Button onClick={runFix} disabled={isRunning} variant="default">
              Fix Profile
            </Button>
          )}
          <Button onClick={runComprehensiveTest} disabled={isRunning} variant="secondary">
            Full Test
          </Button>
        </div>

        {/* Diagnosis Results */}
        {diagnosis && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnosis.success && diagnosis.issue !== 'profile_incomplete')}
              <span className="font-medium">
                {diagnosis.success && diagnosis.issue !== 'profile_incomplete' ? 'Profile Valid' : 'Profile Issue'}
              </span>
              <Badge variant={diagnosis.success && diagnosis.issue !== 'profile_incomplete' ? "default" : "destructive"}>
                {diagnosis.issue || "OK"}
              </Badge>
            </div>

            <div className="text-sm text-muted-foreground">
              {diagnosis.message}
            </div>

            {(!diagnosis.success || diagnosis.issue === 'profile_incomplete') && diagnosis.issue && (
              <div className="bg-orange-50 border border-orange-200 rounded p-3">
                <div className="flex items-center gap-2 text-orange-800 mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Issue Detected</span>
                </div>
                <div className="text-sm text-orange-800">
                  {getIssueDescription(diagnosis.issue)}
                </div>
                {diagnosis.details && (
                  <div className="text-xs text-orange-700 mt-1">
                    <strong>Details:</strong> {diagnosis.details}
                  </div>
                )}
                {diagnosis.missingFields && diagnosis.missingFields.length > 0 && (
                  <div className="text-xs text-orange-700 mt-1">
                    <strong>Missing fields:</strong> {diagnosis.missingFields.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* User Info */}
            {diagnosis.user && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="text-sm font-medium text-blue-800 mb-1">User Info</div>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>ID: {diagnosis.user.id}</div>
                  <div>Email: {diagnosis.user.email}</div>
                  <div>Auth Provider: {diagnosis.user.app_metadata?.provider || 'email'}</div>
                </div>
              </div>
            )}

            {/* Profile Info */}
            {diagnosis.profile && (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <div className="text-sm font-medium text-green-800 mb-1">Profile Info</div>
                <div className="text-sm text-green-700 space-y-1">
                  <div>Name: {diagnosis.profile.full_name || 'Not set'}</div>
                  <div>Email: {diagnosis.profile.email || 'Not set'}</div>
                  <div>Company ID: {diagnosis.profile.company_id || 'Not set'}</div>
                  <div>Position: {diagnosis.profile.position || 'Not set'}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fix Results */}
        {fixResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getStatusIcon(fixResult.success)}
              <span className="font-medium">Fix Result</span>
            </div>

            <div className={`p-3 rounded border ${
              fixResult.success 
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="text-sm font-medium">
                {fixResult.message}
              </div>
              {fixResult.action && (
                <div className="text-xs mt-1">
                  Action: {fixResult.action}
                </div>
              )}
              {fixResult.error && (
                <div className="text-xs mt-1">
                  Error: {fixResult.error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Test Results */}
        {testResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResult.success)}
              <span className="font-medium">Test Results</span>
            </div>

            {testResult.success ? (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <div className="text-sm text-green-800 font-medium">
                  ✅ All profile tests passed! User profile is working correctly.
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <div className="text-sm font-medium text-red-800 mb-2">Test Issues Found</div>
                {testResult.errors && (
                  <ul className="text-sm text-red-700 space-y-1">
                    {testResult.errors.map((error: string, index: number) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div><strong>What this does:</strong></div>
          <ul className="ml-4 space-y-1">
            <li>• Checks if your user has a profile record in the database</li>
            <li>• Creates missing profile records automatically</li>
            <li>• Completes incomplete profile information</li>
            <li>• Resolves "No associated user profile found" errors</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
