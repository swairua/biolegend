import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Database, 
  Play, 
  Copy, 
  Package,
  Wrench
} from 'lucide-react';
import { 
  auditProductTable, 
  autoFixProductTable, 
  getProductTableStatus 
} from '@/utils/autoFixProductTable';
import { toast } from 'sonner';

interface FixResult {
  success: boolean;
  message: string;
  details: string[];
  sqlScript?: string;
}

export function ProductTableFix() {
  const [isAuditing, setIsAuditing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [auditResult, setAuditResult] = useState<FixResult | null>(null);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [tableStatus, setTableStatus] = useState<{
    tableExists: boolean;
    missingColumns: string[];
    stockMovementsExists: boolean;
  } | null>(null);

  useEffect(() => {
    // Check table status on load
    checkTableStatus();
  }, []);

  const checkTableStatus = async () => {
    try {
      const status = await getProductTableStatus();
      setTableStatus(status);
    } catch (error) {
      console.error('Error checking table status:', error);
    }
  };

  const handleAudit = async () => {
    setIsAuditing(true);
    setAuditResult(null);
    setFixResult(null);
    
    try {
      const result = await auditProductTable();
      setAuditResult(result);
      await checkTableStatus();
      
      if (result.success) {
        toast.success('Product table audit completed - no issues found');
      } else {
        toast.warning('Product table audit found issues');
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

  const handleAutoFix = async () => {
    setIsFixing(true);
    setFixResult(null);
    
    try {
      const result = await autoFixProductTable();
      setFixResult(result);
      await checkTableStatus();
      
      if (result.success) {
        toast.success('Product table fixed successfully!');
        // Re-audit to verify fix
        setTimeout(() => {
          handleAudit();
        }, 1000);
      } else {
        toast.warning('Manual fix required - see SQL script below');
      }
    } catch (error: any) {
      toast.error('Auto-fix failed', { description: error.message });
      setFixResult({
        success: false,
        message: 'Auto-fix failed',
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
        ✅ OK
      </Badge>
    ) : (
      <Badge variant="outline" className="text-red-700 border-red-300">
        ❌ Issues
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Package className="h-6 w-6" />
          Product Table Audit & Fix
        </h2>
        <p className="text-muted-foreground">
          Diagnose and fix missing columns in the products table
        </p>
      </div>

      {/* Current Status */}
      {tableStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Products Table:</span>
              {getStatusBadge(tableStatus.tableExists)}
            </div>
            <div className="flex items-center justify-between">
              <span>Stock Movements Table:</span>
              {getStatusBadge(tableStatus.stockMovementsExists)}
            </div>
            <div className="flex items-center justify-between">
              <span>Missing Columns:</span>
              <Badge variant="outline" className={tableStatus.missingColumns.length === 0 ? "text-green-700 border-green-300" : "text-orange-700 border-orange-300"}>
                {tableStatus.missingColumns.length === 0 ? 'None' : `${tableStatus.missingColumns.length} missing`}
              </Badge>
            </div>
            {tableStatus.missingColumns.length > 0 && (
              <div className="mt-2 p-2 bg-orange-50 rounded text-sm">
                <strong>Missing:</strong> {tableStatus.missingColumns.join(', ')}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button
          onClick={handleAudit}
          disabled={isAuditing || isFixing}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Database className="h-4 w-4" />
          {isAuditing ? 'Auditing...' : 'Run Audit'}
        </Button>
        
        <Button
          onClick={handleAutoFix}
          disabled={isFixing || isAuditing}
          className="flex items-center gap-2"
        >
          <Wrench className="h-4 w-4" />
          {isFixing ? 'Fixing...' : 'Auto-Fix Table'}
        </Button>
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
            <div className="space-y-2">
              {auditResult.details.map((detail, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 p-2 rounded text-sm ${
                    detail.startsWith('✅') 
                      ? 'bg-green-50 text-green-800' 
                      : detail.startsWith('❌')
                      ? 'bg-red-50 text-red-800'
                      : detail.startsWith('🔧')
                      ? 'bg-blue-50 text-blue-800'
                      : 'bg-gray-50 text-gray-800'
                  }`}
                >
                  <span className="font-mono">{detail}</span>
                </div>
              ))}
            </div>
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
            <div className="space-y-2">
              {fixResult.details.map((detail, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 p-2 rounded text-sm ${
                    detail.startsWith('✅') 
                      ? 'bg-green-50 text-green-800' 
                      : detail.startsWith('❌')
                      ? 'bg-red-50 text-red-800'
                      : detail.startsWith('📋')
                      ? 'bg-yellow-50 text-yellow-800'
                      : 'bg-blue-50 text-blue-800'
                  }`}
                >
                  <span className="font-mono">{detail}</span>
                </div>
              ))}
            </div>
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
              If auto-fix failed, copy this SQL and run it in Supabase SQL Editor
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Instructions:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
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
                className="font-mono text-xs min-h-[200px]"
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

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>After Fixing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Once the product table is fixed, you should be able to:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-700">✅ Working Features:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Add new products without database errors</li>
                <li>• Edit existing products and save all fields</li>
                <li>• Track inventory levels (min/max stock)</li>
                <li>• Set cost and selling prices</li>
                <li>• Use stock adjustments and restocking</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-700">🧪 Test These:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Go to Inventory → Add Item</li>
                <li>• Fill out all form fields</li>
                <li>• Save and verify no errors</li>
                <li>• Edit an existing product</li>
                <li>• Try stock adjustment features</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
