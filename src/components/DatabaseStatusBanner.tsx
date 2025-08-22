import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { runImmediateDatabaseFix } from '@/utils/runImmediateFix';

export function DatabaseStatusBanner() {
  const [hasIssues, setHasIssues] = useState(false);
  const [criticalIssues, setCriticalIssues] = useState(0);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkDatabaseStatus = async () => {
      try {
        const results = await runImmediateDatabaseFix();
        const critical = results.errors.filter((e: any) => e.severity === 'CRITICAL').length;

        setHasIssues(results.errors.length > 0);
        setCriticalIssues(critical);
      } catch (error) {
        console.error('Failed to check database status:', error);
        setHasIssues(true);
        setCriticalIssues(1);
      } finally {
        setIsChecking(false);
      }
    };

    // Add a small delay to prevent setState during render
    const timer = setTimeout(checkDatabaseStatus, 100);
    return () => clearTimeout(timer);
  }, []);

  if (isChecking || !hasIssues) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <strong>Database Issues Detected:</strong> {criticalIssues} critical issue(s) preventing normal operation.
          The application may not work correctly until these are resolved.
        </div>
        <div className="flex gap-2 ml-4">
          <Link to="/forced-setup">
            <Button variant="default" size="sm">
              <Wrench className="h-4 w-4 mr-2" />
              Force Setup
            </Button>
          </Link>
          <Link to="/database-fix">
            <Button variant="outline" size="sm">
              Manual Fix
            </Button>
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  );
}
