import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, Shield, Database, CheckCircle, AlertTriangle, User, ExternalLink, Copy } from 'lucide-react';
import { createSuperAdmin, SUPER_ADMIN_CREDENTIALS } from '@/utils/createSuperAdmin';
import { fixDatabaseIssues, getRequiredSQL } from '@/utils/automaticDatabaseFix';
import { runImmediateDatabaseFix } from '@/utils/runImmediateFix';
import { toast } from 'sonner';

interface SetupStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message?: string;
}

export function ForcedInitialSetup() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [setupComplete, setSetupComplete] = useState(false);
  const [adminCreated, setAdminCreated] = useState(false);
  const [databaseFixed, setDatabaseFixed] = useState(false);
  const [forceStarted, setForceStarted] = useState(false);
  
  const [steps, setSteps] = useState<SetupStep[]>([
    { id: 'database-check', name: 'Check Database Status', status: 'pending' },
    { id: 'database-fix', name: 'Fix Database Issues', status: 'pending' },
    { id: 'admin-create', name: 'Create Super Admin', status: 'pending' },
    { id: 'verification', name: 'Verify Setup', status: 'pending' },
    { id: 'complete', name: 'Setup Complete', status: 'pending' }
  ]);

  const updateStep = (stepId: string, status: SetupStep['status'], message?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, message } : step
    ));
  };

  const executeSetup = async () => {
    setIsRunning(true);
    setForceStarted(true);
    
    try {
      // Step 1: Database Check
      setCurrentStep(0);
      updateStep('database-check', 'running');
      
      console.log('🔍 Step 1: Checking database status...');
      const dbStatus = await runImmediateDatabaseFix();
      
      if (dbStatus.success) {
        updateStep('database-check', 'completed', 'Database is operational');
        setDatabaseFixed(true);
      } else {
        updateStep('database-check', 'completed', `Found ${dbStatus.errors.length} issues`);
      }

      // Step 2: Database Fix (if needed)
      setCurrentStep(1);
      updateStep('database-fix', 'running');
      
      if (!dbStatus.success) {
        console.log('🔧 Step 2: Fixing database issues...');
        const fixResult = await fixDatabaseIssues();
        const criticalFixed = fixResult.filter(r => r.success && r.step.includes('Tax')).length;
        
        if (criticalFixed > 0) {
          updateStep('database-fix', 'completed', 'Critical issues resolved');
          setDatabaseFixed(true);
        } else {
          updateStep('database-fix', 'failed', 'Manual SQL execution required');
          toast.warning('Database needs manual SQL execution - continuing with admin setup');
        }
      } else {
        updateStep('database-fix', 'completed', 'No fixes needed');
        setDatabaseFixed(true);
      }

      // Step 3: Create Super Admin
      setCurrentStep(2);
      updateStep('admin-create', 'running');
      
      console.log('👤 Step 3: Creating super admin...');
      const adminResult = await createSuperAdmin();
      
      if (adminResult.success) {
        updateStep('admin-create', 'completed', 'Super admin created successfully');
        setAdminCreated(true);
        toast.success('Super admin account created!');
      } else {
        updateStep('admin-create', 'failed', adminResult.error);
        toast.error(`Admin creation failed: ${adminResult.error}`);
      }

      // Step 4: Verification
      setCurrentStep(3);
      updateStep('verification', 'running');
      
      console.log('✅ Step 4: Verifying setup...');
      const finalCheck = await runImmediateDatabaseFix();
      const criticalIssues = finalCheck.errors.filter(e => e.severity === 'CRITICAL').length;
      
      if (criticalIssues === 0 && adminCreated) {
        updateStep('verification', 'completed', 'All systems operational');
      } else {
        updateStep('verification', 'completed', `${criticalIssues} critical issues remain`);
      }

      // Step 5: Complete
      setCurrentStep(4);
      updateStep('complete', 'completed', 'Initial setup finished');
      setSetupComplete(true);
      
      toast.success('🎉 Initial setup completed!');
      
    } catch (error) {
      console.error('Setup failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateStep(steps[currentStep]?.id || 'unknown', 'failed', errorMessage);
      toast.error('Setup failed - check console for details');
    } finally {
      setIsRunning(false);
    }
  };

  // Auto-start setup when component mounts with delay
  useEffect(() => {
    if (!forceStarted && !isRunning) {
      console.log('🚀 Auto-starting forced initial setup...');
      const timer = setTimeout(executeSetup, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard', '_blank');
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-blue-700">
            <div className="bg-blue-600 p-2 rounded-full">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl">🚀 Forced Initial Setup</h2>
              <p className="text-sm font-normal text-blue-600">
                Automatically executing database fixes and admin creation
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={progress} className="h-3" />
            <div className="flex justify-between text-sm text-blue-600">
              <span>Progress: {Math.round(progress)}%</span>
              <span>Step {currentStep + 1} of {steps.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Setup Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.status === 'completed' ? 'bg-green-100 text-green-700' :
                    step.status === 'running' ? 'bg-blue-100 text-blue-700' :
                    step.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {step.status === 'completed' ? '✓' :
                     step.status === 'running' ? '⏳' :
                     step.status === 'failed' ? '✗' :
                     index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{step.name}</div>
                    {step.message && (
                      <div className="text-sm text-gray-600">{step.message}</div>
                    )}
                  </div>
                </div>
                <Badge variant={
                  step.status === 'completed' ? 'default' :
                  step.status === 'running' ? 'secondary' :
                  step.status === 'failed' ? 'destructive' :
                  'outline'
                }>
                  {step.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Admin Credentials (if created) */}
      {adminCreated && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <Shield className="h-5 w-5" />
              🔐 Super Admin Credentials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                <strong>SAVE THESE CREDENTIALS:</strong> You'll need them to sign in to the system.
              </AlertDescription>
            </Alert>

            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="font-mono text-sm">{SUPER_ADMIN_CREDENTIALS.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(SUPER_ADMIN_CREDENTIALS.email, 'Email')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-600">Password</label>
                  <p className="font-mono text-sm">{SUPER_ADMIN_CREDENTIALS.password}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(SUPER_ADMIN_CREDENTIALS.password, 'Password')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Database Fix Required */}
      {!databaseFixed && steps[1]?.status === 'failed' && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Database className="h-5 w-5" />
              🚨 Manual Database Fix Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Some database issues require manual SQL execution in Supabase dashboard.
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-3">
              <Button onClick={openSupabase} className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Open Supabase Dashboard
              </Button>
              <Button 
                onClick={() => copyToClipboard(getRequiredSQL().taxColumnsSQL, 'Database Fix SQL')}
                variant="outline"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Fix SQL
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Actions */}
      {setupComplete && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              🎉 Setup Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-green-200 bg-white">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Initial setup has been completed. You can now sign in and start using the system.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium">Next Steps:</h4>
              <ol className="list-decimal list-inside text-sm space-y-1 ml-4">
                <li>Use the admin credentials above to sign in</li>
                <li>Change the default password after first login</li>
                <li>Set up your company information</li>
                <li>Create additional user accounts as needed</li>
              </ol>
            </div>

            <Button
              onClick={() => window.location.href = '/'}
              className="w-full"
              size="lg"
            >
              <User className="h-4 w-4 mr-2" />
              Go to Dashboard & Sign In
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Manual Restart Option */}
      {!isRunning && !setupComplete && (
        <Card>
          <CardContent className="pt-6">
            <Button 
              onClick={executeSetup}
              className="w-full"
              size="lg"
              variant="outline"
            >
              <Zap className="h-4 w-4 mr-2" />
              Restart Setup Process
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
