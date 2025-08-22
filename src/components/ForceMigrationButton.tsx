import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Play, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { forceTaxColumnsMigration, executeRawMigrationSQL, checkTaxColumnsExist } from '@/utils/forceMigration';

export const ForceMigrationButton = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string>('');
  const [columnsExist, setColumnsExist] = useState<any>(null);

  // Auto-check columns on mount
  useEffect(() => {
    checkColumns();
  }, []);

  const checkColumns = async () => {
    setIsRunning(true);
    try {
      const result = await checkTaxColumnsExist();
      setColumnsExist(result);
      
      if (result.quotation_items_has_tax_columns && result.invoice_items_has_tax_columns) {
        setMigrationStatus('✅ Tax columns already exist in both tables');
        toast.success('Tax columns already exist in the database');
      } else {
        setMigrationStatus('❌ Tax columns are missing');
        toast.warning('Tax columns are missing and need to be added');
      }
    } catch (error) {
      console.error('Check failed:', error);
      setMigrationStatus('❌ Failed to check column status');
      toast.error('Failed to check column status');
    } finally {
      setIsRunning(false);
    }
  };

  const runMigration = async () => {
    setIsRunning(true);
    setMigrationStatus('🔄 Running migration...');
    
    try {
      // Try the first approach
      let result = await forceTaxColumnsMigration();
      
      if (!result.success) {
        // Try the raw SQL approach
        console.log('First approach failed, trying raw SQL...');
        setMigrationStatus('🔄 Trying alternative migration method...');
        result = await executeRawMigrationSQL();
      }
      
      if (result.success) {
        setMigrationStatus('✅ Migration completed successfully!');
        toast.success('Tax columns migration completed successfully!');
        
        // Verify the migration worked
        setTimeout(() => {
          checkColumns();
        }, 1000);
      } else {
        setMigrationStatus(`❌ Migration failed: ${JSON.stringify(result.error)}`);
        toast.error('Migration failed. Please try manual SQL execution.');
      }
    } catch (error) {
      console.error('Migration error:', error);
      setMigrationStatus(`❌ Migration failed: ${error}`);
      toast.error('Migration failed with an unexpected error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Migration - Tax Columns
        </CardTitle>
        <CardDescription>
          Force apply the migration to add missing tax_amount, tax_percentage, and tax_inclusive columns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Status Display */}
        {migrationStatus && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-mono">{migrationStatus}</p>
          </div>
        )}
        
        {/* Column Status */}
        {columnsExist && (
          <div className="space-y-2">
            <h4 className="font-medium">Column Status:</h4>
            <div className="flex gap-2">
              <Badge variant={columnsExist.quotation_items_has_tax_columns ? "default" : "destructive"}>
                {columnsExist.quotation_items_has_tax_columns ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <AlertCircle className="h-3 w-3 mr-1" />
                )}
                Quotation Items: {columnsExist.quotation_items_has_tax_columns ? 'OK' : 'Missing'}
              </Badge>
              
              <Badge variant={columnsExist.invoice_items_has_tax_columns ? "default" : "destructive"}>
                {columnsExist.invoice_items_has_tax_columns ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <AlertCircle className="h-3 w-3 mr-1" />
                )}
                Invoice Items: {columnsExist.invoice_items_has_tax_columns ? 'OK' : 'Missing'}
              </Badge>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={checkColumns} 
            disabled={isRunning}
            variant="outline"
          >
            {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
            Check Columns
          </Button>
          
          <Button 
            onClick={runMigration} 
            disabled={isRunning}
            className="bg-red-600 hover:bg-red-700"
          >
            {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Force Run Migration
          </Button>
        </div>
        
        {/* Manual Instructions */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">Manual Migration (if button fails):</h4>
          <p className="text-sm text-yellow-700 mb-2">
            Go to your Supabase Dashboard → SQL Editor and run:
          </p>
          <code className="text-xs bg-yellow-100 p-2 rounded block text-yellow-800">
            {`ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0;`}
          </code>
        </div>
      </CardContent>
    </Card>
  );
};
