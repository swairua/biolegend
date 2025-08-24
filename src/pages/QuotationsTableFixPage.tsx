import React from 'react';
import { QuotationsTableFix } from '@/components/QuotationsTableFix';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function QuotationsTableFixPage() {
  return (
    <div className="container max-w-6xl mx-auto p-6">
      <Card className="mb-6">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-3xl">
            <FileText className="h-8 w-8" />
            Quotations Database Fix
          </CardTitle>
          <CardDescription className="text-lg">
            Fix missing columns in quotations and quotation_items tables to resolve database errors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-2">Database Error Detected</h3>
                <p className="text-amber-800 mb-3">
                  The quotations functionality is failing because critical database columns are missing, 
                  particularly the <code className="bg-amber-200 px-1 rounded">valid_until</code> column and various tax-related columns.
                </p>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-amber-700">
                  <div>
                    <h4 className="font-medium mb-1">Symptoms you might see:</h4>
                    <ul className="space-y-0.5">
                      <li>• "column valid_until does not exist" errors</li>
                      <li>• "column tax_amount does not exist" errors</li>
                      <li>• Quotation creation fails completely</li>
                      <li>• PDF generation fails</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">What this fix provides:</h4>
                    <ul className="space-y-0.5">
                      <li>• Adds all missing columns safely</li>
                      <li>• Updates existing data with default values</li>
                      <li>• Creates performance indexes</li>
                      <li>• Sets up proper security policies</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Link to="/quotations">
              <Button variant="outline" className="flex items-center gap-2">
                Test Quotations Page
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <QuotationsTableFix />
    </div>
  );
}
