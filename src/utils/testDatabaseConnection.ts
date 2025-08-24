import { supabase } from '@/integrations/supabase/client';

export async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Database connection failed:', error);
      return {
        success: false,
        message: 'Database connection failed',
        error: error.message
      };
    }

    console.log('✅ Database connection successful');
    
    // Test if we can check table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5);

    if (tableError) {
      console.warn('⚠️ Could not check table structure:', tableError);
    } else {
      console.log('✅ Table structure accessible, found tables:', tableInfo?.map(t => t.table_name));
    }

    return {
      success: true,
      message: 'Database connection successful',
      tables: tableInfo?.map(t => t.table_name) || []
    };

  } catch (error: any) {
    console.error('❌ Connection test failed:', error);
    return {
      success: false,
      message: 'Connection test failed',
      error: error.message
    };
  }
}

export async function checkRLSStatus() {
  try {
    console.log('🔍 Checking RLS status...');
    
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name, row_security')
      .eq('table_schema', 'public')
      .eq('row_security', 'YES');

    if (error) {
      console.warn('⚠️ Could not check RLS status:', error);
      return { success: false, error: error.message };
    }

    const tablesWithRLS = data || [];
    console.log(`📊 Found ${tablesWithRLS.length} tables with RLS enabled`);
    
    return {
      success: true,
      tablesWithRLS: tablesWithRLS.map(t => t.table_name),
      needsRLSRemoval: tablesWithRLS.length > 0
    };

  } catch (error: any) {
    console.error('❌ RLS check failed:', error);
    return { success: false, error: error.message };
  }
}

export async function checkMissingColumns() {
  try {
    console.log('🔍 Checking for missing columns...');
    
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name')
      .in('table_name', ['invoices', 'lpo_items', 'delivery_note_items', 'delivery_notes'])
      .in('column_name', ['lpo_number', 'unit_of_measure', 'tracking_number']);

    if (error) {
      console.warn('⚠️ Could not check columns:', error);
      return { success: false, error: error.message };
    }

    const foundColumns = data || [];
    const expectedColumns = [
      { table: 'invoices', column: 'lpo_number' },
      { table: 'lpo_items', column: 'unit_of_measure' },
      { table: 'delivery_note_items', column: 'unit_of_measure' },
      { table: 'delivery_notes', column: 'tracking_number' }
    ];

    const missingColumns: string[] = [];
    expectedColumns.forEach(expected => {
      const exists = foundColumns.some(col => 
        col.table_name === expected.table && col.column_name === expected.column
      );
      if (!exists) {
        missingColumns.push(`${expected.table}.${expected.column}`);
      }
    });

    console.log(`📊 Missing columns: ${missingColumns.length > 0 ? missingColumns.join(', ') : 'None'}`);
    
    return {
      success: true,
      missingColumns,
      needsColumnFixes: missingColumns.length > 0
    };

  } catch (error: any) {
    console.error('❌ Column check failed:', error);
    return { success: false, error: error.message };
  }
}

export async function runQuickSystemAudit() {
  console.log('🚀 Running quick system audit...');
  
  const results = {
    connection: await testDatabaseConnection(),
    rls: await checkRLSStatus(),
    columns: await checkMissingColumns()
  };

  const issues: string[] = [];
  const fixes: string[] = [];

  // Analyze results
  if (!results.connection.success) {
    issues.push('❌ Database connection failed');
  } else {
    fixes.push('✅ Database connection working');
  }

  if (results.rls.success && results.rls.needsRLSRemoval) {
    issues.push(`❌ ${results.rls.tablesWithRLS?.length} tables have RLS enabled`);
    fixes.push('📋 Need to remove RLS policies');
  } else if (results.rls.success) {
    fixes.push('✅ RLS appears disabled');
  }

  if (results.columns.success && results.columns.needsColumnFixes) {
    issues.push(`❌ Missing columns: ${results.columns.missingColumns?.join(', ')}`);
    fixes.push('📋 Need to add missing columns');
  } else if (results.columns.success) {
    fixes.push('✅ Required columns exist');
  }

  console.log('📊 Audit complete:');
  console.log('Issues:', issues);
  console.log('Status:', fixes);

  return {
    success: true,
    issues,
    fixes,
    needsManualFix: issues.length > 0,
    details: results
  };
}
