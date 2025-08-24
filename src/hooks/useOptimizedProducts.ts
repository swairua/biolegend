import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

export interface ProductSearchResult {
  id: string;
  name: string;
  product_code: string;
  unit_of_measure: string;
  unit_price: number;
  current_stock: number;
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
          current_stock,
          categories (
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
        console.error('Error searching products:', error);
        throw error;
      }

      // Transform data to include category name
      const transformedData: ProductSearchResult[] = (data || []).map(product => ({
        ...product,
        category_name: product.categories?.name
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
      // For now, we'll order by current_stock desc and name asc as a simple heuristic
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          product_code,
          unit_of_measure,
          unit_price,
          current_stock,
          categories (
            name
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('current_stock', { ascending: false })
        .order('name')
        .limit(limit);

      if (error) {
        console.error('Error fetching popular products:', error);
        throw error;
      }

      return (data || []).map(product => ({
        ...product,
        category_name: product.categories?.name
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
          current_stock,
          categories (
            name
          )
        `)
        .eq('id', productId)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        throw error;
      }

      return {
        ...data,
        category_name: data.categories?.name
      } as ProductSearchResult;
    },
    enabled: !!productId,
    staleTime: 300000, // Cache for 5 minutes since individual products don't change often
  });
};
