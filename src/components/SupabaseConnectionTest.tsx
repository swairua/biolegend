import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ConnectionStatus {
  isConnected: boolean;
  error: string | null;
  url: string;
  keyPrefix: string;
}

export function SupabaseConnectionTest() {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    error: null,
    url: '',
    keyPrefix: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  const testConnection = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Testing Supabase connection...');
      
      // Get the Supabase client info
      const clientUrl = (supabase as any).supabaseUrl || 'Unknown';
      const clientKey = (supabase as any).supabaseKey || 'Unknown';
      const keyPrefix = clientKey.substring(0, 20) + '...';
      
      console.log('Client URL:', clientUrl);
      console.log('Client Key Prefix:', keyPrefix);
      
      // Test a simple query to verify connection
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error) {
        console.log('⚠️ Connection test error:', error);
        setStatus({
          isConnected: false,
          error: error.message,
          url: clientUrl,
          keyPrefix
        });
      } else {
        console.log('✅ Supabase connection successful!');
        setStatus({
          isConnected: true,
          error: null,
          url: clientUrl,
          keyPrefix
        });
      }
    } catch (error) {
      console.error('❌ Supabase connection test failed:', error);
      setStatus({
        isConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        url: 'Error',
        keyPrefix: 'Error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Supabase Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Testing connection...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {status.isConnected ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <Badge 
                variant={status.isConnected ? "default" : "destructive"}
                className={status.isConnected ? "bg-green-100 text-green-700" : ""}
              >
                {status.isConnected ? 'Connected' : 'Failed'}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">URL: </span>
                <span className="font-mono text-xs">{status.url}</span>
              </div>
              <div>
                <span className="font-medium">Key: </span>
                <span className="font-mono text-xs">{status.keyPrefix}</span>
              </div>
            </div>

            {status.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Error:</strong> {status.error}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={testConnection} 
              size="sm" 
              variant="outline" 
              className="w-full"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Test Again
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
