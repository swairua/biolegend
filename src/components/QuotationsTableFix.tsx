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
  FileText, 
  Play, 
  Copy,
  Calendar,
  Calculator
} from 'lucide-react';
import { 
  fixQuotationsTableColumns,
  auditQuotationsTable,
  getQuotationsFixSQL
} from '@/utils/fixQuotationsTableColumns';
import { toast } from 'sonner';

interface QuotationFixResult {
  success: boolean;
  message: string;
  details: string[];
  verification?: any[];
}

export function QuotationsTableFix() {
  const [isAuditing, setIsAuditing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [auditResult, setAuditResult] = useState<{
    quotationsColumns: string[];
    quotationItemsColumns: string[];
    missingQuotationsColumns: string[];
    missingItemsColumns: string[];
  } | null>(null);
  const [fixResult, setFixResult] = useState<QuotationFixResult | null>(null);

  useEffect(() => {
    // Run initial audit on load
    handleAudit();
  }, []);

  const handleAudit = async () => {
    setIsAuditing(true);
    setFixResult(null);
    
    try {
      const result = await auditQuotationsTable();
      setAuditResult(result);
      
      const totalMissing = result.missingQuotationsColumns.length + result.missingItemsColumns.length;
      if (totalMissing === 0) {
        toast.success('Quotations table audit completed - no issues found');
      } else {
        toast.warning(`Quotations table audit found ${totalMissing} missing columns`);
      }
    } catch (error: any) {
      toast.error('Audit failed', { description: error.message });
      setAuditResult(null);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleFix = async () => {
    setIsFixing(true);
    setFixResult(null);
    
    try {
      const result = await fixQuotationsTableColumns();
      setFixResult(result);
      
      if (result.success) {
        toast.success('Quotations table fixed successfully!');
        // Re-audit to verify fix
        setTimeout(() => {
          handleAudit();
        }, 1000);
      } else {
        toast.warning('Manual fix required - see SQL script below');
      }
    } catch (error: any) {
      toast.error('Fix failed', { description: error.message });
      setFixResult({
        success: false,
        message: 'Fix failed',
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

  const getStatusBadge = (isOk: boolean, label: string) => {
    return isOk ? (
      <Badge variant="outline" className="text-green-700 border-green-300">
        ✅ {label}
      </Badge>
    ) : (
      <Badge variant="outline" className="text-red-700 border-red-300">
        ❌ {label}
      </Badge>
    );
  };

  const totalMissing = auditResult ? 
    auditResult.missingQuotationsColumns.length + auditResult.missingItemsColumns.length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <FileText className="h-6 w-6" />
          Quotations Table Fix
        </h2>
        <p className="text-muted-foreground">
          Diagnose and fix missing columns in quotations and quotation_items tables
        </p>
      </div>

      {/* Problem Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            The Problem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <h4 className="font-semibold text-red-900 mb-2">Error: "column valid_until does not exist"</h4>
            <p className="text-sm text-red-800 mb-3">
              The quotations table is missing the <code className="bg-red-200 px-1 rounded">valid_until</code> column 
              and possibly other critical columns needed for quotation creation and management.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-red-800 mb-1">Missing Quotations Columns:</h5>
                <ul className="text-sm text-red-700 space-y-0.5">
                  <li>• valid_until (DATE) - quotation expiry date</li>
                  <li>• tax_percentage, tax_amount - for tax calculations</li>
                  <li>• subtotal, total_amount - for financial totals</li>
                  <li>• created_by - audit trail</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-red-800 mb-1">Missing Item Columns:</h5>
                <ul className="text-sm text-red-700 space-y-0.5">
                  <li>• tax_percentage, tax_amount, tax_inclusive</li>
                  <li>• discount_percentage, discount_before_vat</li>
                  <li>• product_name, sort_order</li>
                  <li>• line_total - for line calculations</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Status */}
      {auditResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Current Table Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quotations Table Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Quotations Table:</span>
                  {getStatusBadge(auditResult.missingQuotationsColumns.length === 0, 'Complete')}
                </div>
                <div className="text-sm text-muted-foreground">
                  Found {auditResult.quotationsColumns.length} columns
                </div>
                {auditResult.missingQuotationsColumns.length > 0 && (
                  <div className="p-3 bg-orange-50 rounded text-sm">
                    <strong className="text-orange-800">Missing {auditResult.missingQuotationsColumns.length} columns:</strong>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {auditResult.missingQuotationsColumns.map((col, i) => (
                        <code key={i} className="bg-orange-200 text-orange-800 px-1 rounded text-xs">
                          {col}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quotation Items Table Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Quotation Items Table:</span>
                  {getStatusBadge(auditResult.missingItemsColumns.length === 0, 'Complete')}
                </div>
                <div className="text-sm text-muted-foreground">
                  Found {auditResult.quotationItemsColumns.length} columns
                </div>
                {auditResult.missingItemsColumns.length > 0 && (
                  <div className="p-3 bg-orange-50 rounded text-sm">
                    <strong className="text-orange-800">Missing {auditResult.missingItemsColumns.length} columns:</strong>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {auditResult.missingItemsColumns.map((col, i) => (
                        <code key={i} className="bg-orange-200 text-orange-800 px-1 rounded text-xs">
                          {col}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {totalMissing > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Total: {totalMissing} missing columns found.</strong> Quotation creation will fail until these columns are added.
                </AlertDescription>
              </Alert>
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
          onClick={handleFix}
          disabled={isFixing || isAuditing || totalMissing === 0}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600"
        >
          <Play className="h-4 w-4" />
          {isFixing ? 'Fixing...' : 'Fix All Missing Columns'}
        </Button>
      </div>

      {/* Fix Results */}
      {fixResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(fixResult.success)}
                Fix Results
              </CardTitle>
              {getStatusBadge(fixResult.success, fixResult.success ? 'Fixed' : 'Failed')}
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
                      : detail.startsWith('🎯')
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

      {/* Manual SQL Script */}
      {fixResult && !fixResult.success && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Manual Fix Required
            </CardTitle>
            <CardDescription>
              Copy this SQL and run it in Supabase SQL Editor to add missing columns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                <strong>Instructions:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>Go to your Supabase Dashboard → SQL Editor</li>
                  <li>Create a new query</li>
                  <li>Paste the SQL script below</li>
                  <li>Click "Run" to execute</li>
                  <li>Wait for completion (may take 1-2 minutes)</li>
                  <li>Come back and click "Run Audit" to verify</li>
                </ol>
              </AlertDescription>
            </Alert>
            
            <div className="relative">
              <Textarea
                value={getQuotationsFixSQL()}
                readOnly
                className="font-mono text-xs min-h-[400px]"
                placeholder="SQL script will appear here..."
              />
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(getQuotationsFixSQL())}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* What This Fixes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            What This Fix Provides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-green-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Quotation Features:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• ✅ Quotation expiry dates (valid_until)</li>
                <li>• ✅ Tax calculations and percentages</li>
                <li>• ✅ Subtotal and total amount fields</li>
                <li>• ✅ Audit trail with created_by</li>
                <li>• ✅ Notes and terms & conditions</li>
                <li>• ✅ Performance indexes for fast queries</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-blue-700 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Line Item Features:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• ✅ Tax calculations per line item</li>
                <li>• ✅ Discount support (percentage & amount)</li>
                <li>• ✅ Product name tracking</li>
                <li>• ✅ Line totals and sorting</li>
                <li>• ✅ Tax-inclusive/exclusive handling</li>
                <li>• ✅ Row-level security policies</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Success State */}
      {totalMissing === 0 && auditResult && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold text-green-900">
                Quotations Table is Complete!
              </h3>
              <p className="text-green-700">
                All required columns are present. You can now create and manage quotations without errors.
              </p>
              <div className="flex justify-center gap-4 mt-4">
                <Badge variant="outline" className="text-green-700 border-green-300">
                  {auditResult.quotationsColumns.length} quotations columns
                </Badge>
                <Badge variant="outline" className="text-green-700 border-green-300">
                  {auditResult.quotationItemsColumns.length} quotation_items columns
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
