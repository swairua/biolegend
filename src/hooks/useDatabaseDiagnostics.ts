import { useEffect, useState } from 'react';
import { executeImmediateFix } from '@/utils/executeFix';
import { checkAndForceSetup } from '@/utils/forceInitialSetup';
import { runVerificationNow } from '@/utils/runVerificationNow';

interface DiagnosticsState {
  isRunning: boolean;
  hasRun: boolean;
  results: any;
  error: string | null;
}

export function useDatabaseDiagnostics() {
  const [state, setState] = useState<DiagnosticsState>({
    isRunning: false,
    hasRun: false,
    results: null,
    error: null
  });

  useEffect(() => {
    let isMounted = true;

    const runDiagnostics = async () => {
      if (state.hasRun) return;

      setState(prev => ({ ...prev, isRunning: true }));

      try {
        console.log('🔍 Running database diagnostics...');
        
        // Run emergency fix check first
        const emergencyResults = await executeImmediateFix();
        
        // Run verification check
        const verificationResults = await runVerificationNow();
        
        // Check if setup is needed (silent mode to prevent toast spam during render)
        const setupResults = await checkAndForceSetup({ silentMode: true });

        if (isMounted) {
          setState(prev => ({
            ...prev,
            isRunning: false,
            hasRun: true,
            results: {
              emergency: emergencyResults,
              verification: verificationResults,
              setup: setupResults
            }
          }));

          // Log results without triggering toasts
          if (verificationResults.summary.overallStatus === 'READY') {
            console.log('✅ System is fully operational!');
          } else if (emergencyResults.errors.filter(e => e.severity === 'CRITICAL').length > 0) {
            console.log('🚨 Critical database issues found - manual intervention needed');
          } else {
            console.log('⚠️ System partially operational - check verification results');
          }
        }
      } catch (error) {
        console.error('❌ Diagnostics failed:', error);
        if (isMounted) {
          setState(prev => ({
            ...prev,
            isRunning: false,
            hasRun: true,
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      }
    };

    // Run diagnostics after a longer delay to prevent setState during render errors
    const timer = setTimeout(runDiagnostics, 2500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [state.hasRun]);

  const runManualDiagnostics = async () => {
    setState(prev => ({ ...prev, hasRun: false }));
  };

  return {
    ...state,
    runManualDiagnostics
  };
}
