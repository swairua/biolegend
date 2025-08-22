import React from 'react';
import { EmergencyDatabaseFix } from '@/components/EmergencyDatabaseFix';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Zap } from 'lucide-react';

export default function EmergencyFix() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Emergency Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="bg-red-100 p-3 rounded-full">
            <Zap className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-red-700">🚨 Emergency Database Fix</h1>
            <p className="text-lg text-red-600">Critical database issues preventing normal operation</p>
          </div>
        </div>
      </div>

      {/* Critical Issues Alert */}
      <Alert variant="destructive" className="border-2 border-red-500">
        <AlertTriangle className="h-5 w-5" />
        <AlertDescription className="text-lg">
          <div className="space-y-2">
            <div className="font-bold">IMMEDIATE ACTION REQUIRED</div>
            <div>The application has critical database schema issues that prevent:</div>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Creating quotations (missing tax_amount columns)</li>
              <li>Creating invoices (missing tax_amount columns)</li>
              <li>Using the LPO system (missing tables)</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Quick Status */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <Badge variant="destructive" className="text-lg px-3 py-1">CRITICAL</Badge>
            <div className="mt-2 font-semibold">Tax Columns</div>
            <div className="text-sm text-gray-600">Missing in quotation_items</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 text-center">
            <Badge variant="secondary" className="text-lg px-3 py-1">HIGH</Badge>
            <div className="mt-2 font-semibold">LPO Tables</div>
            <div className="text-sm text-gray-600">Not created yet</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <Badge variant="outline" className="text-lg px-3 py-1">INFO</Badge>
            <div className="mt-2 font-semibold">Fix Available</div>
            <div className="text-sm text-gray-600">SQL script ready</div>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Fix Interface */}
      <EmergencyDatabaseFix />

      {/* Developer Information */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-700">🔧 Technical Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <div><strong>Error:</strong> "could not find the tax_amount column of quotation_items in the schema cache"</div>
          <div><strong>Cause:</strong> Database schema is missing required tax calculation columns</div>
          <div><strong>Solution:</strong> Execute the provided SQL to add missing columns with proper defaults</div>
          <div><strong>Impact:</strong> After fix, quotation and invoice creation will work normally</div>
          <div><strong>Files Affected:</strong> quotation_items, invoice_items tables</div>
        </CardContent>
      </Card>
    </div>
  );
}
