import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
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
import { Tag, Plus, Palette, Hash, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

interface CreateCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (categoryId: string) => void;
}

interface CategoryData {
  name: string;
  description: string;
  parent_id: string;
  category_code: string;
  color: string;
  sort_order: number;
}

export function CreateCategoryModal({ open, onOpenChange, onSuccess }: CreateCategoryModalProps) {
  const [formData, setFormData] = useState<CategoryData>({
    name: '',
    description: '',
    parent_id: '',
    category_code: '',
    color: '#3B82F6', // Default blue color
    sort_order: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentCompany } = useCurrentCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch existing categories for parent selection
  const { data: categories } = useQuery({
    queryKey: ['product_categories', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, parent_id')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id && open,
  });

  // Auto-generate category code when name changes
  useEffect(() => {
    if (formData.name && !formData.category_code) {
      const code = formData.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 6) + '-' + Date.now().toString().slice(-4);
      setFormData(prev => ({ ...prev, category_code: code }));
    }
  }, [formData.name, formData.category_code]);

  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: CategoryData) => {
      if (!currentCompany?.id) {
        throw new Error('Company not found. Please refresh and try again.');
      }

      // Get next sort order
      const { data: maxSortData } = await supabase
        .from('product_categories')
        .select('sort_order')
        .eq('company_id', currentCompany.id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

      const nextSortOrder = (maxSortData?.sort_order || 0) + 10;

      const { data, error } = await supabase
        .from('product_categories')
        .insert({
          company_id: currentCompany.id,
          name: categoryData.name.trim(),
          description: categoryData.description.trim() || null,
          parent_id: categoryData.parent_id || null,
          category_code: categoryData.category_code.trim() || null,
          color: categoryData.color || null,
          sort_order: categoryData.sort_order || nextSortOrder,
          created_by: user?.id,
          updated_by: user?.id,
          is_active: true
        })
        .select('id, name, description, category_code, color')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product_categories'] });
      toast.success(`Category "${data.name}" created successfully!`);
      onSuccess?.(data.id);
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
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
        } else if (supabaseError.code === '23505') {
          errorMessage = 'A category with this name already exists.';
        }
      }
      
      toast.error(`Error creating category: ${errorMessage}`);
    }
  });

  const handleInputChange = (field: keyof CategoryData, value: string) => {
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

    if (formData.name.trim().length < 2) {
      toast.error('Category name must be at least 2 characters long');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCategoryMutation.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parent_id: '',
      category_code: '',
      color: '#3B82F6',
      sort_order: 0
    });
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Tag className="h-5 w-5 text-primary" />
            <span>Create New Category</span>
          </DialogTitle>
          <DialogDescription>
            Add a new product category to organize your inventory
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Category Name *</Label>
            <Input
              id="category-name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Medical Equipment"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-description">Description</Label>
            <Textarea
              id="category-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Optional description for this category"
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {formData.description.length}/500
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !formData.name.trim() || formData.name.trim().length < 2}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Creating...' : 'Create Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
