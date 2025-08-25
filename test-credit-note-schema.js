// Database Schema Verification Test for Credit Notes
// This script tests which credit note schema is actually deployed

import { supabase } from './src/integrations/supabase/client.js';

async function testCreditNoteSchema() {
  console.log('🔍 Testing Credit Note Database Schema...\n');

  try {
    // Test 1: Check if credit_notes table exists
    console.log('1. Testing credit_notes table...');
    const { data: creditNotes, error: creditNotesError } = await supabase
      .from('credit_notes')
      .select('id')
      .limit(1);
    
    if (creditNotesError) {
      console.log('❌ credit_notes table:', creditNotesError.message);
      return;
    } else {
      console.log('✅ credit_notes table exists');
    }

    // Test 2: Check credit_note_items table structure
    console.log('\n2. Testing credit_note_items table structure...');
    
    // Try to select all possible columns to see which exist
    const testColumns = [
      'id',
      'credit_note_id', 
      'product_id',
      'description',
      'quantity',
      'unit_price',
      'tax_percentage',  // Schema A
      'tax_rate',        // Schema B  
      'tax_amount',
      'tax_inclusive',   // Schema A only
      'tax_setting_id',  // Schema A only
      'line_total',
      'sort_order'
    ];

    const results = {};
    
    for (const column of testColumns) {
      try {
        const { error } = await supabase
          .from('credit_note_items')
          .select(column)
          .limit(1);
        
        if (error) {
          results[column] = '❌ Missing';
          console.log(`   ${column}: ❌ Missing (${error.message})`);
        } else {
          results[column] = '✅ Exists';
          console.log(`   ${column}: ✅ Exists`);
        }
      } catch (err) {
        results[column] = '❌ Error';
        console.log(`   ${column}: ❌ Error`);
      }
    }

    // Test 3: Determine which schema is deployed
    console.log('\n3. Schema Analysis:');
    
    const hasSchemaA = results.tax_percentage === '✅ Exists' && 
                       results.tax_inclusive === '✅ Exists' && 
                       results.tax_setting_id === '✅ Exists';
    
    const hasSchemaB = results.tax_rate === '✅ Exists' && 
                       results.tax_inclusive === '❌ Missing' && 
                       results.tax_setting_id === '❌ Missing';

    if (hasSchemaA) {
      console.log('✅ Schema A (Complete) is deployed - creditNoteMigration.sql');
      console.log('   ✅ My fixes are compatible and REQUIRED');
    } else if (hasSchemaB) {
      console.log('⚠️  Schema B (Incomplete) is deployed - comprehensiveMigration.ts');
      console.log('   ❌ My fixes will FAIL - database migration needed');
    } else {
      console.log('🤔 Custom/Mixed schema detected');
      console.log('   🔍 Manual review required');
    }

    // Test 4: Test basic insert capability
    console.log('\n4. Testing insert capability...');
    
    // Try to insert a test record to see what happens
    const testItem = {
      credit_note_id: '00000000-0000-0000-0000-000000000000', // Invalid but for structure test
      description: 'Test item',
      quantity: 1,
      unit_price: 100,
      line_total: 100,
      sort_order: 0
    };

    // Add optional fields if they exist
    if (results.tax_percentage === '✅ Exists') {
      testItem.tax_percentage = 0;
    }
    if (results.tax_rate === '✅ Exists') {
      testItem.tax_rate = 0;
    }
    if (results.tax_amount === '✅ Exists') {
      testItem.tax_amount = 0;
    }
    if (results.tax_inclusive === '✅ Exists') {
      testItem.tax_inclusive = false;
    }
    if (results.tax_setting_id === '✅ Exists') {
      testItem.tax_setting_id = null;
    }

    const { error: insertError } = await supabase
      .from('credit_note_items')
      .insert(testItem);

    if (insertError) {
      console.log('❌ Insert test failed:', insertError.message);
    } else {
      console.log('✅ Insert structure test passed (but will fail due to invalid credit_note_id)');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCreditNoteSchema().then(() => {
  console.log('\n🏁 Schema verification complete!');
}).catch(console.error);
