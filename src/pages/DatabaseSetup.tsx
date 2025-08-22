import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, CheckCircle, AlertCircle, Shield, Info, Zap } from 'lucide-react';
import { DatabaseInitializer } from '@/components/DatabaseInitializer';
import { ManualCreditNoteMigration } from '@/components/ManualCreditNoteMigration';
import { SuperAdminSetup } from '@/components/setup/SuperAdminSetup';
import { DebugSuperAdminSetup } from '@/components/DebugSuperAdminSetup';
import { DatabaseAuditPanel } from '@/components/DatabaseAuditPanel';
import { SimpleMigrationGuide } from '@/components/SimpleMigrationGuide';
import { ManualSetupVerification } from '@/components/ManualSetupVerification';
import { useAuth } from '@/contexts/AuthContext';

export default function DatabaseSetup() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Database Setup</h1>
          <p className="text-muted-foreground">
            Set up and manage database migrations for new features
          </p>
        </div>
        <Badge variant="outline" className="bg-warning-light text-warning border-warning/20">
          Setup Required
        </Badge>
      </div>

      {/* Initial Setup Notice */}
      {!loading && !isAuthenticated && (
        <Alert className="border-info bg-info-light">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary">
            <strong>Welcome to MedPlus Africa Limited!</strong> This is the initial system setup page.
            Use the Database Initializer below to set up the database and create your admin account.
          </AlertDescription>
        </Alert>
      )}

      {/* Database Initializer - Main Setup Tool */}
      <DatabaseInitializer />

      {/* Manual Setup Verification */}
      <ManualSetupVerification />

      {/* Database Migration Setup */}
      <SimpleMigrationGuide />

      {/* Super Admin Setup - Debug Version */}
      <DebugSuperAdminSetup />

      {/* Advanced Migration Tools */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <span>Advanced Migration Tools</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Advanced Tools:</strong> Use these for detailed diagnostics,
              manual migrations, or if the automatic migration above fails.
            </AlertDescription>
          </Alert>
          <DatabaseAuditPanel />
        </CardContent>
      </Card>

      {/* Credit Notes Migration */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-primary" />
            <span>Credit Notes Setup</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ManualCreditNoteMigration />
        </CardContent>
      </Card>

      {/* Future Migrations */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <span>Other Features</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>Invoices System</span>
              </div>
              <Badge variant="outline" className="bg-success-light text-success border-success/20">
                Active
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>Quotations System</span>
              </div>
              <Badge variant="outline" className="bg-success-light text-success border-success/20">
                Active
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>Inventory Management</span>
              </div>
              <Badge variant="outline" className="bg-success-light text-success border-success/20">
                Active
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-success" />
                <span>Customer Management</span>
              </div>
              <Badge variant="outline" className="bg-success-light text-success border-success/20">
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
