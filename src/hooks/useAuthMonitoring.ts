import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AuthMetrics {
  initializationTime: number;
  sessionCheckTime: number;
  profileLoadTime: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'failed';
  lastErrorTime?: number;
  errorCount: number;
}

interface AuthEvent {
  type: 'initialization' | 'session_check' | 'profile_load' | 'error' | 'timeout';
  timestamp: number;
  duration?: number;
  details?: string;
  error?: string;
}

export const useAuthMonitoring = () => {
  const { loading, isAuthenticated, user, session } = useAuth();
  const metricsRef = useRef<AuthMetrics>({
    initializationTime: 0,
    sessionCheckTime: 0,
    profileLoadTime: 0,
    connectionQuality: 'excellent',
    errorCount: 0
  });
  const eventsRef = useRef<AuthEvent[]>([]);
  const initStartTimeRef = useRef<number | null>(null);

  // Track initialization start time
  useEffect(() => {
    if (loading && !initStartTimeRef.current) {
      initStartTimeRef.current = Date.now();
      logEvent('initialization', 0, 'Auth initialization started');
    }
  }, [loading]);

  // Track initialization completion
  useEffect(() => {
    if (!loading && initStartTimeRef.current) {
      const initTime = Date.now() - initStartTimeRef.current;
      metricsRef.current.initializationTime = initTime;
      logEvent('initialization', initTime, `Auth initialization completed in ${initTime}ms`);
      
      // Update connection quality based on performance
      if (initTime < 1000) {
        metricsRef.current.connectionQuality = 'excellent';
      } else if (initTime < 3000) {
        metricsRef.current.connectionQuality = 'good';
      } else if (initTime < 5000) {
        metricsRef.current.connectionQuality = 'poor';
      } else {
        metricsRef.current.connectionQuality = 'failed';
        logEvent('timeout', initTime, `Auth initialization took ${initTime}ms (timeout threshold exceeded)`);
      }
      
      initStartTimeRef.current = null;
    }
  }, [loading]);

  // Track authentication errors
  useEffect(() => {
    if (!user && !loading && session === null) {
      // Potential auth error or user not signed in
      const now = Date.now();
      if (metricsRef.current.lastErrorTime && (now - metricsRef.current.lastErrorTime) < 5000) {
        // Don't log frequent errors
        return;
      }
      
      metricsRef.current.lastErrorTime = now;
      metricsRef.current.errorCount += 1;
      logEvent('error', 0, 'Auth state indicates no user/session');
    }
  }, [user, loading, session]);

  const logEvent = useCallback((
    type: AuthEvent['type'], 
    duration?: number, 
    details?: string, 
    error?: string
  ) => {
    const event: AuthEvent = {
      type,
      timestamp: Date.now(),
      duration,
      details,
      error
    };
    
    eventsRef.current.push(event);
    
    // Keep only last 50 events to prevent memory leaks
    if (eventsRef.current.length > 50) {
      eventsRef.current = eventsRef.current.slice(-50);
    }
    
    // Log important events to console for debugging
    if (type === 'error' || type === 'timeout') {
      console.warn(`🔍 Auth Monitor [${type.toUpperCase()}]:`, details, error);
    } else {
      console.log(`🔍 Auth Monitor [${type.toUpperCase()}]:`, details);
    }
  }, []);

  const testConnectionSpeed = useCallback(async (): Promise<number> => {
    const start = Date.now();
    try {
      await fetch(supabase.supabaseUrl + '/rest/v1/', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      const duration = Date.now() - start;
      logEvent('session_check', duration, `Connection test completed in ${duration}ms`);
      return duration;
    } catch (error) {
      const duration = Date.now() - start;
      logEvent('error', duration, 'Connection test failed', error instanceof Error ? error.message : 'Unknown error');
      return -1;
    }
  }, [logEvent]);

  const getAuthHealthScore = useCallback((): number => {
    const metrics = metricsRef.current;
    let score = 100;
    
    // Deduct points for slow initialization
    if (metrics.initializationTime > 3000) {
      score -= 30;
    } else if (metrics.initializationTime > 1000) {
      score -= 15;
    }
    
    // Deduct points for errors
    score -= Math.min(metrics.errorCount * 10, 40);
    
    // Deduct points for poor connection quality
    switch (metrics.connectionQuality) {
      case 'poor':
        score -= 20;
        break;
      case 'failed':
        score -= 50;
        break;
      case 'good':
        score -= 5;
        break;
    }
    
    return Math.max(0, Math.min(100, score));
  }, []);

  const getRecentEvents = useCallback((limit: number = 10): AuthEvent[] => {
    return eventsRef.current.slice(-limit);
  }, []);

  const clearMetrics = useCallback(() => {
    metricsRef.current = {
      initializationTime: 0,
      sessionCheckTime: 0,
      profileLoadTime: 0,
      connectionQuality: 'excellent',
      errorCount: 0
    };
    eventsRef.current = [];
    logEvent('initialization', 0, 'Auth monitoring metrics cleared');
  }, [logEvent]);

  const getPerformanceReport = useCallback(() => {
    const metrics = metricsRef.current;
    const recentEvents = getRecentEvents(20);
    const errorEvents = recentEvents.filter(e => e.type === 'error' || e.type === 'timeout');
    const healthScore = getAuthHealthScore();
    
    return {
      metrics,
      healthScore,
      recentEvents,
      errorEvents,
      recommendations: generateRecommendations(metrics, healthScore, errorEvents)
    };
  }, [getRecentEvents, getAuthHealthScore]);

  const generateRecommendations = (
    metrics: AuthMetrics, 
    healthScore: number, 
    errorEvents: AuthEvent[]
  ): string[] => {
    const recommendations: string[] = [];
    
    if (healthScore < 70) {
      recommendations.push('Authentication health is below optimal. Consider investigating recent errors.');
    }
    
    if (metrics.initializationTime > 3000) {
      recommendations.push('Auth initialization is slow. Check network connection and Supabase performance.');
    }
    
    if (metrics.errorCount > 3) {
      recommendations.push('Multiple auth errors detected. Consider clearing tokens or checking Supabase configuration.');
    }
    
    if (metrics.connectionQuality === 'poor' || metrics.connectionQuality === 'failed') {
      recommendations.push('Poor connection quality detected. Check network stability and Supabase region settings.');
    }
    
    if (errorEvents.length > 5) {
      recommendations.push('Frequent errors detected. Enable detailed logging and contact support if issues persist.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Authentication system is performing well.');
    }
    
    return recommendations;
  };

  return {
    metrics: metricsRef.current,
    logEvent,
    testConnectionSpeed,
    getAuthHealthScore,
    getRecentEvents,
    clearMetrics,
    getPerformanceReport,
    isHealthy: getAuthHealthScore() > 80
  };
};

export default useAuthMonitoring;
