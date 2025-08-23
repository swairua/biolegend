import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Database, Play } from 'lucide-react';
import { setupStorageBucket, testStorageSetup } from '@/utils/setupStorageBucket';
import { toast } from 'sonner';

export default function StorageSetup() {
  const [setupStatus, setSetupStatus] = useState<'idle' | 'setting-up' | 'testing' | 'complete' | 'error'>('idle');
  const [setupResult, setSetupResult] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);

  const handleSetupStorage = async () => {
    setSetupStatus('setting-up');
    setSetupResult(null);
    
    try {
      const result = await setupStorageBucket();
      setSetupResult(result);
      
      if (result.success) {
        toast.success(result.message);
        if (!result.requiresManualSetup && !result.needsPolicies) {
          setSetupStatus('complete');
        } else {
          setSetupStatus('idle');
        }
      } else {
        setSetupStatus('error');
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Setup error:', error);
      setSetupStatus('error');
      setSetupResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Setup failed' 
      });
      toast.error('Storage setup failed');
    }
  };

  const handleTestStorage = async () => {
    setTestStatus('testing');
    setTestResult(null);
    
    try {
      const result = await testStorageSetup();
      setTestResult(result);
      
      if (result.success) {
        toast.success(result.message);
        setSetupStatus('complete');
      } else {
        toast.error(`Storage test failed: ${result.error}`);
        setSetupStatus('error');
      }
    } catch (error) {
      console.error('Test error:', error);
      setTestResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Test failed' 
      });
      toast.error('Storage test failed');
    } finally {
      setTestStatus('idle');
    }
  };

  const [testStatus, setTestStatus] = useState<'idle' | 'testing'>('idle');

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Storage Setup for Company Logos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Supabase Storage Bucket</h3>
            <p className="text-sm text-muted-foreground">
              Set up storage bucket for uploading company logos
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSetupStorage}
              disabled={setupStatus === 'setting-up'}
              variant="outline"
            >
              {setupStatus === 'setting-up' ? 'Setting up...' : 'Setup Storage'}
            </Button>
            <Button
              onClick={handleTestStorage}
              disabled={testStatus === 'testing'}
              variant="outline"
            >
              <Play className="h-4 w-4 mr-2" />
              {testStatus === 'testing' ? 'Testing...' : 'Test Storage'}
            </Button>
          </div>
        </div>

        {setupResult && (
          <Alert className={setupResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {setupResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className="text-sm">
              <strong>{setupResult.success ? 'Success:' : 'Error:'}</strong> {setupResult.message}
              
              {setupResult.requiresManualSetup && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="font-medium text-blue-900 mb-2">Manual Setup Required:</p>
                  <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Go to Storage in your Supabase Dashboard</li>
                    <li>Click "Create bucket"</li>
                    <li>Name: <code className="bg-blue-100 px-1 rounded">company-logos</code></li>
                    <li>Public: ✅ (enabled)</li>
                    <li>Click "Create"</li>
                    <li>Then run the SQL policies in your SQL Editor (see console)</li>
                  </ol>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {testResult && (
          <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {testResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className="text-sm">
              <strong>Storage Test:</strong> {testResult.success ? testResult.message : testResult.error}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Badge variant={setupStatus === 'complete' ? 'default' : 'secondary'}>
              Storage Bucket
            </Badge>
            {setupStatus === 'complete' && <CheckCircle className="h-4 w-4 text-green-600" />}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={testResult?.success ? 'default' : 'secondary'}>
              Storage Policies
            </Badge>
            {testResult?.success && <CheckCircle className="h-4 w-4 text-green-600" />}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={(setupStatus === 'complete' && testResult?.success) ? 'default' : 'secondary'}>
              Ready for Upload
            </Badge>
            {(setupStatus === 'complete' && testResult?.success) && <CheckCircle className="h-4 w-4 text-green-600" />}
          </div>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">What this sets up:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Creates a public storage bucket named "company-logos"</li>
            <li>• Configures file type restrictions (images only)</li>
            <li>• Sets file size limit to 5MB</li>
            <li>• Enables public read access for logo display</li>
            <li>• Allows authenticated users to upload/update logos</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
