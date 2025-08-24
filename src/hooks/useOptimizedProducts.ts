import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useMemo } from 'react';

export interface ProductSearchResult {
  id: string;
  name: string;
  product_code: string;
  unit_of_measure: string;
  unit_price: number;
  stock_quantity: number;
  category_name?: string;
}

/**
 * Optimized hook for searching products with server-side filtering
 * Only loads products that match the search term, reducing client-side overhead
 */
export const useOptimizedProductSearch = (companyId?: string, enabled: boolean = true) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const query = useQuery({
    queryKey: ['products_search', companyId, debouncedSearchTerm],
    queryFn: async () => {
      if (!companyId) return [];

      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          product_code,
          unit_of_measure,
          unit_price,
          stock_quantity,
          product_categories (
            name
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true);

      // Add search filter if search term exists
      if (debouncedSearchTerm.trim()) {
        const searchPattern = `%${debouncedSearchTerm.trim()}%`;
        query = query.or(`name.ilike.${searchPattern},product_code.ilike.${searchPattern}`);
      }

      // Limit results for performance
      query = query.limit(50).order('name');

      const { data, error } = await query;

      if (error) {
        const errorMessage = error?.message || error?.details || JSON.stringify(error);
        console.error('Error searching products:', errorMessage);
        throw new Error(`Failed to search products: ${errorMessage}`);
      }

      // Transform data to include category name
      const transformedData: ProductSearchResult[] = (data || []).map(product => ({
        ...product,
        category_name: product.product_categories?.name
      }));

      return transformedData;
    },
    enabled: enabled && !!companyId,
    staleTime: 30000, // Cache for 30 seconds
  });

  return {
    ...query,
    searchTerm,
    setSearchTerm,
    isSearching: query.isFetching && debouncedSearchTerm.length > 0,
  };
};

/**
 * Optimized hook for loading popular/recent products without search
 * Loads a small set of frequently used products for quick access
 */
export const usePopularProducts = (companyId?: string, limit: number = 20) => {
  return useQuery({
    queryKey: ['popular_products', companyId, limit],
    queryFn: async () => {
      if (!companyId) return [];

      // Get products ordered by usage frequency or recent activity
      // For now, we'll order by stock_quantity desc and name asc as a simple heuristic
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          product_code,
          unit_of_measure,
          unit_price,
          stock_quantity,
          product_categories (
            name
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('stock_quantity', { ascending: false })
        .order('name')
        .limit(limit);

      if (error) {
        const errorMessage = error?.message || error?.details || JSON.stringify(error);
        console.error('Error fetching popular products:', errorMessage);
        throw new Error(`Failed to fetch popular products: ${errorMessage}`);
      }

      return (data || []).map(product => ({
        ...product,
        category_name: product.product_categories?.name
      })) as ProductSearchResult[];
    },
    enabled: !!companyId,
    staleTime: 60000, // Cache for 1 minute
  });
};

/**
 * Hook for getting a single product by ID efficiently
 */
export const useProductById = (productId?: string) => {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) return null;

      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          product_code,
          unit_of_measure,
          unit_price,
          stock_quantity,
          product_categories (
            name
          )
        `)
        .eq('id', productId)
        .single();

      if (error) {
        const errorMessage = error?.message || error?.details || JSON.stringify(error);
        console.error('Error fetching product:', errorMessage);
        throw new Error(`Failed to fetch product: ${errorMessage}`);
      }

      return {
        ...data,
        category_name: data.product_categories?.name
      } as ProductSearchResult;
    },
    enabled: !!productId,
    staleTime: 300000, // Cache for 5 minutes since individual products don't change often
  });
};

// Additional exports needed by OptimizedInventory component
export interface OptimizedProduct {
  id: string;
  name: string;
  product_code: string;
  unit_of_measure: string;
  unit_price: number;
  stock_quantity: number;
  minimum_stock_level?: number;
  selling_price?: number;
  category_name?: string;
  product_categories?: {
    name: string;
  };
}

// Currency formatter hook
export const useCurrencyFormatter = () => {
  return useMemo(() => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }, []);
};

// Stock status utility hook
export const useStockStatus = (stockQuantity: number, minimumStock: number) => {
  return useMemo(() => {
    if (stockQuantity <= 0) return 'out_of_stock';
    if (stockQuantity <= minimumStock) return 'low_stock';
    return 'in_stock';
  }, [stockQuantity, minimumStock]);
};

// Product categories hook
export const useProductCategories = (companyId?: string) => {
  return useQuery({
    queryKey: ['product_categories', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name');

      if (error) {
        const errorMessage = error?.message || error?.details || JSON.stringify(error);
        console.error('Error fetching categories:', errorMessage);
        throw new Error(`Failed to fetch categories: ${errorMessage}`);
      }

      return data || [];
    },
    enabled: !!companyId,
    staleTime: 300000, // Cache for 5 minutes
  });
};

// Optimized products hook (alias for useOptimizedProductSearch)
export const useOptimizedProducts = (companyId?: string, options?: any) => {
  const { data: searchResults } = useOptimizedProductSearch(companyId, true);
  const { data: popularProducts } = usePopularProducts(companyId, 50);

  // Return all products (search + popular) for the inventory page
  const allProducts = useMemo(() => {
    const products = searchResults || popularProducts || [];
    return {
      data: products,
      total: products.length,
      page: options?.page || 1,
      pageSize: options?.pageSize || 20
    };
  }, [searchResults, popularProducts, options]);

  return {
    data: allProducts,
    isLoading: false,
    error: null,
    refetch: () => {}
  };
};

// Inventory stats hook
export const useInventoryStats = (companyId?: string) => {
  return useQuery({
    queryKey: ['inventory_stats', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('products')
        .select('stock_quantity, minimum_stock_level, unit_price')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (error) {
        const errorMessage = error?.message || error?.details || JSON.stringify(error);
        console.error('Error fetching inventory stats:', errorMessage);
        throw new Error(`Failed to fetch inventory stats: ${errorMessage}`);
      }

      const stats = {
        totalItems: data.length,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalValue: 0
      };

      data.forEach(product => {
        const stock = product.stock_quantity || 0;
        const minStock = product.minimum_stock_level || 0;
        const price = product.unit_price || 0;

        if (stock <= 0) stats.outOfStockItems++;
        else if (stock <= minStock) stats.lowStockItems++;

        stats.totalValue += stock * price;
      });

      return stats;
    },
    enabled: !!companyId,
    staleTime: 60000, // Cache for 1 minute
  });
};
