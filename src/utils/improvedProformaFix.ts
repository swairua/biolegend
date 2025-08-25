import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Improved proforma function fix with better error handling
 */

// Serialize error object properly
const serializeError = (error: any): string => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.details) return error.details;
  if (error.hint) return error.hint;
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
};

// Function SQL with better error handling
const IMPROVED_FUNCTION_SQL = `
-- Drop function if it exists (to handle any corruption)
DROP FUNCTION IF EXISTS public.generate_proforma_number(UUID);

-- Create the generate_proforma_number function with improved error handling
CREATE OR REPLACE FUNCTION public.generate_proforma_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_part TEXT;
    proforma_number TEXT;
BEGIN
    -- Get current year
    year_part := EXTRACT(year FROM CURRENT_DATE)::TEXT;
    
    -- Initialize next_number
    next_number := 1;
    
    -- Try to get the next number for this year and company
    BEGIN
        SELECT COALESCE(MAX(
            CASE 
                WHEN proforma_number ~ ('^PF-' || year_part || '-[0-9]+$') 
                THEN CAST(SPLIT_PART(proforma_number, '-', 3) AS INTEGER)
                ELSE 0
            END
        ), 0) + 1
        INTO next_number
        FROM proforma_invoices 
        WHERE company_id = company_uuid
        AND proforma_number LIKE 'PF-' || year_part || '-%';
        
        -- Ensure we have a valid number
        IF next_number IS NULL OR next_number <= 0 THEN
            next_number := 1;
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- If table doesn't exist or any other error, start with 1
            next_number := 1;
    END;
    
    -- Format as PF-YYYY-NNNN
    proforma_number := 'PF-' || year_part || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN proforma_number;
EXCEPTION
    WHEN OTHERS THEN
        -- Ultimate fallback: return a timestamp-based number
        year_part := EXTRACT(year FROM CURRENT_DATE)::TEXT;
        RETURN 'PF-' || year_part || '-' || LPAD(EXTRACT(epoch FROM CURRENT_TIMESTAMP)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_proforma_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_proforma_number(UUID) TO anon;
`;

/**
 * Alternative method using raw SQL execution
 */
const executeRawSQL = async (sql: string): Promise<{ success: boolean; error?: string; details?: any }> => {
  try {
    console.log('🔧 Attempting raw SQL execution...');
    
    // Try the from() method with a system table
    const { error } = await supabase
      .from('information_schema.tables')
      .select('*')
      .limit(1);
    
    if (error) {
      return { success: false, error: serializeError(error), details: error };
    }
    
    // If basic connection works, try direct query method
    // Note: This method may not work in all Supabase configurations
    const response = await fetch('/rest/v1/rpc/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        'apikey': supabase.supabaseKey
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (response.ok) {
      return { success: true };
    } else {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
    
  } catch (error) {
    return { success: false, error: serializeError(error), details: error };
  }
};

/**
 * Check if function exists with better error handling
 */
export const checkFunctionExistsImproved = async (): Promise<{
  exists: boolean;
  error?: string;
  details?: any;
}> => {
  try {
    console.log('🔍 Checking function existence...');
    
    // Method 1: Direct function call test
    const { data, error } = await supabase.rpc('generate_proforma_number', {
      company_uuid: '550e8400-e29b-41d4-a716-446655440000'
    });
    
    if (!error && data) {
      console.log('✅ Function exists and works:', data);
      return { exists: true };
    }
    
    // Method 2: Check information_schema
    const { data: schemaData, error: schemaError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .eq('routine_name', 'generate_proforma_number');
    
    if (!schemaError && schemaData && schemaData.length > 0) {
      console.log('✅ Function found in schema but may not work properly');
      return { exists: true };
    }
    
    console.log('❌ Function does not exist');
    return { 
      exists: false, 
      error: serializeError(error || schemaError),
      details: { error, schemaError }
    };
    
  } catch (error) {
    console.error('❌ Error checking function:', error);
    return { 
      exists: false, 
      error: serializeError(error),
      details: error 
    };
  }
};

/**
 * Create function with multiple fallback methods
 */
export const createFunctionImproved = async (): Promise<{
  success: boolean;
  method?: string;
  error?: string;
  details?: any;
}> => {
  const methods = [
    { name: 'exec_sql', func: () => supabase.rpc('exec_sql', { sql: IMPROVED_FUNCTION_SQL }) },
    { name: 'sql', func: () => supabase.rpc('sql', { query: IMPROVED_FUNCTION_SQL }) },
    { name: 'execute_sql', func: () => supabase.rpc('execute_sql', { sql: IMPROVED_FUNCTION_SQL }) },
    { name: 'execute', func: () => supabase.rpc('execute', { query: IMPROVED_FUNCTION_SQL }) },
    { name: 'raw_sql', func: () => executeRawSQL(IMPROVED_FUNCTION_SQL) },
  ];
  
  const errors: Array<{ method: string; error: string }> = [];
  
  for (const method of methods) {
    try {
      console.log(`🔧 Trying method: ${method.name}`);
      
      const result = await method.func();
      
      // Handle different result formats
      if (method.name === 'raw_sql') {
        if (result.success) {
          console.log(`✅ Function created using ${method.name}`);
          return { success: true, method: method.name };
        } else {
          errors.push({ method: method.name, error: result.error || 'Unknown error' });
        }
      } else {
        const { error } = result;
        if (!error) {
          console.log(`✅ Function created using ${method.name}`);
          return { success: true, method: method.name };
        } else {
          errors.push({ method: method.name, error: serializeError(error) });
        }
      }
      
    } catch (error) {
      const errorMsg = serializeError(error);
      console.warn(`⚠️ Method ${method.name} failed:`, errorMsg);
      errors.push({ method: method.name, error: errorMsg });
    }
  }
  
  console.error('❌ All function creation methods failed');
  const combinedError = errors.map(e => `${e.method}: ${e.error}`).join('\n');
  
  return { 
    success: false, 
    error: `All methods failed:\n${combinedError}`,
    details: errors 
  };
};

/**
 * Test function with better error handling
 */
export const testFunctionImproved = async (companyId: string = '550e8400-e29b-41d4-a716-446655440000'): Promise<{
  success: boolean;
  result?: string;
  error?: string;
  details?: any;
}> => {
  try {
    console.log('🧪 Testing function...');
    
    const { data, error } = await supabase.rpc('generate_proforma_number', {
      company_uuid: companyId
    });
    
    if (error) {
      return { 
        success: false, 
        error: serializeError(error),
        details: error 
      };
    }
    
    if (data) {
      console.log('✅ Function test successful:', data);
      return { success: true, result: data };
    }
    
    return { 
      success: false, 
      error: 'Function returned no result' 
    };
    
  } catch (error) {
    return { 
      success: false, 
      error: serializeError(error),
      details: error 
    };
  }
};

/**
 * Complete improved setup process
 */
export const setupProformaFunctionImproved = async (): Promise<{
  success: boolean;
  steps: Array<{
    step: string;
    success: boolean;
    details?: any;
    error?: string;
  }>;
  functionCreated: boolean;
  testResult?: string;
  errors?: string[];
}> => {
  const results = {
    success: false,
    steps: [] as Array<{step: string; success: boolean; details?: any; error?: string}>,
    functionCreated: false,
    testResult: undefined as string | undefined,
    errors: [] as string[]
  };

  try {
    // Step 1: Check if function exists
    console.log('📋 Step 1: Checking function existence...');
    const checkResult = await checkFunctionExistsImproved();
    results.steps.push({
      step: 'Check function existence',
      success: checkResult.exists,
      details: checkResult.details,
      error: checkResult.error
    });

    if (!checkResult.error) {
      results.errors?.push(checkResult.error);
    }

    // Step 2: Create function if it doesn't exist
    let functionWasCreated = false;
    if (!checkResult.exists) {
      console.log('📋 Step 2: Creating function...');
      const createResult = await createFunctionImproved();
      results.steps.push({
        step: 'Create function',
        success: createResult.success,
        details: createResult.details,
        error: createResult.error
      });
      
      functionWasCreated = createResult.success;
      results.functionCreated = functionWasCreated;
      
      if (createResult.error) {
        results.errors?.push(createResult.error);
      }
      
      if (!createResult.success) {
        console.error('❌ Function creation failed');
        return results;
      }
    } else {
      console.log('✅ Function already exists');
    }

    // Step 3: Test the function
    console.log('📋 Step 3: Testing function...');
    const testResult = await testFunctionImproved();
    results.steps.push({
      step: 'Test function',
      success: testResult.success,
      details: testResult.details,
      error: testResult.error
    });
    
    if (testResult.success && testResult.result) {
      results.testResult = testResult.result;
    }

    if (testResult.error) {
      results.errors?.push(testResult.error);
    }

    // Overall success
    results.success = (checkResult.exists || functionWasCreated) && testResult.success;

    if (results.success) {
      console.log('🎉 Proforma function setup completed successfully!');
      toast.success(`Proforma function is working! Generated: ${results.testResult}`);
    } else {
      console.error('❌ Proforma function setup failed');
      toast.error('Proforma function setup failed. Manual intervention required.');
    }

  } catch (error) {
    const errorMsg = serializeError(error);
    console.error('❌ Setup process failed:', error);
    results.steps.push({
      step: 'Setup process',
      success: false,
      error: errorMsg,
      details: error
    });
    results.errors?.push(errorMsg);
    toast.error('Setup process failed with unexpected error');
  }

  return results;
};

/**
 * Generate fallback proforma number
 */
export const generateFallbackNumber = (): string => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const number = `PF-${year}-${timestamp}`;
  console.log('🔄 Generated fallback number:', number);
  return number;
};

/**
 * Auto-fix with improved error handling and fallbacks
 */
export const autoFixImproved = async (): Promise<{
  success: boolean;
  number: string;
  method: 'function' | 'fallback';
  error?: string;
}> => {
  try {
    console.log('🚀 Starting improved auto-fix...');
    
    // Try the complete setup
    const setupResult = await setupProformaFunctionImproved();
    
    if (setupResult.success && setupResult.testResult) {
      return {
        success: true,
        number: setupResult.testResult,
        method: 'function'
      };
    }
    
    // If setup failed, generate fallback number
    console.warn('⚠️ Function setup failed, using fallback number');
    const fallbackNumber = generateFallbackNumber();
    
    return {
      success: false,
      number: fallbackNumber,
      method: 'fallback',
      error: setupResult.errors?.join('; ') || 'Function setup failed'
    };
    
  } catch (error) {
    console.error('❌ Auto-fix failed completely:', error);
    const fallbackNumber = generateFallbackNumber();
    
    return {
      success: false,
      number: fallbackNumber,
      method: 'fallback',
      error: serializeError(error)
    };
  }
};
