import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Wifi,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { EmergencyAuthFix } from './EmergencyAuthFix';

interface DiagnosticStep {
  name: string;
  status: 'pending' | 'checking' | 'completed' | 'failed';
  details?: string;
  duration?: number;
}

export function AuthLoadingDiagnostic() {
  const { loading, isAuthenticated, user, clearTokens } = useAuth();
  const [steps, setSteps] = useState<DiagnosticStep[]>([
    { name: 'Network Connectivity', status: 'pending' },
    { name: 'Supabase Connection', status: 'pending' },
    { name: 'Authentication State', status: 'pending' },
    { name: 'User Session', status: 'pending' }
  ]);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  useEffect(() => {
    if (loading) {
      setStartTime(Date.now());
      // Show diagnostic after 3 seconds of loading
      const timer = setTimeout(() => {
        setShowDiagnostic(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowDiagnostic(false);
    }
  }, [loading]);

  useEffect(() => {
    if (showDiagnostic && loading) {
      runDiagnostics();
    }
  }, [showDiagnostic, loading]);

  const updateStep = (index: number, updates: Partial<DiagnosticStep>) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, ...updates } : step
    ));
  };

  const runDiagnostics = async () => {
    // Step 1: Network Connectivity
    updateStep(0, { status: 'checking' });
    const netStart = Date.now();
    
    try {
      // Simple connectivity test
      const response = await fetch('https://httpbin.org/json', { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        updateStep(0, { 
          status: 'completed', 
          details: 'Internet connection working',
          duration: Date.now() - netStart
        });
      } else {
        updateStep(0, { 
          status: 'failed', 
          details: `HTTP ${response.status}`,
          duration: Date.now() - netStart
        });
      }
    } catch (error: any) {
      updateStep(0, { 
        status: 'failed', 
        details: error.message?.includes('timeout') ? 'Connection timeout' : 'No internet',
        duration: Date.now() - netStart
      });
    }

    // Step 2: Supabase Connection
    updateStep(1, { status: 'checking' });
    const supabaseStart = Date.now();
    
    try {
      // Test Supabase connectivity
      const response = await fetch('https://mfhcbgnkxpifbhrtmgbv.supabase.co/rest/v1/', {
        method: 'HEAD',
        signal: AbortSignal.timeout(8000)
      });
      
      if (response.status === 200 || response.status === 401) { // 401 is expected without auth
        updateStep(1, { 
          status: 'completed', 
          details: 'Supabase reachable',
          duration: Date.now() - supabaseStart
        });
      } else {
        updateStep(1, { 
          status: 'failed', 
          details: `Supabase HTTP ${response.status}`,
          duration: Date.now() - supabaseStart
        });
      }
    } catch (error: any) {
      updateStep(1, { 
        status: 'failed', 
        details: error.message?.includes('timeout') ? 'Supabase timeout' : 'Supabase unreachable',
        duration: Date.now() - supabaseStart
      });
    }

    // Step 3: Authentication State
    updateStep(2, { status: 'checking' });
    const authStart = Date.now();
    
    // This is checked based on current auth state
    if (isAuthenticated) {
      updateStep(2, { 
        status: 'completed', 
        details: 'User authenticated',
        duration: Date.now() - authStart
      });
    } else if (!loading) {
      updateStep(2, { 
        status: 'completed', 
        details: 'No user session',
        duration: Date.now() - authStart
      });
    } else {
      updateStep(2, { 
        status: 'checking', 
        details: 'Still initializing...'
      });
    }

    // Step 4: User Session
    updateStep(3, { status: 'checking' });
    const sessionStart = Date.now();
    
    if (user) {
      updateStep(3, { 
        status: 'completed', 
        details: `Logged in as ${user.email}`,
        duration: Date.now() - sessionStart
      });
    } else if (!loading) {
      updateStep(3, { 
        status: 'completed', 
        details: 'No active session',
        duration: Date.now() - sessionStart
      });
    } else {
      updateStep(3, { 
        status: 'checking', 
        details: 'Verifying session...'
      });
    }
  };

  const getStepIcon = (status: DiagnosticStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'checking':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };

  const getStepBadge = (status: DiagnosticStep['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success-light text-success">OK</Badge>;
      case 'failed':
        return <Badge className="bg-destructive-light text-destructive">Failed</Badge>;
      case 'checking':
        return <Badge className="bg-primary-light text-primary">Checking</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const handleClearTokens = () => {
    clearTokens();
    toast.success('Authentication tokens cleared. Page will reload.');
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const currentDuration = Date.now() - startTime;

  // Only show if loading for more than 3 seconds
  if (!showDiagnostic || !loading) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <span>Authentication Loading</span>
            <Badge variant="outline" className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{Math.round(currentDuration / 1000)}s</span>
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Authentication is taking longer than expected. Running diagnostics...
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 border rounded">
                <div className="flex-shrink-0">
                  {getStepIcon(step.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{step.name}</span>
                    {getStepBadge(step.status)}
                  </div>
                  {step.details && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {step.details}
                      {step.duration && ` (${step.duration}ms)`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              If authentication continues to hang, try these solutions:
            </p>
            
            <div className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearTokens}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Clear Auth Tokens</span>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                className="flex items-center space-x-2"
              >
                <Wifi className="h-4 w-4" />
                <span>Refresh Page</span>
              </Button>
            </div>
          </div>

          {currentDuration > 15000 && (
            <div className="space-y-3">
              <Alert className="border-warning/20 bg-warning-light">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning">
                  <strong>Taking too long?</strong> Authentication has been stuck for over 15 seconds.
                  Try the emergency fixes below.
                </AlertDescription>
              </Alert>

              <EmergencyAuthFix />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
