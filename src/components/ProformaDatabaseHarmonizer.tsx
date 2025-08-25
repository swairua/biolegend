import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  Wrench, 
  RefreshCw,
  Copy,
  ExternalLink
} from 'lucide-react';
import { harmonizeProformaDatabase, auditProformaDatabase, getProformaHarmonizationSQL } from '@/utils/harmonizeProformaDatabase';
import { toast } from 'sonner';

interface ProformaDatabaseHarmonizerProps {
  companyId?: string;
  onHarmonizationComplete?: () => void;
}

export const ProformaDatabaseHarmonizer = ({ 
  companyId,
  onHarmonizationComplete 
}: ProformaDatabaseHarmonizerProps) => {
  const [audit, setAudit] = useState<{
    proformaColumns: string[];
    proformaItemsColumns: string[];
    missingProformaColumns: string[];
    missingItemsColumns: string[];
  } | null>(null);
  
  const [isAuditing, setIsAuditing] = useState(false);
  const [isHarmonizing, setIsHarmonizing] = useState(false);
  const [harmonizationResult, setHarmonizationResult] = useState<any>(null);

  const runAudit = async () => {
    setIsAuditing(true);
    try {
      const result = await auditProformaDatabase();
      setAudit(result);
      
      const totalMissing = result.missingProformaColumns.length + result.missingItemsColumns.length;
      if (totalMissing === 0) {
        toast.success('Database schema is up to date!');
      } else {
        toast.warning(`Found ${totalMissing} missing columns that need to be added`);
      }
    } catch (error) {
      console.error('Audit failed:', error);
      toast.error('Failed to audit database schema');
    } finally {
      setIsAuditing(false);
    }
  };

  const runHarmonization = async () => {
    setIsHarmonizing(true);
    try {
      const result = await harmonizeProformaDatabase();
      setHarmonizationResult(result);
      
      if (result.success) {
        // Re-run audit to show updated status
        await runAudit();
        onHarmonizationComplete?.();
      }
    } catch (error) {
      console.error('Harmonization failed:', error);
      toast.error('Failed to harmonize database schema');
    } finally {
      setIsHarmonizing(false);
    }
  };

  const copySQL = () => {
    navigator.clipboard.writeText(getProformaHarmonizationSQL());
    toast.success('SQL script copied to clipboard!');
  };

  const needsHarmonization = audit && (
    audit.missingProformaColumns.length > 0 || 
    audit.missingItemsColumns.length > 0
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Proforma Database Schema Harmonizer
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ensure your proforma database schema matches the code expectations
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Audit Button */}
        <div className="flex items-center gap-2">
          <Button 
            onClick={runAudit} 
            disabled={isAuditing}
            variant="outline"
          >
            {isAuditing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {isAuditing ? 'Auditing...' : 'Audit Schema'}
          </Button>
          
          {audit && (
            <Badge variant={needsHarmonization ? "destructive" : "success"}>
              {needsHarmonization ? 'Needs Fix' : 'Up to Date'}
            </Badge>
          )}
        </div>

        {/* Audit Results */}
        {audit && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Proforma Invoices Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Proforma Invoices Table</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Columns found:</span> {audit.proformaColumns.length}
                    </div>
                    {audit.missingProformaColumns.length > 0 ? (
                      <div>
                        <span className="text-sm font-medium text-destructive">Missing columns:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {audit.missingProformaColumns.map(col => (
                            <Badge key={col} variant="destructive" className="text-xs">
                              {col}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="success" className="text-xs">All columns present</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Proforma Items Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Proforma Items Table</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Columns found:</span> {audit.proformaItemsColumns.length}
                    </div>
                    {audit.missingItemsColumns.length > 0 ? (
                      <div>
                        <span className="text-sm font-medium text-destructive">Missing columns:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {audit.missingItemsColumns.map(col => (
                            <Badge key={col} variant="destructive" className="text-xs">
                              {col}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="success" className="text-xs">All columns present</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Harmonization Action */}
            {needsHarmonization && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Your proforma database schema needs to be updated to match the code expectations.
                  This will add missing columns like <code>valid_until</code> and tax-related fields.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Harmonization Actions */}
        {needsHarmonization && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              onClick={runHarmonization} 
              disabled={isHarmonizing}
              className="flex-1 min-w-40"
            >
              {isHarmonizing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wrench className="h-4 w-4 mr-2" />
              )}
              {isHarmonizing ? 'Harmonizing...' : 'Fix Database Schema'}
            </Button>
            
            <Button 
              onClick={copySQL} 
              variant="outline"
              size="sm"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy SQL
            </Button>
          </div>
        )}

        {/* Harmonization Results */}
        {harmonizationResult && (
          <Alert className={harmonizationResult.success ? "border-success bg-success-light" : "border-destructive bg-destructive-light"}>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">{harmonizationResult.message}</div>
                {harmonizationResult.details && (
                  <ul className="text-sm space-y-1">
                    {harmonizationResult.details.map((detail: string, index: number) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                )}
                {!harmonizationResult.success && (
                  <div className="mt-2">
                    <Button 
                      onClick={() => window.open('https://supabase.com', '_blank')} 
                      size="sm"
                      variant="outline"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Supabase Console
                    </Button>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground">
          💡 This tool ensures your proforma database tables have all the columns expected by the application code,
          including the <code>valid_until</code> field and tax calculation columns.
        </div>
      </CardContent>
    </Card>
  );
};
