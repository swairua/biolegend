import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Wrench, 
  CheckCircle, 
  XCircle, 
  Copy,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { checkAndFixPaymentsTable, manualPaymentsTableFix } from '@/utils/fixPaymentsTable';
import { toast } from 'sonner';

export function EmergencyPaymentsFix() {
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<any>(null);
  const [showManualSQL, setShowManualSQL] = useState(false);

  const executeAutomaticFix = async () => {
    setIsFixing(true);
    setFixResult(null);
    
    try {
      console.log('🚨 Starting emergency payments table fix...');
      const result = await checkAndFixPaymentsTable();
      
      setFixResult(result);
      
      if (result.success) {
        toast.success('Payments table fixed successfully!');
      } else {
        toast.error('Automatic fix failed - manual SQL required');
        setShowManualSQL(true);
      }
    } catch (error) {
      console.error('Fix failed:', error);
      setFixResult({
        success: false,
        message: `Fix failed with exception: ${error}`,
        details: error
      });
      toast.error('Fix failed - try manual SQL');
      setShowManualSQL(true);
    } finally {
      setIsFixing(false);
    }
  };

  const copyManualSQL = async () => {
    const sql = await manualPaymentsTableFix();
    navigator.clipboard.writeText(sql);
    toast.success('Manual SQL copied to clipboard!');
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard', '_blank');
    toast.info('Opening Supabase dashboard - go to SQL Editor');
  };

  return (
    <Card className="w-full max-w-4xl mx-auto border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800">
          <Database className="h-5 w-5" />
          Emergency Payments Table Fix
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <strong>Critical Issue:</strong> The payments table is missing from your database. 
            This prevents the payments functionality from working. We can fix this automatically or provide manual SQL.
          </AlertDescription>
        </Alert>

        {/* Automatic Fix Section */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Automatic Fix
          </h4>
          <p className="text-sm text-muted-foreground">
            This will automatically create the payments table, payment_allocations table, enum types, triggers, and RLS policies.
          </p>
          <Button 
            onClick={executeAutomaticFix}
            disabled={isFixing}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isFixing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fixing Database...
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4 mr-2" />
                Run Automatic Fix
              </>
            )}
          </Button>
        </div>

        {/* Fix Results */}
        {fixResult && (
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {fixResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">
                {fixResult.success ? 'Fix Successful!' : 'Fix Failed'}
              </span>
              <Badge variant={fixResult.success ? 'default' : 'destructive'}>
                {fixResult.success ? 'SUCCESS' : 'FAILED'}
              </Badge>
            </div>
            <p className="text-sm mb-2">{fixResult.message}</p>
            
            {fixResult.details && (
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-600">Show Details</summary>
                <pre className="bg-gray-50 p-2 rounded mt-1 overflow-auto">
                  {JSON.stringify(fixResult.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Manual SQL Section */}
        {(showManualSQL || (fixResult && !fixResult.success)) && (
          <div className="space-y-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium flex items-center gap-2 text-yellow-800">
              <Copy className="h-4 w-4" />
              Manual SQL Fix Required
            </h4>
            <p className="text-sm text-yellow-700">
              The automatic fix failed. You need to manually execute SQL in the Supabase SQL Editor.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={copyManualSQL}
                variant="outline"
                size="sm"
                className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy SQL to Clipboard
              </Button>
              <Button
                onClick={openSupabase}
                variant="outline"
                size="sm"
                className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Supabase Dashboard
              </Button>
            </div>
            <div className="text-xs text-yellow-600 mt-2">
              <strong>Instructions:</strong>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Click "Copy SQL to Clipboard"</li>
                <li>Click "Open Supabase Dashboard"</li>
                <li>Navigate to SQL Editor in Supabase</li>
                <li>Paste and execute the SQL</li>
                <li>Refresh this page to verify the fix</li>
              </ol>
            </div>
          </div>
        )}

        {/* Success Actions */}
        {fixResult && fixResult.success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Payments table is now ready!</span>
            </div>
            <p className="text-sm text-green-700 mb-3">
              The payments functionality should now work correctly. You can:
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => window.location.href = '/payments'}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Go to Payments Page
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="border-green-300 text-green-800 hover:bg-green-100"
              >
                Refresh Page
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
