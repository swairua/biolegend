/**
 * Lightweight proforma number generation
 * This avoids heavy database function creation and focuses on speed
 */

/**
 * Generate a simple, lightweight proforma number
 */
export const generateLightweightProformaNumber = (): string => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `PF-${year}-${timestamp}${random}`;
};

/**
 * Try to use database function if available, but fallback quickly
 */
export const generateProformaNumberQuick = async (companyId: string): Promise<string> => {
  try {
    // Quick timeout to avoid hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 2000); // 2 second timeout
    });

    // Try the database function with timeout
    const dbPromise = (async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.rpc('generate_proforma_number', {
        company_uuid: companyId
      });
      
      if (error || !data) {
        throw new Error('Database function failed');
      }
      
      return data;
    })();

    // Race between database call and timeout
    const result = await Promise.race([dbPromise, timeoutPromise]);
    
    console.log('✅ Database proforma number generated:', result);
    return result;
    
  } catch (error) {
    // Quick fallback - no complex error handling or retries
    console.log('⚡ Using fast fallback number generation');
    return generateLightweightProformaNumber();
  }
};

/**
 * Super fast number generation for immediate UI response
 */
export const generateInstantProformaNumber = (): string => {
  // Instant number for immediate UI feedback
  const year = new Date().getFullYear();
  const time = new Date().getTime().toString().slice(-6);
  
  return `PF-${year}-${time}`;
};
