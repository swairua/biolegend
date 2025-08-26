import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Mail, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  UserPlus,
  Database
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import useUserManagement from '@/hooks/useUserManagement';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

export function InvitationTestDiagnostic() {
  const { isAdmin, profile } = useAuth();
  const { invitations, fetchInvitations, inviteUser, error: userMgmtError } = useUserManagement();
  const [isLoading, setIsLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResults, setTestResults] = useState<{
    tableCheck?: TestResult;
    fetchTest?: TestResult;
    inviteTest?: TestResult;
  }>({});

  const checkInvitationsTable = async (): Promise<TestResult> => {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .select('id')
        .limit(1);

      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          return {
            success: false,
            message: 'user_invitations table does not exist',
            details: error
          };
        }
        return {
          success: false,
          message: `Table access error: ${error.message}`,
          details: error
        };
      }

      return {
        success: true,
        message: 'user_invitations table exists and is accessible'
      };
    } catch (err) {
      return {
        success: false,
        message: `Table check failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        details: err
      };
    }
  };

  const testFetchInvitations = async (): Promise<TestResult> => {
    try {
      await fetchInvitations();
      
      if (userMgmtError) {
        return {
          success: false,
          message: `Fetch failed: ${userMgmtError}`,
          details: { error: userMgmtError }
        };
      }

      return {
        success: true,
        message: `Successfully fetched ${invitations.length} invitation(s)`,
        details: { count: invitations.length, invitations }
      };
    } catch (err) {
      return {
        success: false,
        message: `Fetch test failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        details: err
      };
    }
  };

  const testInviteUser = async (): Promise<TestResult> => {
    if (!testEmail || !testEmail.includes('@')) {
      return {
        success: false,
        message: 'Please enter a valid test email address'
      };
    }

    try {
      const result = await inviteUser(testEmail, 'user');
      
      if (result.success) {
        return {
          success: true,
          message: `Successfully sent test invitation to ${testEmail}`,
          details: result
        };
      } else {
        return {
          success: false,
          message: `Invite failed: ${result.error}`,
          details: result
        };
      }
    } catch (err) {
      return {
        success: false,
        message: `Invite test failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        details: err
      };
    }
  };

  const runFullTest = async () => {
    setIsLoading(true);
    const results: typeof testResults = {};

    try {
      // Test 1: Check table exists
      console.log('Testing user_invitations table...');
      results.tableCheck = await checkInvitationsTable();

      // Test 2: Fetch invitations
      console.log('Testing fetch invitations...');
      results.fetchTest = await testFetchInvitations();

      // Test 3: Send test invitation (only if email provided)
      if (testEmail) {
        console.log('Testing send invitation...');
        results.inviteTest = await testInviteUser();
      }

      setTestResults(results);

      // Summary
      const passedTests = Object.values(results).filter(r => r?.success).length;
      const totalTests = Object.values(results).filter(r => r !== undefined).length;
      
      if (passedTests === totalTests) {
        toast.success(`All ${totalTests} tests passed!`);
      } else {
        toast.warning(`${passedTests}/${totalTests} tests passed`);
      }

    } catch (err) {
      console.error('Test suite error:', err);
      toast.error('Test suite failed to run');
    } finally {
      setIsLoading(false);
    }
  };

  const getResultBadge = (result?: TestResult) => {
    if (!result) return null;
    
    return (
      <Badge variant="outline" className={result.success 
        ? 'bg-success-light text-success border-success/20' 
        : 'bg-destructive-light text-destructive border-destructive/20'
      }>
        {result.success ? (
          <>
            <CheckCircle className="h-3 w-3 mr-1" />
            Pass
          </>
        ) : (
          <>
            <XCircle className="h-3 w-3 mr-1" />
            Fail
          </>
        )}
      </Badge>
    );
  };

  if (!isAdmin) {
    return (
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <Alert className="border-warning/20 bg-warning-light">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning">
              You need administrator privileges to test invitation functionality.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mail className="h-5 w-5 text-primary" />
          <span>Invitation System Diagnostic</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Email Input */}
        <div className="space-y-2">
          <Label htmlFor="test-email">Test Email (optional)</Label>
          <Input
            id="test-email"
            type="email"
            placeholder="test@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Optional: Enter an email to test invitation sending (invitation will actually be sent)
          </p>
        </div>

        {/* Run Tests Button */}
        <Button onClick={runFullTest} disabled={isLoading} className="w-full">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Running Tests...' : 'Run Invitation Tests'}
        </Button>

        {/* Current State */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Current State</h4>
            <div className="text-sm space-y-1">
              <div><strong>Admin Status:</strong> {isAdmin ? '✅ Admin' : '❌ Not Admin'}</div>
              <div><strong>Company ID:</strong> {profile?.company_id || 'Not Set'}</div>
              <div><strong>Current Invitations:</strong> {invitations.length}</div>
              {userMgmtError && (
                <div className="text-destructive"><strong>Error:</strong> {userMgmtError}</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Quick Actions</h4>
            <div className="space-y-2">
              <Button variant="outline" size="sm" onClick={fetchInvitations} disabled={isLoading}>
                <Database className="h-4 w-4 mr-2" />
                Refresh Invitations
              </Button>
            </div>
          </div>
        </div>

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Test Results</h4>
            
            {testResults.tableCheck && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Database Table Check</div>
                  <div className="text-sm text-muted-foreground">{testResults.tableCheck.message}</div>
                </div>
                {getResultBadge(testResults.tableCheck)}
              </div>
            )}

            {testResults.fetchTest && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Fetch Invitations Test</div>
                  <div className="text-sm text-muted-foreground">{testResults.fetchTest.message}</div>
                </div>
                {getResultBadge(testResults.fetchTest)}
              </div>
            )}

            {testResults.inviteTest && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Send Invitation Test</div>
                  <div className="text-sm text-muted-foreground">{testResults.inviteTest.message}</div>
                </div>
                {getResultBadge(testResults.inviteTest)}
              </div>
            )}
          </div>
        )}

        {/* Debugging Info */}
        {Object.values(testResults).some(r => r && !r.success) && (
          <Alert className="border-destructive/20 bg-destructive-light">
            <XCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              Some tests failed. Check the browser console for detailed error information.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
