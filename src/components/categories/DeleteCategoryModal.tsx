import { useState } from 'react';
import { useDeleteProductCategory, useProducts } from '@/hooks/useDatabase';
import { useCurrentCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Trash2,
  AlertTriangle,
  Package,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

interface DeleteCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  category: Category | null;
}

export function DeleteCategoryModal({ open, onOpenChange, onSuccess, category }: DeleteCategoryModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const deleteCategory = useDeleteProductCategory();
  const { currentCompany } = useCurrentCompany();
  
  // Check if there are products using this category
  const { data: products } = useProducts(currentCompany?.id);
  const productsUsingCategory = products?.filter(product => product.category_id === category?.id) || [];

  const handleDelete = async () => {
    if (!category?.id) return;

    if (!currentCompany?.id) {
      toast.error('Company not found. Please refresh and try again.');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCategory.mutateAsync(category.id);

      toast.success(`Category "${category.name}" deleted successfully!`);
      onSuccess();
    } catch (error) {
      console.error('Error deleting category:', error);

      let errorMessage = 'Failed to delete category. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        const supabaseError = error as any;
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        } else if (supabaseError.details) {
          errorMessage = supabaseError.details;
        } else if (supabaseError.code) {
          errorMessage = `Database error (${supabaseError.code}): ${supabaseError.hint || 'Unknown error'}`;
        } else {
          errorMessage = `Error: ${JSON.stringify(error)}`;
        }
      }

      toast.error(`Error deleting category: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!category) return null;

  const hasProducts = productsUsingCategory.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <span>Delete Category</span>
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this category?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category Info */}
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="pt-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">
                    Deleting: {category.name}
                  </p>
                  {category.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products Warning */}
          {hasProducts ? (
            <Card className="border-warning/20 bg-warning/5">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-3">
                  <Package className="h-5 w-5 text-warning mt-0.5" />
                  <div>
                    <p className="font-medium text-warning">
                      {productsUsingCategory.length} product{productsUsingCategory.length !== 1 ? 's' : ''} using this category
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      These products will have their category removed. You can reassign them to other categories later.
                    </p>
                    <div className="mt-2 space-y-1">
                      {productsUsingCategory.slice(0, 3).map(product => (
                        <div key={product.id} className="text-xs text-muted-foreground">
                          • {product.name}
                        </div>
                      ))}
                      {productsUsingCategory.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          ... and {productsUsingCategory.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">
                      Safe to delete
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      No products are currently assigned to this category.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Soft Delete Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium">About deletion</p>
                  <p className="mt-1">
                    This category will be marked as inactive and hidden from new product forms. 
                    Historical data will be preserved.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleDelete} 
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? 'Deleting...' : 'Delete Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
