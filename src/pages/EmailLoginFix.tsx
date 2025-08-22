import { EmailLoginConfigGuide } from '@/components/auth/EmailLoginConfigGuide';
import { BiolegendLogo } from '@/components/ui/biolegend-logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft, ExternalLink, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EmailLoginFix() {
  const navigate = useNavigate();

  const openSupabaseDashboard = () => {
    window.open('https://supabase.com/dashboard', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <BiolegendLogo size="lg" showText={false} />
          <h1 className="text-3xl font-bold mt-4 biolegend-brand">Biolegend Scientific Ltd</h1>
          <p className="text-muted-foreground mt-2">Email Login Configuration Fix</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Go Back</h3>
                  <p className="text-sm text-muted-foreground">Return to login</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Supabase Settings</h3>
                  <p className="text-sm text-muted-foreground">Authentication config</p>
                </div>
                <Button onClick={openSupabaseDashboard}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Test Login</h3>
                  <p className="text-sm text-muted-foreground">After configuration</p>
                </div>
                <Button variant="secondary" onClick={() => navigate('/test-login')}>
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Summary */}
        <Alert variant="destructive" className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>🚨 Critical Error: Email logins are disabled</strong></p>
              <p>Your Supabase project has the Email authentication provider completely disabled.</p>
              <p><strong>Impact:</strong> Cannot sign in with email and password - all authentication is blocked</p>
              <p><strong>Severity:</strong> CRITICAL - No access to application possible</p>
              <p><strong>Solution:</strong> Enable the Email provider in Supabase Authentication settings</p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Configuration Guide */}
        <EmailLoginConfigGuide />

        {/* Additional Information */}
        <div className="mt-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Why This Happens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Common Causes:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>New Supabase projects may have Email authentication disabled by default</li>
                    <li>Security settings were changed to disable email/password authentication</li>
                    <li>Project was configured to use only third-party authentication (Google, GitHub, etc.)</li>
                    <li>Authentication settings were accidentally modified</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Difference from "Email signups disabled":</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="font-medium text-red-700">Email logins disabled (Current)</p>
                      <p className="text-red-600">Entire Email provider is OFF - no email authentication at all</p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <p className="font-medium text-yellow-700">Email signups disabled (Previous)</p>
                      <p className="text-yellow-600">Email provider is ON but new registrations are blocked</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Login
            </Button>
            <Button onClick={openSupabaseDashboard}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Supabase Dashboard
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            After enabling the Email provider in Supabase, return to the login page and try signing in with admin credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
