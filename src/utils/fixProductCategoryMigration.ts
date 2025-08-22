import { supabase } from '@/integrations/supabase/client';

export const runProductCategoryMigration = async () => {
  console.log('🚀 Starting product category migration...');
  
  try {
    // Step 1: Check if product_categories table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'product_categories');

    if (tablesError) {
      console.error('Error checking tables:', JSON.stringify(tablesError, null, 2));
      console.error('Tables error details:', tablesError.message || tablesError);
    }

    const productCategoriesExists = tables && tables.length > 0;
    console.log('product_categories table exists:', productCategoriesExists);

    // Step 2: Create product_categories table if it doesn't exist
    if (!productCategoriesExists) {
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

      const { error: createError } = await supabase.rpc('exec_sql', {
        sql_query: createTableSQL
      });

      if (createError) {
        console.error('Error creating product_categories table:', JSON.stringify(createError, null, 2));
        console.error('Create error details:', createError.message || createError);
        throw new Error(`Failed to create product_categories table: ${createError.message || JSON.stringify(createError)}`);
      }
      
      console.log('✅ product_categories table created successfully');
    }

    // Step 3: Check if companies exist to get company_id for categories
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      throw companiesError;
    }

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
        throw companyError;
      }

      companies[0] = newCompany;
    }

    const companyId = companies[0].id;
    console.log('Using company ID:', companyId);

    // Step 4: Check if default categories exist
    const { data: existingCategories, error: categoriesError } = await supabase
      .from('product_categories')
      .select('name')
      .eq('company_id', companyId);

    if (categoriesError) {
      console.error('Error checking existing categories:', categoriesError);
    }

    const existingCategoryNames = existingCategories?.map(cat => cat.name.toLowerCase()) || [];

    // Step 5: Insert default categories if they don't exist
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
        throw insertError;
      }

      console.log('✅ Default categories inserted successfully');
    }

    // Step 6: Check products table structure
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'products');

    if (columnsError) {
      console.error('Error checking products table columns:', columnsError);
    }

    const columnNames = columns?.map(col => col.column_name) || [];
    const hasCategoryId = columnNames.includes('category_id');
    const hasCategory = columnNames.includes('category');

    console.log('Products table columns:', columnNames);
    console.log('Has category_id:', hasCategoryId);
    console.log('Has category (text):', hasCategory);

    // Step 7: Migrate existing products if they have text category field
    if (hasCategory && !hasCategoryId) {
      console.log('Migrating products from text category to category_id...');
      
      // Add category_id column
      const addColumnSQL = `
        ALTER TABLE products 
        ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id);
      `;

      const { error: addColumnError } = await supabase.rpc('exec_sql', {
        sql_query: addColumnSQL
      });

      if (addColumnError) {
        console.error('Error adding category_id column:', addColumnError);
        throw addColumnError;
      }

      // Migrate existing products with text categories
      const { data: productsWithCategories, error: productsError } = await supabase
        .from('products')
        .select('id, category')
        .not('category', 'is', null)
        .neq('category', '');

      if (productsError) {
        console.error('Error fetching products with categories:', productsError);
      }

      if (productsWithCategories && productsWithCategories.length > 0) {
        console.log(`Found ${productsWithCategories.length} products with text categories to migrate`);

        // Get all categories for mapping
        const { data: allCategories, error: allCategoriesError } = await supabase
          .from('product_categories')
          .select('id, name')
          .eq('company_id', companyId);

        if (allCategoriesError) {
          console.error('Error fetching categories for mapping:', allCategoriesError);
          throw allCategoriesError;
        }

        const categoryMap = new Map(
          allCategories?.map(cat => [cat.name.toLowerCase(), cat.id]) || []
        );

        // Update products with category_id
        for (const product of productsWithCategories) {
          if (product.category) {
            const categoryId = categoryMap.get(product.category.toLowerCase()) || 
                              categoryMap.get('other'); // Fallback to 'Other' category

            if (categoryId) {
              const { error: updateError } = await supabase
                .from('products')
                .update({ category_id: categoryId })
                .eq('id', product.id);

              if (updateError) {
                console.error(`Error updating product ${product.id}:`, updateError);
              }
            }
          }
        }

        console.log('✅ Products migrated to use category_id');
      }

      // Optional: Remove old category column (commented out for safety)
      // const dropColumnSQL = `ALTER TABLE products DROP COLUMN IF EXISTS category;`;
      // await supabase.rpc('exec_sql', { sql_query: dropColumnSQL });
    }

    // Step 8: Ensure category_id column exists even if no migration was needed
    if (!hasCategoryId) {
      console.log('Adding category_id column to products table...');
      
      const addColumnSQL = `
        ALTER TABLE products 
        ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id);
      `;

      const { error: addColumnError } = await supabase.rpc('exec_sql', {
        sql_query: addColumnSQL
      });

      if (addColumnError) {
        console.error('Error adding category_id column:', addColumnError);
        throw addColumnError;
      }

      console.log('✅ category_id column added to products table');
    }

    console.log('🎉 Product category migration completed successfully!');
    
    return {
      success: true,
      message: 'Product category migration completed successfully!',
      details: {
        productCategoriesTableCreated: !productCategoriesExists,
        categoriesInserted: categoriesToInsert.length,
        hasTextCategory: hasCategory,
        hasCategoryId: hasCategoryId,
        companyId: companyId
      }
    };

  } catch (error) {
    console.error('❌ Product category migration failed:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));

    let errorMessage = 'Migration failed';
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
