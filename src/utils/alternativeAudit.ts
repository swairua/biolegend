import { supabase } from '@/integrations/supabase/client';

export interface AlternativeAuditResult {
  tablesChecked: number;
  columnsVerified: number;
  missingColumns: Array<{ table: string; column: string }>;
  criticalIssues: string[];
  status: 'complete' | 'incomplete' | 'error';
  details: any;
}

// Critical columns that should exist after our fixes
const CRITICAL_COLUMNS = [
  { table: 'lpo_items', column: 'unit_of_measure' },
  { table: 'delivery_note_items', column: 'unit_of_measure' },
  { table: 'invoices', column: 'lpo_number' },
  { table: 'delivery_notes', column: 'delivery_method' },
  { table: 'delivery_notes', column: 'tracking_number' },
  { table: 'delivery_notes', column: 'carrier' },
  { table: 'invoice_items', column: 'tax_amount' },
  { table: 'invoice_items', column: 'tax_percentage' },
  { table: 'invoice_items', column: 'discount_before_vat' },
  { table: 'invoice_items', column: 'product_name' },
  { table: 'quotation_items', column: 'tax_amount' },
  { table: 'quotation_items', column: 'discount_before_vat' },
  { table: 'products', column: 'min_stock_level' },
  { table: 'products', column: 'max_stock_level' },
  { table: 'customers', column: 'state' },
  { table: 'customers', column: 'postal_code' },
  { table: 'payments', column: 'invoice_id' }
];

/**
 * Alternative audit method that doesn't rely on information_schema
 * Instead, it tries to select specific columns to check if they exist
 */
export async function alternativeDatabaseAudit(): Promise<AlternativeAuditResult> {
  try {
    console.log('🔍 Starting alternative database audit...');
    
    const missingColumns = [];
    const existingColumns = [];
    const tableAccessResults = [];

    // Check each critical column by trying to select it
    for (const { table, column } of CRITICAL_COLUMNS) {
      try {
        // Try to select the specific column with limit 0 (no data, just schema check)
        const { error } = await supabase
          .from(table)
          .select(column)
          .limit(0);

        if (error) {
          // Check if it's a column not found error
          if (error.message.includes('column') && error.message.includes('does not exist')) {
            missingColumns.push({ table, column });
            console.log(`❌ Missing column: ${table}.${column}`);
          } else if (error.message.includes('does not exist') || error.message.includes('relation')) {
            // Table doesn't exist
            missingColumns.push({ table, column });
            console.log(`❌ Missing table: ${table} (for column ${column})`);
          } else {
            // Other error (might be RLS or permissions)
            console.log(`⚠️ Access issue for ${table}.${column}: ${error.message}`);
            // Don't count as missing if it's just an access issue
          }
        } else {
          existingColumns.push({ table, column });
          console.log(`✅ Found column: ${table}.${column}`);
        }

      } catch (err: any) {
        console.log(`💥 Error checking ${table}.${column}:`, err.message);
        missingColumns.push({ table, column });
      }
    }

    // Check basic table access
    const tablesToCheck = ['customers', 'products', 'invoices', 'quotations'];
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('id')
          .limit(1);
        
        tableAccessResults.push({
          table: tableName,
          accessible: !error,
          hasData: data && data.length > 0,
          error: error?.message
        });
      } catch (err: any) {
        tableAccessResults.push({
          table: tableName,
          accessible: false,
          hasData: false,
          error: err.message
        });
      }
    }

    // Analyze results
    const criticalIssues = [];
    
    if (missingColumns.length > 0) {
      criticalIssues.push(`${missingColumns.length} critical columns missing`);
    }
    
    const inaccessibleTables = tableAccessResults.filter(r => !r.accessible);
    if (inaccessibleTables.length > 0) {
      criticalIssues.push(`${inaccessibleTables.length} tables inaccessible`);
    }

    const status = criticalIssues.length === 0 ? 'complete' : 'incomplete';

    const result: AlternativeAuditResult = {
      tablesChecked: tablesToCheck.length,
      columnsVerified: existingColumns.length,
      missingColumns,
      criticalIssues,
      status,
      details: {
        existingColumns,
        tableAccessResults,
        methodUsed: 'direct_column_query',
        totalCriticalColumns: CRITICAL_COLUMNS.length
      }
    };

    console.log('📊 Alternative audit completed:', result);
    return result;

  } catch (error: any) {
    console.error('❌ Alternative database audit failed:', error);
    
    return {
      tablesChecked: 0,
      columnsVerified: 0,
      missingColumns: [],
      criticalIssues: [`Audit failed: ${error.message}`],
      status: 'error',
      details: { error, methodUsed: 'direct_column_query' }
    };
  }
}

/**
 * Simplified form functionality test that doesn't use information_schema
 */
export async function alternativeFormTest(): Promise<any> {
  try {
    console.log('🧪 Testing form functionality (alternative method)...');
    
    const formTests = [
      { name: 'Customers', table: 'customers', requiredColumns: ['name', 'email'] },
      { name: 'Products', table: 'products', requiredColumns: ['name', 'price'] },
      { name: 'Invoices', table: 'invoices', requiredColumns: ['invoice_number', 'total_amount'] },
      { name: 'Quotations', table: 'quotations', requiredColumns: ['quotation_number', 'total_amount'] }
    ];

    const results = [];
    
    for (const test of formTests) {
      try {
        // Test table access
        const { data, error } = await supabase
          .from(test.table)
          .select('id')
          .limit(1);
        
        if (error) {
          results.push({
            form: test.name,
            table: test.table,
            accessible: false,
            status: 'FAIL',
            error: error.message,
            issue: 'table_access'
          });
          continue;
        }

        // Test required columns
        const columnIssues = [];
        for (const column of test.requiredColumns) {
          try {
            const { error: colError } = await supabase
              .from(test.table)
              .select(column)
              .limit(0);
            
            if (colError && colError.message.includes('column') && colError.message.includes('does not exist')) {
              columnIssues.push(column);
            }
          } catch (err: any) {
            columnIssues.push(column);
          }
        }

        results.push({
          form: test.name,
          table: test.table,
          accessible: true,
          status: columnIssues.length === 0 ? 'PASS' : 'PARTIAL',
          hasData: data && data.length > 0,
          missingColumns: columnIssues,
          issue: columnIssues.length > 0 ? 'missing_columns' : null
        });

      } catch (err: any) {
        results.push({
          form: test.name,
          table: test.table,
          accessible: false,
          status: 'FAIL',
          error: err.message,
          issue: 'connection_error'
        });
      }
    }

    return results;
  } catch (error: any) {
    return [{ error: error.message, status: 'ERROR' }];
  }
}

/**
 * Check if a specific table and column exists using direct query method
 */
export async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(tableName)
      .select(columnName)
      .limit(0);
    
    // If no error, column exists
    if (!error) return true;
    
    // Check if error is specifically about missing column
    return !(error.message.includes('column') && error.message.includes('does not exist'));
    
  } catch (err: any) {
    console.log(`Error checking ${tableName}.${columnName}:`, err.message);
    return false;
  }
}

/**
 * Get a list of accessible tables by trying common table names
 */
export async function getAccessibleTables(): Promise<string[]> {
  const commonTables = [
    'customers', 'products', 'invoices', 'quotations', 'payments',
    'invoice_items', 'quotation_items', 'companies', 'users',
    'lpos', 'lpo_items', 'delivery_notes', 'delivery_note_items',
    'credit_notes', 'credit_note_items', 'proforma', 'proforma_items'
  ];

  const accessibleTables = [];

  for (const tableName of commonTables) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('id')
        .limit(0);
      
      if (!error) {
        accessibleTables.push(tableName);
      }
    } catch (err: any) {
      // Table not accessible
    }
  }

  return accessibleTables;
}
