import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Copy,
  ExternalLink,
  X
} from 'lucide-react';
import { useComprehensiveMigration } from '@/hooks/useComprehensiveMigration';
import { getComprehensiveManualSQL } from '@/utils/comprehensiveMigration';
import { toast } from 'sonner';

export function ComprehensiveMigrationBanner() {
  const {
    isRunning,
    isComplete,
    hasError,
    result,
    criticalTablesExist,
    needsManualSQL,
    executeMigration
  } = useComprehensiveMigration();
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Don't show banner if migration is complete and working
  if (isComplete && criticalTablesExist && !needsManualSQL) {
    return null;
  }

  // Don't show if minimized
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          size="sm"
          variant="outline"
          className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
        >
          <Database className="h-4 w-4 mr-2" />
          Migration Status
        </Button>
      </div>
    );
  }

  const copySQL = () => {
    navigator.clipboard.writeText(getComprehensiveManualSQL());
    toast.success('Migration SQL copied to clipboard!');
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard', '_blank');
    toast.info('Opening Supabase dashboard. Navigate to SQL Editor.');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isRunning ? (
                <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
              ) : hasError ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : criticalTablesExist ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Database className="h-5 w-5 text-orange-600" />
              )}
              
              <div>
                <span className="font-medium text-sm">
                  {isRunning ? 'Database Migration in Progress...' :
                   hasError ? 'Migration Error' :
                   criticalTablesExist ? 'Migration Complete' :
                   'Database Migration Required'}
                </span>
                
                {isRunning && (
                  <div className="text-xs text-gray-500">
                    Setting up database tables and configurations
                  </div>
                )}
              </div>
            </div>

            {/* Status badges */}
            <div className="flex gap-2">
              {isRunning && (
                <Badge variant="secondary" className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Running
                </Badge>
              )}
              
              {isComplete && criticalTablesExist && (
                <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              )}
              
              {needsManualSQL && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Manual SQL Needed
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Action buttons */}
            {!isRunning && !criticalTablesExist && (
              <Button
                onClick={executeMigration}
                size="sm"
                className="text-xs"
              >
                <Zap className="h-3 w-3 mr-1" />
                Run Migration
              </Button>
            )}
            
            {needsManualSQL && (
              <>
                <Button
                  onClick={openSupabase}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Supabase
                </Button>
                <Button
                  onClick={copySQL}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy SQL
                </Button>
              </>
            )}
            
            <Button
              onClick={() => setShowDetails(!showDetails)}
              size="sm"
              variant="ghost"
              className="text-xs"
            >
              {showDetails ? 'Hide' : 'Details'}
            </Button>
            
            <Button
              onClick={() => setIsMinimized(true)}
              size="sm"
              variant="ghost"
              className="text-xs p-1"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Progress bar for running migration */}
        {isRunning && (
          <div className="mt-2">
            <Progress value={undefined} className="h-2" />
          </div>
        )}

        {/* Details section */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t">
            <div className="grid gap-3 text-sm">
              {/* Migration results */}
              {result && (
                <div>
                  <div className="font-medium mb-2">Migration Results:</div>
                  <div className="text-xs space-y-1">
                    <div>Total Steps: {result.stats.total}</div>
                    <div>Successful: {result.stats.successful}</div>
                    <div>Failed: {result.stats.failed}</div>
                  </div>
                </div>
              )}

              {/* Critical tables status */}
              <div>
                <div className="font-medium mb-2">Critical Components:</div>
                <div className="flex gap-4 text-xs">
                  <span className={criticalTablesExist ? 'text-green-600' : 'text-red-600'}>
                    {criticalTablesExist ? '✅' : '❌'} Tax Columns
                  </span>
                  <span className={result?.results.some(r => r.step.includes('LPO') && r.success) ? 'text-green-600' : 'text-gray-500'}>
                    {result?.results.some(r => r.step.includes('LPO') && r.success) ? '✅' : '⏳'} LPO Tables
                  </span>
                </div>
              </div>

              {/* Manual instructions */}
              {needsManualSQL && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-700 text-xs">
                    <strong>Manual SQL execution required:</strong> Some database changes need to be run manually in Supabase SQL Editor.
                    Use the "Copy SQL" button above to get the complete migration script.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
