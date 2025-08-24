import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export interface OptimizedProduct {
  id: string;
  company_id: string;
  category_id?: string;
  product_code: string;
  name: string;
  description?: string;
  unit_of_measure?: string;
  cost_price?: number;
  selling_price: number;
  stock_quantity?: number;
  minimum_stock_level?: number;
  maximum_stock_level?: number;
  reorder_point?: number;
  is_active?: boolean;
  track_inventory?: boolean;
  created_at?: string;
  updated_at?: string;
  product_categories?: {
    name: string;
  } | null;
}

interface UseOptimizedProductsOptions {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  lowStockOnly?: boolean;
  categoryId?: string;
}

export const useOptimizedProducts = (
  companyId?: string, 
  options: UseOptimizedProductsOptions = {}
) => {
  const { 
    page = 1, 
    pageSize = 50, 
    searchTerm = '', 
    lowStockOnly = false,
    categoryId 
  } = options;

  return useQuery({
    queryKey: ['products-optimized', companyId, page, pageSize, searchTerm, lowStockOnly, categoryId],
    queryFn: async () => {
      console.log('🔍 Loading products with optimization...');
      const startTime = performance.now();

      // Start with base query
      let query = supabase
        .from('products')
        .select(`
          id,
          company_id,
          category_id,
          product_code,
          name,
          description,
          unit_of_measure,
          cost_price,
          selling_price,
          stock_quantity,
          minimum_stock_level,
          maximum_stock_level,
          reorder_point,
          is_active,
          track_inventory,
          created_at,
          updated_at,
          product_categories(name)
        `, { count: 'exact' });

      // Apply filters
      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,product_code.ilike.%${searchTerm}%`);
      }

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      if (lowStockOnly) {
        // Only show items where stock_quantity <= minimum_stock_level
        query = query.filter('stock_quantity', 'lte', 'minimum_stock_level');
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Order by created_at for consistent pagination
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Products query failed:', error);
        throw error;
      }

      const endTime = performance.now();
      console.log(`✅ Products loaded in ${(endTime - startTime).toFixed(2)}ms`);

      return {
        products: data || [],
        totalCount: count || 0,
        hasMore: count ? (page * pageSize) < count : false,
        currentPage: page
      };
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
    retry: 2
  });
};

// Hook for inventory statistics (separate query for better caching)
export const useInventoryStats = (companyId?: string) => {
  return useQuery({
    queryKey: ['inventory-stats', companyId],
    queryFn: async () => {
      console.log('📊 Loading inventory statistics...');
      
      let query = supabase
        .from('products')
        .select(`
          stock_quantity,
          minimum_stock_level,
          selling_price,
          cost_price
        `);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = (data || []).reduce((acc, product) => {
        const stockQty = product.stock_quantity || 0;
        const minStock = product.minimum_stock_level || 0;
        const sellingPrice = product.selling_price || 0;

        acc.totalItems++;
        acc.totalValue += stockQty * sellingPrice;

        if (stockQty === 0) {
          acc.outOfStock++;
        } else if (stockQty <= minStock) {
          acc.lowStock++;
        }

        return acc;
      }, {
        totalItems: 0,
        totalValue: 0,
        lowStock: 0,
        outOfStock: 0
      });

      return stats;
    },
    staleTime: 60000, // Cache stats for 1 minute
    refetchOnWindowFocus: false
  });
};

// Hook for product categories (for filters)
export const useProductCategories = (companyId?: string) => {
  return useQuery({
    queryKey: ['product-categories', companyId],
    queryFn: async () => {
      let query = supabase
        .from('product_categories')
        .select('id, name')
        .order('name');

      // Note: categories might not have company_id, adjust as needed
      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    staleTime: 300000, // Cache categories for 5 minutes
    refetchOnWindowFocus: false
  });
};

// Memoized helper for stock status
export const useStockStatus = (stockQuantity: number, minimumStock: number) => {
  return useMemo(() => {
    if (stockQuantity === 0) return 'out_of_stock';
    if (stockQuantity <= minimumStock) return 'low_stock';
    return 'in_stock';
  }, [stockQuantity, minimumStock]);
};

// Memoized currency formatter
export const useCurrencyFormatter = () => {
  return useMemo(() => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }, []);
};
