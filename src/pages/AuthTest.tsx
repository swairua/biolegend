import { QuickAuthTest } from '@/components/QuickAuthTest';
import { EmailLoginConfigGuide } from '@/components/auth/EmailLoginConfigGuide';
import { BiolegendLogo } from '@/components/ui/biolegend-logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { Shield, Settings, ArrowLeft, Info } from 'lucide-react';

export default function AuthTest() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <BiolegendLogo size="lg" showText={false} />
          <h1 className="text-3xl font-bold mt-4 biolegend-brand">Biolegend Scientific Ltd</h1>
          <p className="text-muted-foreground mt-2">Authentication Diagnostics & Repair</p>
          
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>
        </div>

        {/* Admin Credentials Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Admin Credentials:</strong><br />
            Email: admin@biolegendscientific.co.ke<br />
            Password: Biolegend2024!Admin
          </AlertDescription>
        </Alert>

        {/* Main Content */}
        <Tabs defaultValue="test" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="test" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Quick Test
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration Guide
            </TabsTrigger>
          </TabsList>

          <TabsContent value="test" className="space-y-4">
            <QuickAuthTest />
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Supabase Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <EmailLoginConfigGuide />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle>Supabase Connection Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>URL:</strong> https://mfhcbgnkxpifbhrtmgbv.supabase.co</div>
              <div><strong>Status:</strong> <span className="text-green-600">Connected</span></div>
              <div><strong>Project:</strong> mfhcbgnkxpifbhrtmgbv</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
