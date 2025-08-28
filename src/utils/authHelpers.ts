import { supabase } from '@/integrations/supabase/client';

/**
 * Clear corrupted auth tokens from localStorage
 */
export const clearAuthTokens = () => {
  try {
    // Get the storage key for this Supabase instance
    const projectRef = supabase.supabaseUrl.split('//')[1].split('.')[0];
    const storageKey = `sb-${projectRef}-auth-token`;
    
    // Clear the main auth token
    localStorage.removeItem(storageKey);
    
    // Clear any other potential auth-related keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('auth') || key.includes(projectRef))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('Cleared corrupted auth key:', key);
    });
    
    console.log('✅ Cleared all auth tokens');
    return true;
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
    return false;
  }
};

/**
 * Check if we're currently rate limited
 */
export const isRateLimited = (): boolean => {
  const rateLimitKey = 'supabase_rate_limit';
  const lastRateLimit = localStorage.getItem(rateLimitKey);
  
  if (!lastRateLimit) return false;
  
  const rateLimitTime = parseInt(lastRateLimit, 10);
  const now = Date.now();
  const rateLimitDuration = 60000; // 1 minute
  
  return (now - rateLimitTime) < rateLimitDuration;
};

/**
 * Mark that we've hit a rate limit
 */
export const markRateLimited = () => {
  const rateLimitKey = 'supabase_rate_limit';
  localStorage.setItem(rateLimitKey, Date.now().toString());
};

/**
 * Get time remaining for rate limit in seconds
 */
export const getRateLimitTimeRemaining = (): number => {
  const rateLimitKey = 'supabase_rate_limit';
  const lastRateLimit = localStorage.getItem(rateLimitKey);
  
  if (!lastRateLimit) return 0;
  
  const rateLimitTime = parseInt(lastRateLimit, 10);
  const now = Date.now();
  const rateLimitDuration = 60000; // 1 minute
  const remaining = rateLimitDuration - (now - rateLimitTime);
  
  return Math.max(0, Math.ceil(remaining / 1000));
};

/**
 * Safe auth operation with rate limiting protection and timeout
 */
export const safeAuthOperation = async <T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ data: T | null; error: Error | null }> => {
  try {
    // Check if we're rate limited
    if (isRateLimited()) {
      const remaining = getRateLimitTimeRemaining();
      const error = new Error(`Rate limited. Please wait ${remaining} seconds before trying again.`);
      return { data: null, error };
    }

    // Add timeout to auth operations (4 seconds max)
    const operationPromise = operation();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${operationName} operation timed out after 4 seconds`)), 4000);
    });

    const result = await Promise.race([operationPromise, timeoutPromise]);
    return { data: result, error: null };

  } catch (error: any) {
    // Check if this is a timeout error
    if (error?.message?.includes('timed out')) {
      console.warn(`${operationName} operation timed out`);
      return { data: null, error: new Error(`${operationName} operation took too long. Please try again.`) };
    }

    // Check if this is a rate limit error
    if (error?.message?.includes('rate limit') || error?.message?.includes('Rate limit')) {
      markRateLimited();
      const remaining = getRateLimitTimeRemaining();
      const rateLimitError = new Error(`Rate limit reached. Please wait ${remaining} seconds before trying again.`);
      return { data: null, error: rateLimitError };
    }

    // Check if this is an invalid token error
    if (error?.message?.includes('Invalid Refresh Token') ||
        error?.message?.includes('Refresh Token Not Found') ||
        error?.message?.includes('invalid_token')) {
      console.warn('Clearing invalid auth tokens');
      clearAuthTokens();
      const tokenError = new Error('Authentication tokens were invalid and have been cleared. Please sign in again.');
      return { data: null, error: tokenError };
    }

    return { data: null, error: error as Error };
  }
};

/**
 * Initialize auth with ultra-fast, resilient approach
 */
export const initializeAuth = async () => {
  try {
    console.log('🔑 Fast auth check...');

    // Shorter timeout for faster initialization
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second max

    try {
      // Quick connectivity test first
      const connectivityCheck = new Promise((resolve) => {
        fetch(supabase.supabaseUrl + '/rest/v1/', {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-cache'
        })
          .then(() => resolve(true))
          .catch(() => resolve(false));
      });

      // Shorter connectivity timeout
      const connectivityTimeout = new Promise((resolve) => {
        setTimeout(() => resolve(false), 1500);
      });

      const hasConnectivity = await Promise.race([connectivityCheck, connectivityTimeout]);

      if (!hasConnectivity) {
        console.warn('🌐 No connectivity to Supabase - starting without auth');
        clearTimeout(timeoutId);
        return { session: null, error: new Error('No connectivity') };
      }

      // Get current session with timeout
      const sessionPromise = supabase.auth.getSession();
      const sessionTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session timeout')), 2500);
      });

      const sessionResult = await Promise.race([sessionPromise, sessionTimeout]);
      const { data: sessionData, error: sessionError } = sessionResult as any;

      clearTimeout(timeoutId);

      // Handle invalid token errors by clearing them
      if (sessionError?.message?.includes('Invalid Refresh Token') ||
          sessionError?.message?.includes('Refresh Token Not Found') ||
          sessionError?.message?.includes('invalid_token')) {
        console.warn('Invalid tokens detected, clearing...');
        clearAuthTokens();
        return { session: null, error: null };
      }

      if (sessionError) {
        console.warn('Session error:', sessionError.message);
        return { session: null, error: sessionError };
      }

      console.log('✅ Fast auth completed successfully');
      return { session: sessionData.session, error: null };

    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (fetchError.name === 'AbortError' || fetchError.message?.includes('timeout')) {
        console.warn('⏱️ Auth request timed out');
        return { session: null, error: new Error('Auth request timeout') };
      }

      // Handle network errors gracefully
      if (fetchError.message?.includes('Failed to fetch') ||
          fetchError.message?.includes('Network request failed') ||
          fetchError.message?.includes('fetch')) {
        console.warn('🌐 Network error during auth:', fetchError.message);
        return { session: null, error: new Error('Network connectivity issue') };
      }

      throw fetchError;
    }

  } catch (error: any) {
    console.warn('⚠️ Auth check failed:', error);
    return { session: null, error: error };
  }
};

/**
 * Delay utility for rate limiting
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
