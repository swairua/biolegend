import { supabase } from '@/integrations/supabase/client';

export interface NetworkDiagnostic {
  type: 'browser_extension' | 'cors' | 'network' | 'auth' | 'database' | 'unknown';
  message: string;
  suggestion: string;
  canRetry: boolean;
}

export const analyzeNetworkError = (error: any): NetworkDiagnostic => {
  const errorMessage = error?.message || '';
  const errorStack = error?.stack || '';
  
  // Check for browser extension interference
  if (errorStack.includes('chrome-extension://') || 
      errorStack.includes('moz-extension://') || 
      errorStack.includes('webkit-extension://')) {
    return {
      type: 'browser_extension',
      message: 'Request blocked by browser extension',
      suggestion: 'Try disabling browser extensions (ad blockers, privacy tools) or use an incognito window',
      canRetry: true
    };
  }

  // Check for CORS issues
  if (errorMessage.includes('CORS') || 
      errorMessage.includes('Cross-Origin') || 
      errorMessage.includes('Access-Control-Allow-Origin')) {
    return {
      type: 'cors',
      message: 'Cross-origin request blocked',
      suggestion: 'This may be a temporary network issue. Please try again.',
      canRetry: true
    };
  }

  // Check for network connectivity issues
  if (errorMessage.includes('Failed to fetch') || 
      errorMessage.includes('NetworkError') || 
      errorMessage.includes('net::ERR')) {
    return {
      type: 'network',
      message: 'Network connection failed',
      suggestion: 'Check your internet connection and try again',
      canRetry: true
    };
  }

  // Check for authentication issues
  if (errorMessage.includes('JWT') || 
      errorMessage.includes('authentication') || 
      errorMessage.includes('unauthorized')) {
    return {
      type: 'auth',
      message: 'Authentication error',
      suggestion: 'Please sign out and sign back in',
      canRetry: false
    };
  }

  // Check for database issues
  if (errorMessage.includes('relation') || 
      errorMessage.includes('column') || 
      errorMessage.includes('table')) {
    return {
      type: 'database',
      message: 'Database structure issue',
      suggestion: 'Please contact support - this appears to be a system configuration issue',
      canRetry: false
    };
  }

  return {
    type: 'unknown',
    message: errorMessage || 'An unknown error occurred',
    suggestion: 'Please try again or contact support if the issue persists',
    canRetry: true
  };
};

export const testSupabaseConnection = async (): Promise<{
  success: boolean;
  diagnostic?: NetworkDiagnostic;
  details?: any;
}> => {
  try {
    // Test basic connectivity
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      return {
        success: false,
        diagnostic: analyzeNetworkError(error),
        details: error
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      diagnostic: analyzeNetworkError(error),
      details: error
    };
  }
};

export const createRetryableRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      const diagnostic = analyzeNetworkError(error);
      
      console.warn(`Request failed (attempt ${attempt}/${maxRetries}):`, {
        type: diagnostic.type,
        message: diagnostic.message,
        canRetry: diagnostic.canRetry
      });

      // Don't retry if error is not retryable
      if (!diagnostic.canRetry) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError;
};
