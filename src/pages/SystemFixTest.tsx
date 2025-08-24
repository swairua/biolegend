import React, { useState, useEffect } from 'react';
import { SystemAuditAndFix } from '@/components/SystemAuditAndFix';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { executeSystemFixes, auditAndFixSystem } from '@/utils/systemAuditAndFix';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, XCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';

export function SystemFixTest() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [hasExecuted, setHasExecuted] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      // Test basic Supabase connection
      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .limit(1);

      if (error) {
        console.warn('Connection test failed:', error);
        setConnectionStatus('error');
      } else {
        console.log('✅ Supabase connection successful');
        setConnectionStatus('connected');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatus('error');
    }
  };

  const executeQuickFix = async () => {
    if (hasExecuted) return;
    
    try {
      toast.info('Executing system fixes automatically...');
      setHasExecuted(true);
      
      // Run the audit first
      console.log('🔍 Running system audit...');
      const auditResult = await auditAndFixSystem();
      console.log('Audit result:', auditResult);
      
      // Then execute fixes
      console.log('🚀 Executing system fixes...');
      const fixResult = await executeSystemFixes();
      console.log('Fix result:', fixResult);
      
      if (fixResult.success) {
        toast.success('🎉 System fixes completed successfully!');
      } else {
        toast.warning('⚠️ Manual execution required - check the SQL script below');
      }
      
    } catch (error: any) {
      console.error('Quick fix failed:', error);
      toast.error('Quick fix failed', { description: error.message });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">System Audit & Fix Test Page</h1>
        <p className="text-muted-foreground">
          Test and execute database fixes for RLS policies and user relations
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {connectionStatus === 'checking' && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>}
            {connectionStatus === 'connected' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {connectionStatus === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
            Database Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span>Supabase Connection:</span>
            <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
              {connectionStatus === 'checking' && 'Checking...'}
              {connectionStatus === 'connected' && 'Connected'}
              {connectionStatus === 'error' && 'Error'}
            </Badge>
          </div>
          
          {connectionStatus === 'error' && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Could not connect to database. Please check your Supabase configuration.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Quick Fix Button */}
      {connectionStatus === 'connected' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              Quick System Fix
            </CardTitle>
            <CardDescription>
              Execute the system audit and fixes automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={executeQuickFix}
              disabled={hasExecuted}
              size="lg"
              className="w-full"
            >
              {hasExecuted ? '✅ Fixes Executed' : '🚀 Execute System Fixes Now'}
            </Button>
            
            {hasExecuted && (
              <Alert className="mt-4">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  System fixes have been executed. Check the console for detailed results.
                  If automatic execution failed, use the manual SQL script below.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual SQL Script Info */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Execution (Backup Method)</CardTitle>
          <CardDescription>
            If automatic execution fails, you can run the SQL script manually
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Manual SQL Script Location:</strong> <code>SYSTEM_FIX_SCRIPT.sql</code>
              <br />
              Copy the contents of this file and run it in your Supabase SQL Editor.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Interactive Audit & Fix Component */}
      <SystemAuditAndFix />
    </div>
  );
}
