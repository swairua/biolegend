import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Shield,
  Globe
} from 'lucide-react';
import { testSupabaseConnection, NetworkDiagnostic } from '@/utils/networkDiagnostics';
import { toast } from 'sonner';

export const NetworkDiagnostics = () => {
  const [testing, setTesting] = useState(false);
  const [lastTest, setLastTest] = useState<{
    success: boolean;
    diagnostic?: NetworkDiagnostic;
    timestamp: Date;
  } | null>(null);

  const runDiagnostics = async () => {
    setTesting(true);
    try {
      const result = await testSupabaseConnection();
      setLastTest({
        ...result,
        timestamp: new Date()
      });

      if (result.success) {
        toast.success('Connection test passed');
      } else {
        toast.error(`Connection test failed: ${result.diagnostic?.message}`);
      }
    } catch (error) {
      console.error('Diagnostics error:', error);
      toast.error('Failed to run diagnostics');
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (success?: boolean) => {
    if (success === undefined) return <Wifi className="h-4 w-4 text-muted-foreground" />;
    return success ? 
      <CheckCircle className="h-4 w-4 text-success" /> : 
      <XCircle className="h-4 w-4 text-destructive" />;
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'browser_extension':
        return <Shield className="h-4 w-4 text-warning" />;
      case 'network':
        return <WifiOff className="h-4 w-4 text-destructive" />;
      case 'cors':
        return <Globe className="h-4 w-4 text-warning" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'browser_extension':
        return 'bg-warning-light text-warning border-warning/20';
      case 'network':
        return 'bg-destructive-light text-destructive border-destructive/20';
      case 'cors':
        return 'bg-warning-light text-warning border-warning/20';
      case 'auth':
        return 'bg-primary-light text-primary border-primary/20';
      case 'database':
        return 'bg-destructive-light text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-muted/20';
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          Network Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(lastTest?.success)}
            <span className="text-sm">
              Connection Status: {
                lastTest?.success === undefined ? 'Not tested' :
                lastTest.success ? 'Connected' : 'Failed'
              }
            </span>
          </div>
          <Button 
            onClick={runDiagnostics} 
            disabled={testing}
            variant="outline"
            size="sm"
          >
            {testing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Test Connection
          </Button>
        </div>

        {lastTest && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Last test: {lastTest.timestamp.toLocaleString()}
            </div>

            {!lastTest.success && lastTest.diagnostic && (
              <Alert>
                <div className="flex items-start gap-2">
                  {getTypeIcon(lastTest.diagnostic.type)}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {lastTest.diagnostic.type.replace('_', ' ').toUpperCase()}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={getTypeColor(lastTest.diagnostic.type)}
                      >
                        {lastTest.diagnostic.canRetry ? 'Retryable' : 'Requires Action'}
                      </Badge>
                    </div>
                    <AlertDescription>
                      <div className="space-y-1">
                        <div><strong>Issue:</strong> {lastTest.diagnostic.message}</div>
                        <div><strong>Suggestion:</strong> {lastTest.diagnostic.suggestion}</div>
                      </div>
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}

            {lastTest.success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Connection to Supabase is working properly. All systems operational.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="border-t pt-4 space-y-2">
          <h4 className="text-sm font-medium">Common Issues:</h4>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <Shield className="h-3 w-3 text-warning" />
              <span><strong>Browser Extensions:</strong> Ad blockers or privacy extensions may block requests</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <WifiOff className="h-3 w-3 text-destructive" />
              <span><strong>Network Issues:</strong> Check internet connection and firewall settings</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <Globe className="h-3 w-3 text-warning" />
              <span><strong>CORS/Policy:</strong> Corporate networks may have restrictions</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
