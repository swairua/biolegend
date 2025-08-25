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
 * Safe auth operation with rate limiting protection
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
    
    const result = await operation();
    return { data: result, error: null };
    
  } catch (error: any) {
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
 * Initialize auth with token cleanup
 */
export const initializeAuth = async () => {
  try {
    console.log('Initializing auth...');
    
    // First, try to get the current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    // If we get an invalid token error, clear tokens and try again
    if (sessionError?.message?.includes('Invalid Refresh Token') || 
        sessionError?.message?.includes('Refresh Token Not Found')) {
      console.warn('Invalid tokens detected during initialization, clearing...');
      clearAuthTokens();
      
      // Try to get session again after clearing
      const { data: retrySessionData, error: retryError } = await supabase.auth.getSession();
      
      if (retryError) {
        console.error('Session retry failed:', retryError);
        return { session: null, error: retryError };
      }
      
      return { session: retrySessionData.session, error: null };
    }
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return { session: null, error: sessionError };
    }
    
    return { session: sessionData.session, error: null };
    
  } catch (error) {
    console.error('Auth initialization failed:', error);
    return { session: null, error: error as Error };
  }
};

/**
 * Delay utility for rate limiting
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
