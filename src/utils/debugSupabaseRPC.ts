import { supabase } from '@/integrations/supabase/client';

export const debugSupabaseRPC = async () => {
  console.log('🔍 Debugging Supabase RPC functions...');
  
  // Test 1: Check if exec_sql exists
  try {
    console.log('Testing exec_sql with simple query...');
    const { data, error } = await supabase.rpc('exec_sql', {
      query: 'SELECT 1 as test;'
    });
    
    if (error) {
      console.log('❌ exec_sql error:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ exec_sql works! Result:', data);
    }
  } catch (err) {
    console.log('❌ exec_sql threw exception:', err);
  }

  // Test 2: Check if we can query existing tables
  try {
    console.log('Testing basic table access...');
    const { data, error } = await supabase
      .from('companies')
      .select('id, name')
      .limit(1);
    
    if (error) {
      console.log('❌ companies table error:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ companies table accessible:', data);
    }
  } catch (err) {
    console.log('❌ companies table threw exception:', err);
  }

  // Test 3: Check if customers table exists (used for suppliers)
  try {
    console.log('Testing customers table...');
    const { data, error } = await supabase
      .from('customers')
      .select('id, name')
      .limit(1);
    
    if (error) {
      console.log('❌ customers table error:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ customers table accessible:', data);
    }
  } catch (err) {
    console.log('❌ customers table threw exception:', err);
  }

  // Test 4: Check if products table exists
  try {
    console.log('Testing products table...');
    const { data, error } = await supabase
      .from('products')
      .select('id, name')
      .limit(1);
    
    if (error) {
      console.log('❌ products table error:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ products table accessible:', data);
    }
  } catch (err) {
    console.log('❌ products table threw exception:', err);
  }

  // Test 5: Try alternative RPC functions
  const rpcFunctions = ['sql', 'execute_sql', 'run_sql'];
  for (const rpcFunc of rpcFunctions) {
    try {
      console.log(`Testing ${rpcFunc}...`);
      const { data, error } = await supabase.rpc(rpcFunc, {
        query: 'SELECT 1 as test;'
      });
      
      if (error) {
        console.log(`❌ ${rpcFunc} error:`, JSON.stringify(error, null, 2));
      } else {
        console.log(`✅ ${rpcFunc} works! Result:`, data);
      }
    } catch (err) {
      console.log(`❌ ${rpcFunc} threw exception:`, err);
    }
  }

  console.log('🔍 Debug complete!');
};
