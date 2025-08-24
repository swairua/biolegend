import { useState } from 'react';
import { useProductCategories, useCompanies } from '@/hooks/useDatabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Edit,
  Trash2,
  Tag,
  FolderOpen,
  AlertTriangle
} from 'lucide-react';
import { CreateCategoryModal } from '@/components/categories/CreateCategoryModal';
import { EditCategoryModal } from '@/components/categories/EditCategoryModal';
import { DeleteCategoryModal } from '@/components/categories/DeleteCategoryModal';
import { DefaultCategoriesButton } from '@/components/categories/DefaultCategoriesButton';

interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export default function Categories() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Fetch categories from database
  const { data: companies } = useCompanies();
  const currentCompany = companies?.[0];
  const { data: categories, isLoading: loadingCategories, error: categoriesError } = useProductCategories(currentCompany?.id);

  const handleCreateCategory = () => {
    setShowCreateModal(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setShowEditModal(true);
  };

  const handleDeleteCategory = (category: Category) => {
    setSelectedCategory(category);
    setShowDeleteModal(true);
  };

  const handleModalSuccess = () => {
    // Data will be automatically refreshed due to React Query invalidation
    toast.success('Operation completed successfully!');
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedCategory(null);
    toast.success('Category updated successfully!');
  };

  const handleDeleteSuccess = () => {
    setShowDeleteModal(false);
    setSelectedCategory(null);
    toast.success('Category deleted successfully!');
  };

  // Filter categories based on search term
  const filteredCategories = categories?.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  // Handle loading and error states
  if (loadingCategories) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Product Categories</h1>
            <p className="text-muted-foreground">Loading categories...</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Loading categories...</p>
          </div>
        </div>
      </div>
    );
  }

  if (categoriesError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Product Categories</h1>
            <p className="text-muted-foreground">Error loading categories</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">Failed to load categories</p>
            <p className="text-muted-foreground text-sm">{categoriesError.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Product Categories</h1>
          <p className="text-muted-foreground">
            Organize your inventory with product categories
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button className="gradient-primary text-primary-foreground hover:opacity-90 shadow-card" size="lg" onClick={handleCreateCategory}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Tag className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Categories</p>
                <p className="text-2xl font-bold text-primary">{filteredCategories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <FolderOpen className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Categories</p>
                <p className="text-2xl font-bold text-success">{filteredCategories.filter(c => c.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Tag className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Main Categories</p>
                <p className="text-2xl font-bold text-warning">{filteredCategories.filter(c => !c.parent_id).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-6 max-w-md mx-auto">
                      <div className="text-center space-y-2">
                        <Tag className="h-12 w-12 text-muted-foreground mx-auto" />
                        <p className="text-muted-foreground">
                          {searchTerm ? 'No categories found matching your search.' : 'No categories created yet.'}
                        </p>
                      </div>
                      {!searchTerm && (
                        <div className="w-full space-y-4">
                          <DefaultCategoriesButton onSuccess={handleModalSuccess} />
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-2">or</p>
                            <Button onClick={handleCreateCategory} variant="outline">
                              <Plus className="h-4 w-4 mr-2" />
                              Create Custom Category
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category) => (
                  <TableRow key={category.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{category.description || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={category.parent_id ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}>
                        {category.parent_id ? 'Subcategory' : 'Main Category'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={category.is_active ? 'bg-success-light text-success border-success/20' : 'bg-muted text-muted-foreground border-muted-foreground/20'}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(category.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditCategory(category)}
                          title="Edit category"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCategory(category)}
                          title="Delete category"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Category Modals */}
      <CreateCategoryModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={handleModalSuccess}
      />

      {selectedCategory && (
        <EditCategoryModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          onSuccess={handleEditSuccess}
          category={selectedCategory}
        />
      )}

      {selectedCategory && (
        <DeleteCategoryModal
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          onSuccess={handleDeleteSuccess}
          category={selectedCategory}
        />
      )}
    </div>
  );
}
