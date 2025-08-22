import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { checkTaxSettingsTable, insertDefaultTaxSettings, type TableCheckResult } from '@/utils/createTaxSettingsTable';
import { Database, Play, Copy, ExternalLink } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const TAX_SETTINGS_SQL = `-- Create tax_settings table for managing company tax rates
CREATE TABLE tax_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    rate DECIMAL(6,3) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for tax_settings
ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;

-- Add trigger for updated_at
CREATE TRIGGER update_tax_settings_updated_at
    BEFORE UPDATE ON tax_settings
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_tax_settings_company_id ON tax_settings(company_id);
CREATE INDEX idx_tax_settings_active ON tax_settings(company_id, is_active);
CREATE INDEX idx_tax_settings_default ON tax_settings(company_id, is_default);

-- Ensure only one default tax per company
CREATE UNIQUE INDEX idx_tax_settings_unique_default
    ON tax_settings(company_id)
    WHERE is_default = TRUE;

-- Add tax_setting_id reference to item tables (optional foreign key)
ALTER TABLE quotation_items
ADD COLUMN tax_setting_id UUID REFERENCES tax_settings(id);

ALTER TABLE invoice_items
ADD COLUMN tax_setting_id UUID REFERENCES tax_settings(id);

ALTER TABLE proforma_items
ADD COLUMN tax_setting_id UUID REFERENCES tax_settings(id);`;

export function MigrationRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSQL, setShowSQL] = useState(false);
  const [tableStatus, setTableStatus] = useState<TableCheckResult | null>(null);

  const handleCheckTable = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const status = await checkTaxSettingsTable();
      setTableStatus(status);

      if (status.exists) {
        setResult({
          success: true,
          message: status.message
        });
        // Refresh page if table exists
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setResult({
          success: true,
          message: status.message
        });
        setShowSQL(true);
      }
    } catch (error) {
      console.error('Check table error:', error);
      setResult({
        success: false,
        message: `Error checking table: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleInsertDefaults = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      await insertDefaultTaxSettings();
      setResult({
        success: true,
        message: 'Default tax settings inserted successfully! The page will refresh shortly.'
      });

      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Insert defaults error:', error);
      setResult({
        success: false,
        message: `Failed to insert defaults: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsRunning(false);
    }
  };

  const copySQL = () => {
    navigator.clipboard.writeText(TAX_SETTINGS_SQL);
    setResult({
      success: true,
      message: 'SQL copied to clipboard!'
    });
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Migration Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The tax_settings table is missing from your database. Follow these steps to create it:
        </p>

        {tableStatus && !tableStatus.exists && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              📊 Found {tableStatus.companyCount} company(ies) that will get default tax settings (VAT 16%, Zero Rated 0%, Exempt 0%)
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={handleCheckTable}
              disabled={isRunning}
              variant="outline"
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              {isRunning ? 'Checking...' : '1. Check Database'}
            </Button>

            {showSQL && (
              <Button
                onClick={() => window.open('https://supabase.com/dashboard/project/klifzjcfnlaxminytmyh/sql', '_blank')}
                variant="outline"
                size="sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                2. Open Supabase SQL Editor
              </Button>
            )}
          </div>

          {showSQL && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">3. Copy and run this SQL:</span>
                <Button onClick={copySQL} variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy SQL
                </Button>
              </div>

              <Textarea
                value={TAX_SETTINGS_SQL}
                readOnly
                className="font-mono text-xs h-40"
              />

              <Button
                onClick={handleInsertDefaults}
                disabled={isRunning}
                className="w-full"
              >
                <Database className="h-4 w-4 mr-2" />
                {isRunning ? 'Inserting...' : '4. Insert Default Tax Settings'}
              </Button>
            </div>
          )}
        </div>

        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            <AlertDescription>
              {result.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
