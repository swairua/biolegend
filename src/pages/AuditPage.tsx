import { QuickAuditRunner } from '@/components/QuickAuditRunner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  FileText,
  CheckCircle
} from 'lucide-react';

export default function AuditPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database & Forms Audit</h1>
          <p className="text-muted-foreground">
            Verify database structure and form functionality after fixes
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Database className="h-3 w-3" />
          Verification
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <QuickAuditRunner />
        </div>
        
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                What We're Checking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="font-medium">Critical Columns:</div>
                <div className="text-muted-foreground text-xs space-y-1">
                  <div>• lpo_items.unit_of_measure</div>
                  <div>• delivery_note_items.unit_of_measure</div>
                  <div>• invoices.lpo_number</div>
                  <div>• delivery_notes tracking fields</div>
                  <div>• Tax columns on item tables</div>
                  <div>• Stock level naming fixes</div>
                  <div>• Customer address fields</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Form Functionality
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-1">
                <div className="font-medium">Testing Access To:</div>
                <div className="text-muted-foreground text-xs space-y-1">
                  <div>• Customers table</div>
                  <div>• Products table</div>
                  <div>• Invoices table</div>
                  <div>• Quotations table</div>
                  <div>• RLS policy status</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-1">
                <div className="text-muted-foreground text-xs">
                  If issues are found:
                </div>
                <div className="text-muted-foreground text-xs space-y-1">
                  <div>• Visit /auto-fix to run fixes</div>
                  <div>• Check /database-fix-page</div>
                  <div>• Review migration scripts</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
