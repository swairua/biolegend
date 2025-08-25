import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCompanies } from '@/hooks/useDatabase';

export function TestDataCreator() {
  const [isCreating, setIsCreating] = useState(false);
  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];

  const createTestProducts = async () => {
    if (!currentCompany?.id) {
      toast.error('No company found. Please ensure you have a company set up.');
      return;
    }

    setIsCreating(true);
    try {
      // First, create a test category
      const { data: category, error: categoryError } = await supabase
        .from('product_categories')
        .upsert({
          company_id: currentCompany.id,
          name: 'Test Category',
          is_active: true
        }, { onConflict: 'company_id,name' })
        .select()
        .single();

      if (categoryError) {
        console.error('Category creation error:', categoryError);
        toast.warning('Could not create category, continuing with products...');
      }

      // Create test products
      const testProducts = [
        {
          company_id: currentCompany.id,
          name: 'Test Product 1',
          product_code: 'TEST001',
          description: 'A test product for debugging',
          unit_of_measure: 'pieces',
          cost_price: 50,
          selling_price: 100,
          unit_price: 100, // For compatibility
          stock_quantity: 25,
          minimum_stock_level: 5,
          category_id: category?.id || null,
          is_active: true
        },
        {
          company_id: currentCompany.id,
          name: 'Test Product 2',
          product_code: 'TEST002',
          description: 'Another test product',
          unit_of_measure: 'boxes',
          cost_price: 30,
          selling_price: 75,
          unit_price: 75, // For compatibility
          stock_quantity: 10,
          minimum_stock_level: 2,
          category_id: category?.id || null,
          is_active: true
        },
        {
          company_id: currentCompany.id,
          name: 'Test Product 3',
          product_code: 'TEST003',
          description: 'Third test product',
          unit_of_measure: 'units',
          cost_price: 20,
          selling_price: 50,
          unit_price: 50, // For compatibility
          stock_quantity: 0, // Out of stock test
          minimum_stock_level: 3,
          category_id: category?.id || null,
          is_active: true
        }
      ];

      const { data: products, error: productsError } = await supabase
        .from('products')
        .upsert(testProducts, { onConflict: 'company_id,product_code' })
        .select();

      if (productsError) {
        throw productsError;
      }

      toast.success(`Created ${products?.length || 0} test products successfully!`);
      
    } catch (error) {
      console.error('Error creating test data:', error);
      toast.error(`Failed to create test data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteTestProducts = async () => {
    if (!currentCompany?.id) {
      toast.error('No company found.');
      return;
    }

    setIsCreating(true);
    try {
      // Delete test products
      const { error: productsError } = await supabase
        .from('products')
        .delete()
        .eq('company_id', currentCompany.id)
        .like('product_code', 'TEST%');

      if (productsError) {
        throw productsError;
      }

      // Delete test category
      const { error: categoryError } = await supabase
        .from('product_categories')
        .delete()
        .eq('company_id', currentCompany.id)
        .eq('name', 'Test Category');

      if (categoryError) {
        console.warn('Could not delete test category:', categoryError);
      }

      toast.success('Test data deleted successfully!');
      
    } catch (error) {
      console.error('Error deleting test data:', error);
      toast.error(`Failed to delete test data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  if (!currentCompany) {
    return null;
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="text-sm">Test Data Creator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          Company: {currentCompany.name}
        </div>
        
        <div className="space-y-2">
          <Button
            onClick={createTestProducts}
            disabled={isCreating}
            size="sm"
            className="w-full"
          >
            {isCreating ? 'Creating...' : 'Create Test Products'}
          </Button>
          
          <Button
            onClick={deleteTestProducts}
            disabled={isCreating}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {isCreating ? 'Deleting...' : 'Delete Test Products'}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          This will create/delete 3 test products with different stock levels for debugging.
        </div>
      </CardContent>
    </Card>
  );
}
