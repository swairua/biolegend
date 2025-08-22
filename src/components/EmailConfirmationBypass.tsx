import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Mail, AlertTriangle, ExternalLink, Shield, Info } from 'lucide-react';
import { toast } from 'sonner';

export function EmailConfirmationBypass() {
  const [showInstructions, setShowInstructions] = useState(false);

  const openSupabaseAuth = () => {
    const supabaseUrl = 'https://klifzjcfnlaxminytmyh.supabase.co';
    const projectId = supabaseUrl.split('//')[1].split('.')[0];
    const authUrl = `https://supabase.com/dashboard/project/${projectId}/auth/settings`;
    window.open(authUrl, '_blank');
    toast.info('Opening Supabase Auth Settings...');
  };

  const openSupabaseUsers = () => {
    const supabaseUrl = 'https://klifzjcfnlaxminytmyh.supabase.co';
    const projectId = supabaseUrl.split('//')[1].split('.')[0];
    const usersUrl = `https://supabase.com/dashboard/project/${projectId}/auth/users`;
    window.open(usersUrl, '_blank');
    toast.info('Opening Supabase Users Management...');
  };

  return (
    <div className="space-y-6">
      {/* Main Alert */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700">
            <Mail className="h-5 w-5" />
            Email Confirmation Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert className="border-yellow-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Email Not Confirmed:</strong> Supabase requires email confirmation for new accounts. 
                You have two options to proceed with super admin creation.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Option 1: Disable Email Confirmation */}
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-700">Option 1: Disable Email Confirmation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-blue-600">
                    Temporarily disable email confirmation in Supabase to create the super admin.
                  </p>
                  
                  <Button 
                    onClick={openSupabaseAuth}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Auth Settings
                  </Button>
                  
                  <Button 
                    onClick={() => setShowInstructions(!showInstructions)}
                    variant="outline"
                    className="w-full"
                  >
                    {showInstructions ? 'Hide' : 'Show'} Instructions
                  </Button>
                </CardContent>
              </Card>

              {/* Option 2: Manual Email Confirmation */}
              <Card className="border-green-200">
                <CardHeader>
                  <CardTitle className="text-lg text-green-700">Option 2: Manual Confirmation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-green-600">
                    Manually confirm the email address in Supabase Users panel.
                  </p>
                  
                  <Button 
                    onClick={openSupabaseUsers}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Users Panel
                  </Button>
                  
                  <div className="text-xs text-green-600">
                    Look for the unconfirmed user and click "Confirm Email"
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Instructions */}
      {showInstructions && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-700">Detailed Instructions - Disable Email Confirmation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-blue-200">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-blue-700">
                <strong>Recommended:</strong> This is the easiest option for initial setup. 
                You can re-enable email confirmation after creating the super admin.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-semibold text-blue-700">Step-by-Step:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-600">
                <li>Click "Open Auth Settings" above to open Supabase Dashboard</li>
                <li>Navigate to <strong>Authentication → Settings</strong></li>
                <li>Scroll down to <strong>"Email Confirmation"</strong> section</li>
                <li>Toggle <strong>OFF</strong> the "Enable email confirmations" setting</li>
                <li>Click <strong>"Save"</strong> to apply changes</li>
                <li>Return to this page and try creating the super admin again</li>
                <li><em>(Optional)</em> Re-enable email confirmation after setup is complete</li>
              </ol>
            </div>

            <div className="bg-white p-3 rounded border border-blue-200">
              <h5 className="font-medium text-blue-700 mb-2">Alternative: Manual User Creation</h5>
              <p className="text-sm text-blue-600">
                If you prefer, you can also create the admin user directly in Supabase Dashboard:
              </p>
              <ul className="list-disc list-inside text-xs text-blue-600 mt-1 space-y-1">
                <li>Go to Authentication → Users</li>
                <li>Click "Add User"</li>
                <li>Enter email and password</li>
                <li>Set "Email Confirmed" to true</li>
                <li>Then update the profile via SQL to set role as 'admin'</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">After Resolving Email Issue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm">Return to Database Setup page</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm">Try creating the super admin again</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm">Sign in with the admin credentials</span>
            </div>
          </div>

          <Button
            onClick={() => window.location.href = '/database-setup'}
            className="w-full mt-4"
            size="lg"
          >
            Return to Database Setup
          </Button>
        </CardContent>
      </Card>

      {/* Technical Info */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm text-gray-600">Technical Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Issue:</strong> Supabase requires email confirmation for new user accounts by default.</p>
            <p><strong>Impact:</strong> Super admin account creation fails with "email not confirmed" error.</p>
            <p><strong>Solutions:</strong> Either disable email confirmation temporarily or manually confirm the email.</p>
            <p><strong>Security:</strong> Email confirmation can be re-enabled after initial setup for normal users.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
