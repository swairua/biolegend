import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ConnectionStatus {
  connected: boolean;
  message: string;
  url: string;
  tables: string[];
  hasAuth: boolean;
}

export const SupabaseConnectionTest: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    try {
      // Test basic connection
      const { data: healthData, error: healthError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(1);

      if (healthError) {
        setStatus({
          connected: false,
          message: `Connection failed: ${healthError.message}`,
          url: supabase.supabaseUrl,
          tables: [],
          hasAuth: false
        });
        return;
      }

      // Get list of tables
      const { data: tablesData } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .order('table_name');

      const tables = tablesData?.map(t => t.table_name) || [];

      // Test auth
      const { data: authData } = await supabase.auth.getSession();
      const hasAuth = !!authData.session;

      setStatus({
        connected: true,
        message: 'Successfully connected to Supabase!',
        url: supabase.supabaseUrl,
        tables,
        hasAuth
      });

    } catch (error) {
      setStatus({
        connected: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        url: supabase.supabaseUrl,
        tables: [],
        hasAuth: false
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status?.connected ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : status?.connected === false ? (
            <XCircle className="h-5 w-5 text-red-500" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin" />
          )}
          Supabase Connection Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && (
          <>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Database URL:</p>
              <code className="text-xs bg-muted p-2 rounded block">{status.url}</code>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Status:</p>
              <Badge variant={status.connected ? "default" : "destructive"}>
                {status.message}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Authentication:</p>
              <Badge variant={status.hasAuth ? "default" : "secondary"}>
                {status.hasAuth ? "User Authenticated" : "Not Authenticated"}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Database Tables ({status.tables.length}):
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {status.tables.map(table => (
                  <Badge key={table} variant="outline" className="text-xs">
                    {table}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        <Button 
          onClick={testConnection} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing Connection...
            </>
          ) : (
            'Test Connection Again'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
