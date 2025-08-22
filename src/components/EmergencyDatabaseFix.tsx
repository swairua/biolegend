import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { runImmediateDatabaseFix, generateFixSQL } from '@/utils/runImmediateFix';

export function EmergencyDatabaseFix() {
  const [fixResults, setFixResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [autoRun, setAutoRun] = useState(false);

  const executeFix = async () => {
    setIsRunning(true);
    try {
      console.log('🚨 RUNNING EMERGENCY DATABASE DIAGNOSTICS...');
      const results = await runImmediateDatabaseFix();
      setFixResults(results);
      
      const criticalErrors = results.errors.filter((e: any) => e.severity === 'CRITICAL').length;
      
      if (criticalErrors === 0) {
        toast.success('Database is operational! No critical issues found.');
      } else {
        toast.error(`${criticalErrors} critical database issues found. Manual SQL execution required.`);
      }
    } catch (error) {
      console.error('Emergency fix failed:', error);
      toast.error('Emergency diagnostics failed');
    } finally {
      setIsRunning(false);
    }
  };

  const copyFixSQL = () => {
    const sql = generateFixSQL();
    navigator.clipboard.writeText(sql);
    toast.success('Emergency fix SQL copied to clipboard!');
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard', '_blank');
  };

  // Auto-run on mount if specified
  useEffect(() => {
    if (autoRun || !fixResults) {
      executeFix();
    }
  }, [autoRun]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      case 'WARNING': return 'outline';
      case 'INFO': return 'default';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Zap className="h-5 w-5" />
            🚨 Emergency Database Fix
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Critical Issue Detected:</strong> The application has database schema issues that prevent normal operation.
              This tool will diagnose and provide immediate fixes.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button 
              onClick={executeFix} 
              disabled={isRunning}
              variant="destructive"
            >
              {isRunning ? 'Diagnosing...' : '🔍 Run Emergency Diagnostics'}
            </Button>
            
            {fixResults && fixResults.errors.length > 0 && (
              <>
                <Button onClick={copyFixSQL} variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Fix SQL
                </Button>
                <Button onClick={openSupabase} className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open Supabase
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {fixResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {fixResults.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              Diagnostic Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {fixResults.errors.filter((e: any) => e.severity === 'CRITICAL').length}
                </div>
                <div className="text-sm text-gray-600">Critical Issues</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {fixResults.errors.length}
                </div>
                <div className="text-sm text-gray-600">Total Issues</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {fixResults.fixes.length}
                </div>
                <div className="text-sm text-gray-600">Working Systems</div>
              </div>
            </div>

            {/* Issues Found */}
            {fixResults.errors.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-red-700">🚨 Issues Found:</h4>
                {fixResults.errors.map((error: any, index: number) => (
                  <Alert key={index} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getSeverityColor(error.severity)}>
                              {error.severity}
                            </Badge>
                            <span className="font-medium">{error.table}</span>
                          </div>
                          <div className="text-sm">{error.issue}</div>
                          {error.solution && (
                            <div className="text-xs mt-1 text-gray-600">
                              <strong>Solution:</strong> {error.solution}
                            </div>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Working Systems */}
            {fixResults.fixes.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-green-700">✅ Working Systems:</h4>
                {fixResults.fixes.map((fix: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{fix.table}</span>
                    <span className="text-sm text-gray-600">- {fix.status}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Immediate Action Required */}
            {fixResults.errors.filter((e: any) => e.severity === 'CRITICAL').length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-semibold">🚨 IMMEDIATE ACTION REQUIRED</div>
                    <div className="text-sm">
                      Critical database schema issues prevent the application from working.
                      Execute the SQL fix in your Supabase dashboard now:
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button onClick={copyFixSQL} size="sm" variant="outline">
                        <Copy className="h-3 w-3 mr-1" />
                        Copy SQL
                      </Button>
                      <Button onClick={openSupabase} size="sm">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open Supabase
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Quick Fix Instructions */}
            {fixResults.errors.length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-700 text-sm">⚡ Quick Fix Steps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                    <span>Click "Copy Fix SQL" button above</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                    <span>Click "Open Supabase" and go to SQL Editor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                    <span>Paste the SQL and click "Run"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">4</span>
                    <span>Return here and run diagnostics again</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* SQL Preview */}
      {fixResults && fixResults.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>🔧 Emergency Fix SQL</span>
              <Button onClick={copyFixSQL} size="sm" variant="outline">
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-4 rounded-lg overflow-x-auto border">
              {generateFixSQL()}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
