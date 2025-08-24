import { useState, useEffect } from 'react';
import { useUpdateProductCategory, useProductCategories } from '@/hooks/useDatabase';
import { useCurrentCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Tag,
  Edit,
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

interface EditCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  category: Category | null;
}

export function EditCategoryModal({ open, onOpenChange, onSuccess, category }: EditCategoryModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: '',
    is_active: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const updateCategory = useUpdateProductCategory();
  const { currentCompany } = useCurrentCompany();
  
  // Fetch existing categories for parent selection
  const { data: categories } = useProductCategories(currentCompany?.id);
  // Exclude current category and its children from parent options
  const availableParents = categories?.filter(cat => 
    !cat.parent_id && 
    cat.id !== category?.id && 
    cat.id !== category?.parent_id
  ) || [];

  // Populate form when category changes
  useEffect(() => {
    if (category && open) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        parent_id: category.parent_id || '',
        is_active: category.is_active ?? true
      });
    }
  }, [category, open]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!category?.id) return;

    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    if (!currentCompany?.id) {
      toast.error('Company not found. Please refresh and try again.');
      return;
    }

    // Check for duplicate category names (excluding current category)
    const isDuplicate = categories?.some(
      cat => cat.id !== category.id && cat.name.toLowerCase() === formData.name.trim().toLowerCase()
    );
    
    if (isDuplicate) {
      toast.error('A category with this name already exists');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedCategory = {
        id: category.id,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        parent_id: formData.parent_id || undefined,
        is_active: formData.is_active
      };

      await updateCategory.mutateAsync(updatedCategory);

      toast.success(`Category "${formData.name}" updated successfully!`);
      onSuccess();
    } catch (error) {
      console.error('Error updating category:', error);

      let errorMessage = 'Failed to update category. Please try again.';
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

      toast.error(`Error updating category: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="h-5 w-5 text-primary" />
            <span>Edit Category</span>
          </DialogTitle>
          <DialogDescription>
            Update the category information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Editing: {category.name}</p>
                  <p className="mt-1">Changes will affect all products assigned to this category.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Tag className="h-4 w-4" />
                <span>Category Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter category name"
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  placeholder="Describe what products belong in this category..."
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent_category">Parent Category</Label>
                <Select value={formData.parent_id} onValueChange={(value) => handleInputChange('parent_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category or leave blank for main category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Main Category)</SelectItem>
                    {availableParents.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.is_active ? 'active' : 'inactive'} 
                  onValueChange={(value) => handleInputChange('is_active', value === 'active')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Inactive categories won't appear in product creation forms
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {formData.parent_id && availableParents.find(c => c.id === formData.parent_id) && (
                    <span className="text-muted-foreground">
                      {availableParents.find(c => c.id === formData.parent_id)?.name} / 
                    </span>
                  )}
                  <span className="text-primary"> {formData.name}</span>
                </span>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  formData.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {formData.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
              {formData.description && (
                <p className="text-sm text-muted-foreground mt-2">{formData.description}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !formData.name.trim()}
          >
            <Edit className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Updating...' : 'Update Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
