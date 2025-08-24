import { supabase } from '@/integrations/supabase/client';

export const defaultCategories = [
  {
    name: 'Electronics',
    description: 'Electronic devices and components'
  },
  {
    name: 'Tools',
    description: 'Tools and equipment'
  },
  {
    name: 'Components',
    description: 'Spare parts and components'
  },
  {
    name: 'Accessories',
    description: 'Accessories and add-ons'
  },
  {
    name: 'Consumables',
    description: 'Consumable items'
  },
  {
    name: 'Other',
    description: 'Miscellaneous items'
  }
];

export async function createDefaultCategories(companyId: string) {
  try {
    // Check if categories already exist
    const { data: existingCategories, error: checkError } = await supabase
      .from('product_categories')
      .select('name')
      .eq('company_id', companyId);

    if (checkError) throw checkError;

    if (existingCategories && existingCategories.length > 0) {
      return {
        success: false,
        message: 'Categories already exist for this company',
        existing: existingCategories.length
      };
    }

    // Create default categories
    const categoriesToCreate = defaultCategories.map(category => ({
      company_id: companyId,
      name: category.name,
      description: category.description,
      is_active: true
    }));

    const { data, error } = await supabase
      .from('product_categories')
      .insert(categoriesToCreate)
      .select();

    if (error) throw error;

    return {
      success: true,
      message: `Created ${data.length} default categories`,
      categories: data
    };
  } catch (error) {
    console.error('Error creating default categories:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      error
    };
  }
}
