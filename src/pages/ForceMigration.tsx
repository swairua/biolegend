import { ForceMigrationInterface } from '@/components/ForceMigrationInterface';
import { Layout } from '@/components/layout/Layout';
import { BiolegendLogo } from '@/components/ui/biolegend-logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Database, ArrowLeft, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ForceMigration() {
  const navigate = useNavigate();

  const openSupabaseDashboard = () => {
    window.open('https://supabase.com/dashboard', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <BiolegendLogo size="lg" showText={false} />
          <h1 className="text-3xl font-bold mt-4 biolegend-brand">Biolegend Scientific Ltd</h1>
          <p className="text-muted-foreground mt-2">Complete Database Migration</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Go Back</h3>
                  <p className="text-sm text-muted-foreground">Return to application</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Supabase Dashboard</h3>
                  <p className="text-sm text-muted-foreground">Open SQL Editor</p>
                </div>
                <Button onClick={openSupabaseDashboard}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Test Login</h3>
                  <p className="text-sm text-muted-foreground">After migration</p>
                </div>
                <Button variant="secondary" onClick={() => navigate('/test-login')}>
                  <Database className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Problem Summary */}
        <Alert className="mb-8">
          <Database className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>🚨 Database Issue: No tables found</strong></p>
              <p>The database appears to be empty or missing critical tables required for the application to function.</p>
              <p><strong>Solution:</strong> Execute the complete migration below to create all necessary tables</p>
              <p><strong>Tables to create:</strong> Companies, Profiles, Customers, Products, Quotations, Invoices, LPOs, Credit Notes, Stock Movements, Tax Settings, and more</p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Force Migration Interface */}
        <ForceMigrationInterface />

        {/* Information Section */}
        <div className="mt-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                What This Migration Does
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Core Business Tables:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Companies - Multi-company support</li>
                    <li>• Profiles - User management</li>
                    <li>• Customers - Client database</li>
                    <li>• Products - Inventory management</li>
                    <li>• Product Categories - Product organization</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Financial & Operations:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Quotations - Sales quotes</li>
                    <li>• Invoices - Billing system</li>
                    <li>• LPOs - Purchase orders</li>
                    <li>• Credit Notes - Returns/adjustments</li>
                    <li>• Proforma Invoices - Pro forma billing</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Advanced Features:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Stock Movements - Inventory tracking</li>
                    <li>• Tax Settings - Tax management</li>
                    <li>• User Permissions - Role-based access</li>
                    <li>• User Invitations - Team management</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">System Features:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Automated number generation</li>
                    <li>• Update triggers</li>
                    <li>• Performance indexes</li>
                    <li>• Row Level Security (RLS)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Application
            </Button>
            <Button onClick={openSupabaseDashboard}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Supabase Dashboard
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            After completing the migration, return to the application to verify everything is working.
          </p>
        </div>
      </div>
    </div>
  );
}
