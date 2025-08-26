import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PDFLineItemsDiagnosticProps {
  lineItems?: any[];
  onTest?: () => void;
}

export default function PDFLineItemsDiagnostic({ 
  lineItems = [], 
  onTest 
}: PDFLineItemsDiagnosticProps) {
  const hasValidItems = lineItems.length > 0;
  const hasEmptyItems = lineItems.some(item => !item.description || !item.quantity);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          PDF Line Items Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span>Total Items:</span>
              <Badge variant="outline">{lineItems.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span>Status:</span>
              <Badge variant={hasValidItems && !hasEmptyItems ? 'default' : 'destructive'}>
                {hasValidItems && !hasEmptyItems ? 'Valid' : 'Issues Found'}
              </Badge>
            </div>
          </div>
          
          {hasEmptyItems && (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Some line items have missing data</span>
            </div>
          )}
          
          {!hasValidItems && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>No line items found</span>
            </div>
          )}
          
          {hasValidItems && !hasEmptyItems && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>All line items are valid</span>
            </div>
          )}
          
          {onTest && (
            <Button onClick={onTest} variant="outline" size="sm">
              Test PDF Generation
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
