import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Immediate fix for proforma function error
 * This runs automatically when the error is detected
 */
export const executeProformaFunctionFix = async (): Promise<boolean> => {
  try {
    console.log('🔧 Executing immediate proforma function fix...');

    // SQL to create the function
    const functionSQL = `
      -- Create the generate_proforma_number function
      CREATE OR REPLACE FUNCTION public.generate_proforma_number(company_uuid UUID)
      RETURNS TEXT AS $$
      DECLARE
          next_number INTEGER;
          year_part TEXT;
          proforma_number TEXT;
      BEGIN
          -- Get current year
          year_part := EXTRACT(year FROM CURRENT_DATE)::TEXT;
          
          -- Get the next number for this year and company
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
          
          -- If no records found or table doesn't exist, start with 1
          IF next_number IS NULL THEN
              next_number := 1;
          END IF;
          
          -- Format as PF-YYYY-NNNN
          proforma_number := 'PF-' || year_part || '-' || LPAD(next_number::TEXT, 4, '0');
          
          RETURN proforma_number;
      EXCEPTION
          WHEN OTHERS THEN
              -- Fallback: return a timestamp-based number if anything fails
              RETURN 'PF-' || year_part || '-' || LPAD(EXTRACT(epoch FROM CURRENT_TIMESTAMP)::TEXT, 10, '0');
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Grant execute permissions
      GRANT EXECUTE ON FUNCTION public.generate_proforma_number(UUID) TO authenticated;
      GRANT EXECUTE ON FUNCTION public.generate_proforma_number(UUID) TO anon;
    `;

    // Try multiple methods to execute the SQL
    let success = false;
    let error: any = null;

    // Method 1: Try exec_sql if available
    try {
      const { error: execError } = await supabase.rpc('exec_sql', { sql: functionSQL });
      if (!execError) {
        success = true;
        console.log('✅ Function created using exec_sql');
      } else {
        error = execError;
      }
    } catch (err) {
      error = err;
    }

    // Method 2: Try alternative execution
    if (!success) {
      try {
        const { error: altError } = await supabase.rpc('sql', { query: functionSQL });
        if (!altError) {
          success = true;
          console.log('✅ Function created using alternative method');
        } else {
          error = altError;
        }
      } catch (err) {
        error = err;
      }
    }

    // Method 3: Try direct execution (for newer Supabase versions)
    if (!success) {
      try {
        const { error: directError } = await supabase.rpc('execute_sql', { sql: functionSQL });
        if (!directError) {
          success = true;
          console.log('✅ Function created using direct execution');
        } else {
          error = directError;
        }
      } catch (err) {
        error = err;
      }
    }

    if (success) {
      // Test the function
      try {
        const { data: testResult, error: testError } = await supabase.rpc('generate_proforma_number', {
          company_uuid: '550e8400-e29b-41d4-a716-446655440000'
        });

        if (!testError && testResult) {
          console.log('✅ Function test successful:', testResult);
          toast.success(`Proforma function fixed! Generated test number: ${testResult}`);
          return true;
        } else {
          console.warn('⚠️ Function created but test failed:', testError);
          toast.warning('Function created but test failed. Manual verification needed.');
          return false;
        }
      } catch (testErr) {
        console.warn('⚠️ Function test failed:', testErr);
        toast.warning('Function may have been created but cannot be tested.');
        return false;
      }
    } else {
      console.error('❌ All function creation methods failed:', error);
      toast.error('Failed to create proforma function. Please use manual SQL fix.');
      return false;
    }

  } catch (err) {
    console.error('❌ Immediate fix failed:', err);
    toast.error('Proforma function fix failed. Please try manual method.');
    return false;
  }
};

/**
 * Check if the proforma function exists
 */
export const checkProformaFunctionExists = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('generate_proforma_number', {
      company_uuid: '550e8400-e29b-41d4-a716-446655440000'
    });

    if (!error && data) {
      console.log('✅ Proforma function exists and works');
      return true;
    } else {
      console.log('❌ Proforma function does not exist or failed:', error?.message);
      return false;
    }
  } catch (err) {
    console.log('❌ Function check failed:', err);
    return false;
  }
};

/**
 * Auto-fix proforma function if it doesn't exist
 */
export const autoFixProformaFunction = async (): Promise<string> => {
  try {
    // First check if function exists
    const exists = await checkProformaFunctionExists();
    
    if (exists) {
      console.log('✅ Function already exists, testing...');
      const { data } = await supabase.rpc('generate_proforma_number', {
        company_uuid: '550e8400-e29b-41d4-a716-446655440000'
      });
      return data || `PF-${new Date().getFullYear()}-0001`;
    }

    // Function doesn't exist, try to create it
    console.log('🔧 Function missing, attempting to create...');
    const fixSuccess = await executeProformaFunctionFix();
    
    if (fixSuccess) {
      // Try to generate a number
      const { data } = await supabase.rpc('generate_proforma_number', {
        company_uuid: '550e8400-e29b-41d4-a716-446655440000'
      });
      return data || `PF-${new Date().getFullYear()}-0001`;
    } else {
      // Return fallback number
      const timestamp = Date.now().toString().slice(-6);
      const year = new Date().getFullYear();
      return `PF-${year}-${timestamp}`;
    }

  } catch (err) {
    console.error('❌ Auto-fix failed:', err);
    // Return fallback number
    const timestamp = Date.now().toString().slice(-6);
    const year = new Date().getFullYear();
    return `PF-${year}-${timestamp}`;
  }
};
