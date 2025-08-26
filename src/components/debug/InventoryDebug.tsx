import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProducts } from '@/hooks/useDatabase';
import { Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function InventoryDebug() {
  const { data: products, isLoading, error } = useProducts();

  const lowStockItems = products?.filter(product => 
    product.stock_quantity !== null && product.stock_quantity < 10
  ) || [];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Inventory Debug
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span>Total Products:</span>
              <Badge variant="outline">
                {isLoading ? 'Loading...' : products?.length || 0}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span>Low Stock Items:</span>
              <Badge variant={lowStockItems.length > 0 ? 'destructive' : 'default'}>
                {lowStockItems.length}
              </Badge>
            </div>
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>Error loading inventory: {error.message}</span>
            </div>
          )}
          
          {!error && !isLoading && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Inventory data loaded successfully</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
