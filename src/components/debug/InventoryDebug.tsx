import { useCompanies, useProducts } from '@/hooks/useDatabase';
import { useOptimizedProductSearch, usePopularProducts } from '@/hooks/useOptimizedProducts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function InventoryDebug() {
  const [debugOpen, setDebugOpen] = useState(false);
  
  // Test all the hooks that should be providing products
  const { data: companies, isLoading: companiesLoading, error: companiesError } = useCompanies();
  const currentCompany = companies?.[0];
  
  const { data: products, isLoading: productsLoading, error: productsError } = useProducts(currentCompany?.id);
  
  const { 
    data: searchedProducts, 
    isLoading: searchLoading, 
    error: searchError,
    searchTerm,
    setSearchTerm
  } = useOptimizedProductSearch(currentCompany?.id, true);
  
  const { data: popularProducts, isLoading: popularLoading, error: popularError } = usePopularProducts(currentCompany?.id, 10);

  if (!debugOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button onClick={() => setDebugOpen(true)} variant="outline" size="sm">
          🐛 Debug Inventory
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-auto">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex justify-between">
            Inventory Debug Info
            <Button onClick={() => setDebugOpen(false)} variant="ghost" size="sm">✕</Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {/* Companies Debug */}
          <div>
            <strong>Companies:</strong>
            <div className="ml-2">
              {companiesLoading && <Badge variant="secondary">Loading...</Badge>}
              {companiesError && <Badge variant="destructive">Error: {companiesError.message}</Badge>}
              {companies && (
                <div>
                  <div>Count: {companies.length}</div>
                  <div>Current: {currentCompany?.name || 'None'}</div>
                  <div>ID: {currentCompany?.id || 'None'}</div>
                </div>
              )}
            </div>
          </div>

          {/* Products Debug */}
          <div>
            <strong>Products (useProducts):</strong>
            <div className="ml-2">
              {productsLoading && <Badge variant="secondary">Loading...</Badge>}
              {productsError && <Badge variant="destructive">Error: {productsError.message}</Badge>}
              {products && (
                <div>
                  <div>Count: {products.length}</div>
                  {products.length > 0 && (
                    <div>
                      <div>Sample: {products[0]?.name}</div>
                      <div>Price: {products[0]?.selling_price || products[0]?.unit_price}</div>
                      <div>Stock: {products[0]?.stock_quantity}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search Products Debug */}
          <div>
            <strong>Search Products:</strong>
            <div className="ml-2">
              {searchLoading && <Badge variant="secondary">Loading...</Badge>}
              {searchError && <Badge variant="destructive">Error: {searchError.message}</Badge>}
              <div>Search term: "{searchTerm}"</div>
              {searchedProducts && (
                <div>
                  <div>Count: {searchedProducts.length}</div>
                  {searchedProducts.length > 0 && (
                    <div>
                      <div>Sample: {searchedProducts[0]?.name}</div>
                      <div>Price: {searchedProducts[0]?.selling_price}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Popular Products Debug */}
          <div>
            <strong>Popular Products:</strong>
            <div className="ml-2">
              {popularLoading && <Badge variant="secondary">Loading...</Badge>}
              {popularError && <Badge variant="destructive">Error: {popularError.message}</Badge>}
              {popularProducts && (
                <div>
                  <div>Count: {popularProducts.length}</div>
                  {popularProducts.length > 0 && (
                    <div>
                      <div>Sample: {popularProducts[0]?.name}</div>
                      <div>Price: {popularProducts[0]?.selling_price}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Test Search */}
          <div>
            <strong>Test Search:</strong>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type to search..."
              className="w-full px-2 py-1 border rounded text-xs"
            />
          </div>

          {/* Quick Actions */}
          <div className="space-y-1">
            <Button 
              onClick={() => console.log('Companies:', companies)} 
              variant="outline" 
              size="sm" 
              className="w-full text-xs"
            >
              Log Companies
            </Button>
            <Button 
              onClick={() => console.log('Products:', products)} 
              variant="outline" 
              size="sm" 
              className="w-full text-xs"
            >
              Log Products
            </Button>
            <Button 
              onClick={() => console.log('Popular Products:', popularProducts)} 
              variant="outline" 
              size="sm" 
              className="w-full text-xs"
            >
              Log Popular Products
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
