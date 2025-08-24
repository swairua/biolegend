import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, User, Building } from 'lucide-react';
import { diagnoseUserCompanyIssue, fixUserCompanyAssociation } from '@/utils/userCompanyDiagnostic';
import { testUserCompanyFixProcess, quickFixUserCompany } from '@/utils/testUserCompanyFix';
import { toast } from 'sonner';

interface DiagnosisResult {
  success: boolean;
  issue?: string;
  message: string;
  details?: string;
  user?: any;
  profile?: any;
  company?: any;
  availableCompanies?: any[];
}

interface FixResult {
  success: boolean;
  message: string;
  companyId?: string;
  diagnosis?: DiagnosisResult;
  error?: string;
}

export function UserCompanyFix() {
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [comprehensiveTest, setComprehensiveTest] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnosis = async () => {
    setIsRunning(true);
    setFixResult(null);
    
    try {
      const result = await diagnoseUserCompanyIssue();
      setDiagnosis(result);
      
      if (result.success) {
        toast.success('User-company association is valid');
      } else {
        toast.warning(`Issue found: ${result.message}`);
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
      const result = await fixUserCompanyAssociation();
      setFixResult(result);
      
      if (result.success) {
        toast.success('User-company association fixed!');
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

  const getStatusIcon = (success: boolean | undefined) => {
    if (success === undefined) return <AlertCircle className="h-4 w-4 text-gray-400" />;
    return success ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getIssueDescription = (issue?: string) => {
    switch (issue) {
      case 'authentication':
        return 'User is not authenticated. Please sign in.';
      case 'profile_missing':
        return 'User profile record not found in database.';
      case 'no_company_association':
        return 'User profile exists but has no company_id set.';
      case 'invalid_company_reference':
        return 'User profile references a company that doesn\'t exist.';
      default:
        return 'Unknown issue detected.';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          User-Company Association Fix
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex gap-3">
          <Button onClick={runDiagnosis} disabled={isRunning} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            Run Diagnosis
          </Button>
          {diagnosis && !diagnosis.success && (
            <Button onClick={runFix} disabled={isRunning} variant="default">
              Fix Association
            </Button>
          )}
        </div>

        {/* Diagnosis Results */}
        {diagnosis && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnosis.success)}
              <span className="font-medium">
                {diagnosis.success ? 'Association Valid' : 'Issue Detected'}
              </span>
              <Badge variant={diagnosis.success ? "default" : "destructive"}>
                {diagnosis.success ? "OK" : diagnosis.issue}
              </Badge>
            </div>

            <div className="text-sm text-muted-foreground">
              {diagnosis.message}
            </div>

            {!diagnosis.success && diagnosis.issue && (
              <div className="bg-orange-50 border border-orange-200 rounded p-3">
                <div className="text-sm text-orange-800">
                  <strong>Issue:</strong> {getIssueDescription(diagnosis.issue)}
                </div>
                {diagnosis.details && (
                  <div className="text-xs text-orange-700 mt-1">
                    <strong>Details:</strong> {diagnosis.details}
                  </div>
                )}
              </div>
            )}

            {/* User Info */}
            {diagnosis.user && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="font-medium">User Info</div>
                  <div>ID: {diagnosis.user.id}</div>
                  <div>Email: {diagnosis.user.email}</div>
                </div>
                
                {diagnosis.profile && (
                  <div className="space-y-1">
                    <div className="font-medium">Profile Info</div>
                    <div>Name: {diagnosis.profile.full_name || 'Not set'}</div>
                    <div>Company ID: {diagnosis.profile.company_id || 'Not set'}</div>
                  </div>
                )}
              </div>
            )}

            {/* Company Info */}
            {diagnosis.company && (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <div className="flex items-center gap-2 text-green-800">
                  <Building className="h-4 w-4" />
                  <span className="font-medium">Associated Company</span>
                </div>
                <div className="text-sm text-green-700 mt-1">
                  <div>Name: {diagnosis.company.name}</div>
                  <div>ID: {diagnosis.company.id}</div>
                </div>
              </div>
            )}

            {/* Available Companies */}
            {diagnosis.availableCompanies && diagnosis.availableCompanies.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Available Companies:</div>
                <div className="grid gap-2">
                  {diagnosis.availableCompanies.map((company) => (
                    <div key={company.id} className="text-sm bg-gray-50 border rounded p-2">
                      <div className="font-medium">{company.name}</div>
                      <div className="text-xs text-gray-600">ID: {company.id}</div>
                    </div>
                  ))}
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
              {fixResult.companyId && (
                <div className="text-xs mt-1">
                  Company ID: {fixResult.companyId}
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

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div><strong>What this does:</strong></div>
          <ul className="ml-4 space-y-1">
            <li>• Checks if your user profile has a company association</li>
            <li>• Creates a default company if none exist</li>
            <li>• Associates your profile with a company</li>
            <li>• Enables quotation creation functionality</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
