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
 * Initialize auth with token cleanup and network resilience
 */
export const initializeAuth = async () => {
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔑 Auth initialization attempt ${attempt}/${maxRetries}`);

      // Add a controller for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout per attempt

      try {
        // Try to get the current session with abort signal
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        clearTimeout(timeoutId);

        // If we get an invalid token error, clear tokens and try again
        if (sessionError?.message?.includes('Invalid Refresh Token') ||
            sessionError?.message?.includes('Refresh Token Not Found') ||
            sessionError?.message?.includes('invalid_token')) {
          console.warn('Invalid tokens detected during initialization, clearing...');
          clearAuthTokens();

          // Only retry token clearing once
          if (attempt === 1) {
            console.log('🔄 Retrying after clearing tokens...');
            continue;
          }

          // If second attempt also fails with token error, return no session
          return { session: null, error: null };
        }

        if (sessionError) {
          // Check if it's a network-related error
          if (sessionError.message?.includes('Failed to fetch') ||
              sessionError.message?.includes('Network request failed') ||
              sessionError.message?.includes('fetch')) {
            lastError = new Error(`Network error during auth: ${sessionError.message}`);

            // Retry network errors
            if (attempt < maxRetries) {
              console.warn(`🌐 Network error on attempt ${attempt}, retrying...`);
              await delay(1000 * attempt); // Progressive delay
              continue;
            }
          }

          console.error('Session error:', sessionError);
          return { session: null, error: sessionError };
        }

        console.log(`✅ Auth session retrieved successfully on attempt ${attempt}`);
        return { session: sessionData.session, error: null };

      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        // Handle abort/timeout errors
        if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
          lastError = new Error(`Auth request timeout on attempt ${attempt}`);
          console.warn(`⏱️ Auth request timed out on attempt ${attempt}`);

          if (attempt < maxRetries) {
            await delay(1000); // Wait before retry
            continue;
          }
        }

        // Handle other fetch errors
        if (fetchError.message?.includes('Failed to fetch') ||
            fetchError.message?.includes('Network request failed')) {
          lastError = new Error(`Network connectivity issue: ${fetchError.message}`);
          console.warn(`🌐 Network error on attempt ${attempt}:`, fetchError.message);

          if (attempt < maxRetries) {
            await delay(2000 * attempt); // Progressive delay for network errors
            continue;
          }
        }

        throw fetchError;
      }

    } catch (error: any) {
      lastError = error;
      console.error(`❌ Auth initialization attempt ${attempt} failed:`, error);

      // If it's the last attempt, don't retry
      if (attempt === maxRetries) {
        break;
      }

      // For other errors, wait before retry
      await delay(1000 * attempt);
    }
  }

  console.error('🚫 All auth initialization attempts failed');
  return { session: null, error: lastError || new Error('Auth initialization failed after all retries') };
};

/**
 * Delay utility for rate limiting
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
