import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Copy, CheckCircle, XCircle, AlertTriangle, Play, Search } from 'lucide-react';
import { auditAndFixSystem, executeSystemFixes } from '@/utils/systemAuditAndFix';
import { toast } from 'sonner';

interface AuditResult {
  success: boolean;
  message: string;
  details: string[];
  sqlScript?: string;
}

export function SystemAuditAndFix() {
  const [isAuditing, setIsAuditing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [fixResult, setFixResult] = useState<AuditResult | null>(null);

  const handleAudit = async () => {
    setIsAuditing(true);
    setAuditResult(null);
    setFixResult(null);
    
    try {
      const result = await auditAndFixSystem();
      setAuditResult(result);
      
      if (result.success) {
        toast.success('System audit completed');
      } else {
        toast.error('System audit failed');
      }
    } catch (error: any) {
      toast.error('Audit failed', { description: error.message });
      setAuditResult({
        success: false,
        message: 'Audit failed',
        details: [error.message]
      });
    } finally {
      setIsAuditing(false);
    }
  };

  const handleExecuteFixes = async () => {
    setIsFixing(true);
    setFixResult(null);
    
    try {
      const result = await executeSystemFixes();
      setFixResult(result);
      
      if (result.success) {
        toast.success('System fixes applied successfully!');
      } else {
        toast.warning('Manual fix required - see SQL script below');
      }
    } catch (error: any) {
      toast.error('Fix execution failed', { description: error.message });
      setFixResult({
        success: false,
        message: 'Fix execution failed',
        details: [error.message]
      });
    } finally {
      setIsFixing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('SQL script copied to clipboard!');
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getStatusBadge = (success: boolean) => {
    return success ? (
      <Badge variant="outline" className="text-green-700 border-green-300">
        Success
      </Badge>
    ) : (
      <Badge variant="outline" className="text-red-700 border-red-300">
        Failed
      </Badge>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">System Audit & Fix</h1>
        <p className="text-muted-foreground">
          Diagnose and fix database issues, RLS policies, and user relations
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button
          onClick={handleAudit}
          disabled={isAuditing || isFixing}
          className="flex items-center gap-2"
        >
          <Search className="h-4 w-4" />
          {isAuditing ? 'Auditing...' : 'Run System Audit'}
        </Button>
        
        {auditResult && (
          <Button
            onClick={handleExecuteFixes}
            disabled={isFixing || isAuditing}
            variant={auditResult.success ? 'default' : 'secondary'}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isFixing ? 'Applying Fixes...' : 'Execute Fixes'}
          </Button>
        )}
      </div>

      {/* Audit Results */}
      {auditResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(auditResult.success)}
                Audit Results
              </CardTitle>
              {getStatusBadge(auditResult.success)}
            </div>
            <CardDescription>{auditResult.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48 w-full">
              <div className="space-y-2">
                {auditResult.details.map((detail, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 p-2 rounded ${
                      detail.startsWith('✅') 
                        ? 'bg-green-50 text-green-800' 
                        : detail.startsWith('❌')
                        ? 'bg-red-50 text-red-800'
                        : 'bg-blue-50 text-blue-800'
                    }`}
                  >
                    <span className="font-mono text-sm">{detail}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Fix Results */}
      {fixResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(fixResult.success)}
                Fix Results
              </CardTitle>
              {getStatusBadge(fixResult.success)}
            </div>
            <CardDescription>{fixResult.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48 w-full">
              <div className="space-y-2">
                {fixResult.details.map((detail, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 p-2 rounded ${
                      detail.startsWith('✅') 
                        ? 'bg-green-50 text-green-800' 
                        : detail.startsWith('❌')
                        ? 'bg-red-50 text-red-800'
                        : detail.startsWith('📋')
                        ? 'bg-yellow-50 text-yellow-800'
                        : 'bg-blue-50 text-blue-800'
                    }`}
                  >
                    <span className="font-mono text-sm">{detail}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Manual SQL Script */}
      {(auditResult?.sqlScript || fixResult?.sqlScript) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Manual SQL Script
            </CardTitle>
            <CardDescription>
              Copy this SQL and run it in Supabase SQL Editor if automatic execution failed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Instructions:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Go to your Supabase Dashboard</li>
                  <li>Open the SQL Editor</li>
                  <li>Create a new query</li>
                  <li>Paste the SQL script below</li>
                  <li>Click "Run" to execute</li>
                </ol>
              </AlertDescription>
            </Alert>
            
            <div className="relative">
              <Textarea
                value={fixResult?.sqlScript || auditResult?.sqlScript || ''}
                readOnly
                className="font-mono text-sm min-h-[300px]"
                placeholder="SQL script will appear here..."
              />
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(fixResult?.sqlScript || auditResult?.sqlScript || '')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>What This Tool Does</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-700">✅ Removes RLS Policies</h4>
              <p className="text-sm text-muted-foreground">
                Disables Row Level Security on all tables to fix "violates low-level security policy" errors
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-700">🔗 Fixes User Relations</h4>
              <p className="text-sm text-muted-foreground">
                Creates/updates profiles table and user authentication relations
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-purple-700">📊 Adds Missing Columns</h4>
              <p className="text-sm text-muted-foreground">
                Adds missing database columns identified in the form field audit
              </p>
            </div>
          </div>
          
          <Separator />
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Note:</strong> This tool removes all RLS policies, which means all authenticated users 
              will have full access to all data. This is suitable for internal company systems where multi-tenant 
              isolation is not required.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
