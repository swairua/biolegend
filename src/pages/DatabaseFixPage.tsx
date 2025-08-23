import { DatabaseFixRunner } from '@/components/DatabaseFixRunner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  Settings
} from 'lucide-react';

export default function DatabaseFixPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Structure Fixes</h1>
          <p className="text-muted-foreground">
            Fix missing tables and columns identified during the forms audit
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Database className="h-3 w-3" />
          Structure Audit
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DatabaseFixRunner />
        </div>
        
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Critical Issues Found
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium">Missing Columns</div>
                    <div className="text-muted-foreground text-xs">
                      unit_of_measure, lpo_number, delivery tracking fields
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium">Tax Structure</div>
                    <div className="text-muted-foreground text-xs">
                      Missing tax columns on item tables
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium">Field Mapping</div>
                    <div className="text-muted-foreground text-xs">
                      Form fields don't match database columns
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                What Will Be Fixed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Add missing unit_of_measure columns</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Add delivery tracking fields</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Add LPO number to invoices</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Fix tax column structure</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Add discount handling columns</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Fix stock level naming</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Reference Files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-1">
                <div className="font-medium">Generated Files:</div>
                <div className="text-muted-foreground text-xs space-y-1">
                  <div>• DATABASE_FIXES_MIGRATION.sql</div>
                  <div>• FORM_TO_DATABASE_MAPPING.md</div>
                  <div>• src/utils/runDatabaseFixes.ts</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription className="text-xs">
              This operation is safe and uses "IF NOT EXISTS" checks to prevent duplicate columns.
              Existing data will not be lost.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
