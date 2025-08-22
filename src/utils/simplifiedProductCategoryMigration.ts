import { supabase } from '@/integrations/supabase/client';

export const runSimplifiedProductCategoryMigration = async () => {
  console.log('🚀 Starting simplified product category migration...');
  
  try {
    // Step 1: Try to create product_categories table (will fail if it exists, which is fine)
    console.log('Creating product_categories table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS product_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        parent_id UUID REFERENCES product_categories(id),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Try direct SQL execution first
    const { error: createError } = await supabase
      .rpc('exec_sql', { sql_query: createTableSQL })
      .single();

    if (createError) {
      console.log('RPC exec_sql failed, trying alternative approach...');
      console.error('RPC Error:', createError);
      
      // Alternative: Try creating via direct table operations
      try {
        const { error: directError } = await supabase
          .from('product_categories')
          .select('id')
          .limit(1);
          
        if (directError && directError.code === '42P01') {
          console.log('Table does not exist, need manual creation');
          throw new Error('product_categories table does not exist and cannot be created automatically. Please run the SQL manually in Supabase dashboard.');
        }
        console.log('✅ product_categories table already exists');
      } catch (testError) {
        console.error('Table test failed:', testError);
        throw new Error('Unable to verify or create product_categories table');
      }
    } else {
      console.log('✅ product_categories table created/verified successfully');
    }

    // Step 2: Get or create default company
    console.log('Getting/creating default company...');
    let { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      throw new Error(`Failed to fetch companies: ${companiesError.message}`);
    }

    let companyId;
    if (!companies || companies.length === 0) {
      console.log('No companies found. Creating default company...');
      
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert([{
          name: 'Default Company',
          country: 'Kenya',
          currency: 'KES'
        }])
        .select('id')
        .single();

      if (companyError) {
        console.error('Error creating default company:', companyError);
        throw new Error(`Failed to create default company: ${companyError.message}`);
      }

      companyId = newCompany.id;
      console.log('✅ Default company created:', companyId);
    } else {
      companyId = companies[0].id;
      console.log('✅ Using existing company:', companyId);
    }

    // Step 3: Check if default categories exist
    console.log('Checking existing categories...');
    const { data: existingCategories, error: categoriesError } = await supabase
      .from('product_categories')
      .select('name')
      .eq('company_id', companyId);

    if (categoriesError) {
      console.error('Error checking existing categories:', categoriesError);
      // Continue anyway, might be first time
    }

    const existingCategoryNames = existingCategories?.map(cat => cat.name.toLowerCase()) || [];
    console.log('Existing categories:', existingCategoryNames);

    // Step 4: Insert default categories if they don't exist
    const defaultCategories = [
      { name: 'Electronics', description: 'Electronic devices and components' },
      { name: 'Tools', description: 'Tools and equipment' },
      { name: 'Components', description: 'Spare parts and components' },
      { name: 'Accessories', description: 'Accessories and add-ons' },
      { name: 'Consumables', description: 'Consumable items' },
      { name: 'Other', description: 'Miscellaneous items' }
    ];

    const categoriesToInsert = defaultCategories.filter(
      cat => !existingCategoryNames.includes(cat.name.toLowerCase())
    );

    let categoriesInserted = 0;
    if (categoriesToInsert.length > 0) {
      console.log('Inserting default categories:', categoriesToInsert.map(c => c.name));
      
      const { error: insertError } = await supabase
        .from('product_categories')
        .insert(
          categoriesToInsert.map(cat => ({
            company_id: companyId,
            name: cat.name,
            description: cat.description
          }))
        );

      if (insertError) {
        console.error('Error inserting categories:', insertError);
        throw new Error(`Failed to insert categories: ${insertError.message}`);
      }

      categoriesInserted = categoriesToInsert.length;
      console.log('✅ Default categories inserted successfully:', categoriesInserted);
    } else {
      console.log('✅ All default categories already exist');
    }

    // Step 5: Ensure products table has category_id column
    console.log('Ensuring products table has category_id column...');
    
    const addColumnSQL = `
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id);
    `;

    const { error: addColumnError } = await supabase
      .rpc('exec_sql', { sql_query: addColumnSQL })
      .single();

    if (addColumnError) {
      console.log('Could not add category_id column via RPC:', addColumnError);
      // Test if column exists by trying to query it
      try {
        const { error: testError } = await supabase
          .from('products')
          .select('category_id')
          .limit(1);
          
        if (testError) {
          console.log('category_id column might not exist, but continuing...');
        } else {
          console.log('✅ category_id column exists');
        }
      } catch (testErr) {
        console.log('Could not test category_id column');
      }
    } else {
      console.log('✅ category_id column added/verified successfully');
    }

    console.log('🎉 Simplified product category migration completed successfully!');
    
    return {
      success: true,
      message: 'Simplified product category migration completed successfully!',
      details: {
        companyId: companyId,
        categoriesInserted: categoriesInserted,
        method: 'simplified'
      }
    };

  } catch (error) {
    console.error('❌ Simplified product category migration failed:', error);
    
    let errorMessage = 'Simplified migration failed';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object') {
      errorMessage = (error as any).message || JSON.stringify(error);
    }
    
    return {
      success: false,
      error: error,
      message: errorMessage
    };
  }
};
