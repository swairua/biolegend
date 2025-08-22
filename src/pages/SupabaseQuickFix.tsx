import { SupabaseConfigGuide } from '@/components/auth/SupabaseConfigGuide';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BiolegendLogo } from '@/components/ui/biolegend-logo';
import { Database, ArrowLeft, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SupabaseQuickFix() {
  const navigate = useNavigate();

  const openSupabaseDashboard = () => {
    window.open('https://supabase.com/dashboard', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <BiolegendLogo size="lg" showText={false} />
          <h1 className="text-3xl font-bold mt-4 biolegend-brand">Biolegend Scientific Ltd</h1>
          <p className="text-muted-foreground mt-2">Supabase Configuration Quick Fix</p>
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
                  <h3 className="font-semibold">Supabase Dashboard</h3>
                  <p className="text-sm text-muted-foreground">Open your project</p>
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
                  <Database className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Summary */}
        <Alert variant="destructive" className="mb-8">
          <Database className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>❌ Error: Email signups are disabled</strong></p>
              <p>Your Supabase project configuration is preventing user registration. This blocks admin user creation.</p>
              <p><strong>Impact:</strong> Cannot create admin users, login will fail</p>
              <p><strong>Solution:</strong> Follow the configuration guide below to enable signup or create users manually</p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Configuration Guide */}
        <SupabaseConfigGuide />

        {/* Bottom Actions */}
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
            After completing the configuration, return to the login page and try signing in with admin credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
