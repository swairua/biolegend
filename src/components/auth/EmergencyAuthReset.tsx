import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Trash2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { clearAuthTokens } from '@/utils/authHelpers';
import { toast } from 'sonner';

export const EmergencyAuthReset = () => {
  const [isResetting, setIsResetting] = useState(false);
  const { loading, isAuthenticated, clearTokens } = useAuth();

  const handleEmergencyReset = async () => {
    setIsResetting(true);
    
    try {
      console.log('🚨 Emergency auth reset initiated');
      
      // Clear all auth tokens
      clearAuthTokens();
      
      // Clear React Query cache if available
      if (typeof window !== 'undefined' && (window as any).queryClient) {
        (window as any).queryClient.clear();
      }
      
      // Clear all localStorage
      try {
        localStorage.clear();
        console.log('✅ localStorage cleared');
      } catch (error) {
        console.warn('⚠️ Could not clear localStorage:', error);
      }
      
      // Clear all sessionStorage
      try {
        sessionStorage.clear();
        console.log('✅ sessionStorage cleared');
      } catch (error) {
        console.warn('⚠️ Could not clear sessionStorage:', error);
      }
      
      toast.success('Emergency reset completed. Reloading page...');
      
      // Force page reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Emergency reset failed:', error);
      toast.error('Emergency reset failed. Please refresh the page manually.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSoftReset = () => {
    try {
      clearTokens();
      toast.success('Authentication tokens cleared. Please sign in again.');
    } catch (error) {
      console.error('Soft reset failed:', error);
      toast.error('Soft reset failed. Try the emergency reset instead.');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Authentication Issue Detected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            The app appears to be stuck loading. This usually happens when authentication tokens become corrupted or network issues prevent proper initialization.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Current Status:</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span>Loading:</span>
                <span className={loading ? 'text-yellow-600' : 'text-green-600'}>
                  {loading ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Authenticated:</span>
                <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                  {isAuthenticated ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Recovery Options:</h4>
            
            <Button 
              variant="outline" 
              onClick={handleSoftReset}
              className="w-full flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Soft Reset (Clear Auth Tokens)
            </Button>
            
            <Button 
              variant="destructive" 
              onClick={handleEmergencyReset}
              disabled={isResetting}
              className="w-full flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isResetting ? 'Resetting...' : 'Emergency Reset (Clear All Data)'}
            </Button>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Soft Reset:</strong> Clears authentication tokens only.<br/>
              <strong>Emergency Reset:</strong> Clears all stored data and reloads the page.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
};
