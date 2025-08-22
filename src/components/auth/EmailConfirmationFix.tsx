import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ExternalLink, RefreshCw, CheckCircle, Settings, Users } from 'lucide-react';
import { ADMIN_CREDENTIALS } from '@/utils/createStreamlinedSuperAdmin';

interface EmailConfirmationFixProps {
  onFixed: () => void;
}

export function EmailConfirmationFix({ onFixed }: EmailConfirmationFixProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    // Give user time to make the change
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRetrying(false);
    onFixed();
  };

  const steps = [
    {
      number: 1,
      title: "Disable Email Confirmation",
      description: "Turn off email verification in Supabase",
      action: "Open Supabase Dashboard",
      url: "https://supabase.com/dashboard/projects"
    },
    {
      number: 2,
      title: "Alternative: Confirm Email",
      description: "Manually confirm the admin email",
      action: "Go to Users Section",
      url: "https://supabase.com/dashboard/projects"
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 bg-red-500 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-red-700">Email Confirmation Required</CardTitle>
            <p className="text-sm text-muted-foreground">
              Your admin account needs email confirmation disabled or manually confirmed
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              <strong>Quick Fix Required:</strong> Choose one option below to enable immediate admin access
            </AlertDescription>
          </Alert>

          {/* Option 1: Disable Email Confirmation */}
          <Card className={`transition-all ${currentStep === 1 ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge variant={currentStep === 1 ? "default" : "secondary"}>
                    Option 1
                  </Badge>
                  <Settings className="h-5 w-5" />
                  Disable Email Confirmation (Recommended)
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep(1)}
                >
                  Choose This
                </Button>
              </div>
            </CardHeader>
            {currentStep === 1 && (
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-3 text-green-700">Follow these exact steps:</h4>
                  <ol className="space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-[20px] h-5 text-xs">1</Badge>
                      <div>
                        <p className="font-medium">Open your Supabase Dashboard</p>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-blue-600"
                          onClick={() => window.open('https://supabase.com/dashboard/projects', '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          supabase.com/dashboard/projects
                        </Button>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-[20px] h-5 text-xs">2</Badge>
                      <p>Select your project from the list</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-[20px] h-5 text-xs">3</Badge>
                      <p>In the left sidebar, click <strong>"Authentication"</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-[20px] h-5 text-xs">4</Badge>
                      <p>Click <strong>"Settings"</strong> in the Authentication section</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-[20px] h-5 text-xs">5</Badge>
                      <p>Scroll down to <strong>"Email Auth"</strong> section</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-[20px] h-5 text-xs">6</Badge>
                      <div>
                        <p className="font-medium text-red-600">Turn OFF "Enable email confirmations"</p>
                        <p className="text-xs text-muted-foreground">This is the key setting!</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-[20px] h-5 text-xs">7</Badge>
                      <p>Click <strong>"Save"</strong> at the bottom</p>
                    </li>
                  </ol>
                </div>
                
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    After saving, new signups (including admin) won't need email confirmation
                  </AlertDescription>
                </Alert>
              </CardContent>
            )}
          </Card>

          {/* Option 2: Manual Email Confirmation */}
          <Card className={`transition-all ${currentStep === 2 ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge variant={currentStep === 2 ? "default" : "secondary"}>
                    Option 2
                  </Badge>
                  <Users className="h-5 w-5" />
                  Manually Confirm Email
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep(2)}
                >
                  Choose This
                </Button>
              </div>
            </CardHeader>
            {currentStep === 2 && (
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-3 text-blue-700">Follow these exact steps:</h4>
                  <ol className="space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-[20px] h-5 text-xs">1</Badge>
                      <div>
                        <p className="font-medium">Open your Supabase Dashboard</p>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-blue-600"
                          onClick={() => window.open('https://supabase.com/dashboard/projects', '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          supabase.com/dashboard/projects
                        </Button>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-[20px] h-5 text-xs">2</Badge>
                      <p>Select your project from the list</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-[20px] h-5 text-xs">3</Badge>
                      <p>In the left sidebar, click <strong>"Authentication"</strong></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-[20px] h-5 text-xs">4</Badge>
                      <p>Click <strong>"Users"</strong> in the Authentication section</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-[20px] h-5 text-xs">5</Badge>
                      <div>
                        <p>Find the user with email: <code className="bg-gray-100 px-1 rounded">{ADMIN_CREDENTIALS.email}</code></p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-[20px] h-5 text-xs">6</Badge>
                      <p>Click on the user row to open details</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-[20px] h-5 text-xs">7</Badge>
                      <div>
                        <p className="font-medium text-green-600">Click "Confirm email" button</p>
                        <p className="text-xs text-muted-foreground">This will manually confirm the email</p>
                      </div>
                    </li>
                  </ol>
                </div>
                
                <Alert className="border-blue-200 bg-blue-50">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    After confirming, this specific admin user can sign in immediately
                  </AlertDescription>
                </Alert>
              </CardContent>
            )}
          </Card>

          {/* Retry Button */}
          <div className="text-center space-y-4">
            <div className="text-sm text-muted-foreground">
              After completing the steps above:
            </div>
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full"
              size="lg"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  I've completed the steps - Try signing in again
                </>
              )}
            </Button>
            
            <div className="text-xs text-muted-foreground">
              Admin credentials: {ADMIN_CREDENTIALS.email} / {ADMIN_CREDENTIALS.password}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
