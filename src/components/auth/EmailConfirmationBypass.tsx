import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  Copy, 
  ExternalLink, 
  RefreshCw,
  CheckCircle,
  Database
} from 'lucide-react';
import { toast } from 'sonner';
import { getEmailConfirmationBypassSQL, getManualConfirmationInstructions } from '@/utils/emailConfirmationSQL';
import { createBiolegendAdmin, checkAdminSignIn, BIOLEGEND_ADMIN_CREDENTIALS } from '@/utils/enhancedAdminCreation';

interface EmailConfirmationBypassProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function EmailConfirmationBypass({ onSuccess, onBack }: EmailConfirmationBypassProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [showSQL, setShowSQL] = useState(false);

  const handleCopySQL = () => {
    const sql = getEmailConfirmationBypassSQL();
    navigator.clipboard.writeText(sql);
    toast.success('SQL script copied to clipboard!');
  };

  const handleCopyInstructions = () => {
    const instructions = getManualConfirmationInstructions();
    navigator.clipboard.writeText(instructions);
    toast.success('Instructions copied to clipboard!');
  };

  const handleRetrySignIn = async () => {
    setIsRetrying(true);
    try {
      // First check if admin can now sign in
      const canSignIn = await checkAdminSignIn();
      if (canSignIn) {
        toast.success('Email confirmed! Admin can now sign in.');
        onSuccess();
        return;
      }

      // Try the enhanced creation again
      const result = await createBiolegendAdmin();
      if (result.success) {
        toast.success(result.message);
        onSuccess();
      } else {
        toast.error(result.error || 'Email still requires manual confirmation');
      }
    } catch (error) {
      toast.error('Retry failed. Please follow manual steps.');
    } finally {
      setIsRetrying(false);
    }
  };

  const openSupabaseDashboard = () => {
    window.open('https://supabase.com/dashboard', '_blank');
    toast.info('Opening Supabase dashboard. Navigate to your project.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6 text-warning" />
            Email Confirmation Required
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            The admin user was created but requires email confirmation to sign in
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Alert */}
          <Alert className="border-warning/20 bg-warning/5">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription>
              <strong>Admin User Created:</strong> {BIOLEGEND_ADMIN_CREDENTIALS.email}<br />
              <strong>Issue:</strong> Email confirmation is enabled in Supabase and must be completed manually.
            </AlertDescription>
          </Alert>

          {/* Quick Actions */}
          <div className="grid gap-3 md:grid-cols-2">
            <Button
              onClick={handleRetrySignIn}
              disabled={isRetrying}
              variant="default"
              className="w-full"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Test Sign In
                </>
              )}
            </Button>

            <Button
              onClick={openSupabaseDashboard}
              variant="outline"
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Supabase
            </Button>
          </div>

          {/* Manual Steps */}
          <div className="space-y-4">
            <h3 className="font-medium">Manual Confirmation Steps:</h3>
            
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">1</span>
                <span>Open your Supabase Dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">2</span>
                <span>Navigate to Authentication → Users</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">3</span>
                <span>Find: <code className="bg-background px-1 rounded text-xs">{BIOLEGEND_ADMIN_CREDENTIALS.email}</code></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">4</span>
                <span>Click the three dots menu (⋯) → "Confirm email"</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">5</span>
                <span>Return here and click "Test Sign In"</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCopyInstructions}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Instructions
              </Button>
            </div>
          </div>

          {/* Alternative: SQL Method */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Advanced: SQL Method</h3>
              <Button
                onClick={() => setShowSQL(!showSQL)}
                variant="ghost"
                size="sm"
              >
                <Database className="h-4 w-4 mr-1" />
                {showSQL ? 'Hide' : 'Show'} SQL
              </Button>
            </div>

            {showSQL && (
              <div className="space-y-3">
                <Alert>
                  <Database className="h-4 w-4" />
                  <AlertDescription>
                    <strong>For Advanced Users:</strong> Execute this SQL in Supabase SQL Editor to bypass email confirmation.
                  </AlertDescription>
                </Alert>

                <Textarea
                  value={getEmailConfirmationBypassSQL()}
                  readOnly
                  className="font-mono text-xs h-40"
                  placeholder="SQL script will appear here..."
                />

                <Button
                  onClick={handleCopySQL}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy SQL Script
                </Button>
              </div>
            )}
          </div>

          {/* Alternative: Disable Email Confirmations */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              <strong>Alternative:</strong> Disable email confirmations entirely in Supabase Dashboard → 
              Authentication → Settings → "Enable email confirmations" (turn OFF)
            </AlertDescription>
          </Alert>

          {/* Navigation */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={onBack}
              variant="outline"
              className="flex-1"
            >
              Back to Login
            </Button>
            <Button
              onClick={handleRetrySignIn}
              disabled={isRetrying}
              className="flex-1"
            >
              {isRetrying ? 'Checking...' : 'Test Again'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
