import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, ExternalLink, Wrench, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { fixDatabaseIssues, executeTaxColumnFix, getRequiredSQL, type FixResult } from '@/utils/automaticDatabaseFix';
import { verifyDatabaseComponents } from '@/utils/verifyDatabaseFix';

export function DatabaseFixInterface() {
  const [isFixing, setIsFixing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [fixResults, setFixResults] = useState<FixResult[]>([]);
  const [verificationResults, setVerificationResults] = useState<any>(null);

  const handleRunDiagnostics = async () => {
    setIsVerifying(true);
    try {
      const results = await verifyDatabaseComponents();
      setVerificationResults(results);
      toast.success('Database diagnostics completed');
    } catch (error) {
      console.error('Error running diagnostics:', error);
      toast.error('Failed to run diagnostics');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAutoFix = async () => {
    setIsFixing(true);
    try {
      const results = await fixDatabaseIssues();
      setFixResults(results);
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      if (successCount === totalCount) {
        toast.success('All database issues fixed automatically!');
      } else {
        toast.warning(`${successCount}/${totalCount} issues fixed. Some require manual action.`);
      }
    } catch (error) {
      console.error('Error fixing database:', error);
      toast.error('Failed to fix database issues');
    } finally {
      setIsFixing(false);
    }
  };

  const handleTaxColumnFix = async () => {
    setIsFixing(true);
    try {
      const results = await executeTaxColumnFix();
      setFixResults(results);
      
      const successCount = results.filter(r => r.success).length;
      if (successCount > 0) {
        toast.success('Tax column verification completed');
      } else {
        toast.warning('Tax columns need manual SQL execution');
      }
    } catch (error) {
      console.error('Error verifying tax columns:', error);
      toast.error('Failed to verify tax columns');
    } finally {
      setIsFixing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('SQL copied to clipboard');
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard', '_blank');
  };

  const sqlScripts = getRequiredSQL();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Database Fix & Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button 
              onClick={handleRunDiagnostics} 
              disabled={isVerifying}
              variant="outline"
            >
              {isVerifying ? 'Running...' : 'Run Diagnostics'}
            </Button>
            <Button 
              onClick={handleAutoFix} 
              disabled={isFixing}
            >
              {isFixing ? 'Fixing...' : 'Auto Fix Issues'}
            </Button>
            <Button 
              onClick={handleTaxColumnFix} 
              disabled={isFixing}
              variant="secondary"
            >
              {isFixing ? 'Checking...' : 'Check Tax Columns'}
            </Button>
          </div>

          {verificationResults && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Database Status: {verificationResults.readyCount}/{verificationResults.totalCount} components ready
                {verificationResults.isReady ? ' - All systems operational!' : ' - Manual fixes required'}
              </AlertDescription>
            </Alert>
          )}

          {fixResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Fix Results:</h4>
              {fixResults.map((result, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant={result.success ? 'default' : 'destructive'}>
                    {result.success ? '✅' : '❌'}
                  </Badge>
                  <span className="text-sm">{result.step}: {result.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="quick-fix" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quick-fix">Quick Fix</TabsTrigger>
          <TabsTrigger value="complete-fix">Complete Fix</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="quick-fix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🚨 Quick Fix: Missing Tax Columns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This fixes the "could not find the tax_amount column" error. Execute in Supabase SQL Editor.
                </AlertDescription>
              </Alert>
              
              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-sm">SQL Script - Tax Columns Fix</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyToClipboard(sqlScripts.taxColumnsSQL)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <pre className="text-xs overflow-x-auto bg-white p-2 rounded border">
                  {sqlScripts.taxColumnsSQL}
                </pre>
              </div>

              <div className="flex gap-2">
                <Button onClick={openSupabase} className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open Supabase Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="complete-fix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🔧 Complete Database Migration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This creates all missing tables, columns, and functions for the complete purchase order system.
                </AlertDescription>
              </Alert>
              
              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-sm">Complete Migration SQL</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyToClipboard(sqlScripts.completeSQL)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <pre className="text-xs overflow-x-auto bg-white p-2 rounded border max-h-96">
                  {sqlScripts.completeSQL}
                </pre>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Steps to execute:</h4>
                <ol className="list-decimal list-inside text-sm space-y-1 ml-4">
                  <li>Click "Open Supabase Dashboard" below</li>
                  <li>Navigate to SQL Editor in your Supabase project</li>
                  <li>Copy the SQL above and paste it into the editor</li>
                  <li>Click "Run" to execute the migration</li>
                  <li>Return here and click "Run Diagnostics" to verify</li>
                </ol>
              </div>

              <div className="flex gap-2">
                <Button onClick={openSupabase} className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open Supabase Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🔍 Database Diagnostics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {verificationResults ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={verificationResults.lpoTables ? 'default' : 'destructive'}>
                          {verificationResults.lpoTables ? '✅' : '❌'}
                        </Badge>
                        <span>LPO Tables</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={verificationResults.taxColumns ? 'default' : 'destructive'}>
                          {verificationResults.taxColumns ? '✅' : '❌'}
                        </Badge>
                        <span>Tax Columns</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={verificationResults.rpcFunction ? 'default' : 'destructive'}>
                          {verificationResults.rpcFunction ? '✅' : '❌'}
                        </Badge>
                        <span>RPC Functions</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <strong>Ready:</strong> {verificationResults.readyCount}/{verificationResults.totalCount}
                      </div>
                      <div className="text-sm">
                        <strong>Status:</strong> {verificationResults.isReady ? 'Operational' : 'Needs Setup'}
                      </div>
                    </div>
                  </div>

                  {verificationResults.errors && verificationResults.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Issues Found:</h4>
                      {verificationResults.errors.map((error: string, index: number) => (
                        <Alert key={index} variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Click "Run Diagnostics" to check your database status
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
