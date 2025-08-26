import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';

export function NetworkDiagnostics() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          Network Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <span>
              Status: {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Network connectivity: {isOnline ? 'Available' : 'Unavailable'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
