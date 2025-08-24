import { useState } from 'react';
import { useCreateProductCategory, useProductCategories } from '@/hooks/useDatabase';
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
  FolderPlus,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface CreateCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCategoryModal({ open, onOpenChange, onSuccess }: CreateCategoryModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createCategory = useCreateProductCategory();
  const { currentCompany } = useCurrentCompany();
  
  // Fetch existing categories for parent selection
  const { data: categories } = useProductCategories(currentCompany?.id);
  const mainCategories = categories?.filter(cat => !cat.parent_id) || [];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    if (!currentCompany?.id) {
      toast.error('Company not found. Please refresh and try again.');
      return;
    }

    // Check for duplicate category names
    const isDuplicate = categories?.some(
      cat => cat.name.toLowerCase() === formData.name.trim().toLowerCase()
    );
    
    if (isDuplicate) {
      toast.error('A category with this name already exists');
      return;
    }

    setIsSubmitting(true);
    try {
      const newCategory = {
        company_id: currentCompany.id,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        parent_id: formData.parent_id || undefined,
        is_active: true
      };

      await createCategory.mutateAsync(newCategory);

      toast.success(`Category "${formData.name}" created successfully!`);
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating category:', error);

      let errorMessage = 'Failed to create category. Please try again.';
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

      toast.error(`Error creating category: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parent_id: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Tag className="h-5 w-5 text-primary" />
            <span>Create New Category</span>
          </DialogTitle>
          <DialogDescription>
            Add a new product category to organize your inventory
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Categories help organize your products</p>
                  <p className="mt-1">You can create main categories or subcategories under existing categories.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <FolderPlus className="h-4 w-4" />
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
                <p className="text-xs text-muted-foreground">
                  Choose a clear, descriptive name for your category
                </p>
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
                <p className="text-xs text-muted-foreground">
                  Optional: Help others understand what products belong in this category
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent_category">Parent Category (Optional)</Label>
                <Select value={formData.parent_id} onValueChange={(value) => handleInputChange('parent_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category or leave blank for main category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Main Category)</SelectItem>
                    {mainCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Create a subcategory by selecting a parent, or leave blank for a main category
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {formData.name && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {formData.parent_id && mainCategories.find(c => c.id === formData.parent_id) && (
                      <span className="text-muted-foreground">
                        {mainCategories.find(c => c.id === formData.parent_id)?.name} / 
                      </span>
                    )}
                    <span className="text-primary"> {formData.name}</span>
                  </span>
                </div>
                {formData.description && (
                  <p className="text-sm text-muted-foreground mt-2">{formData.description}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !formData.name.trim()}
          >
            <Tag className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Creating...' : 'Create Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
