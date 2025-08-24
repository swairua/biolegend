import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentCompany } from '@/contexts/CompanyContext';
import { createDefaultCategories } from '@/utils/createDefaultCategories';
import { toast } from 'sonner';
import { 
  Sparkles,
  Tag,
  Zap
} from 'lucide-react';

interface DefaultCategoriesButtonProps {
  onSuccess: () => void;
}

export function DefaultCategoriesButton({ onSuccess }: DefaultCategoriesButtonProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { currentCompany } = useCurrentCompany();

  const handleCreateDefaults = async () => {
    if (!currentCompany?.id) {
      toast.error('Company not found. Please refresh and try again.');
      return;
    }

    setIsCreating(true);
    try {
      const result = await createDefaultCategories(currentCompany.id);

      if (result.success) {
        toast.success(result.message);
        onSuccess();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error creating default categories:', error);
      toast.error('Failed to create default categories');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-blue-50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>Quick Start</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-3">
            Start organizing your inventory with these commonly used categories:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <Tag className="h-3 w-3 text-primary" />
              <span>Electronics</span>
            </div>
            <div className="flex items-center space-x-1">
              <Tag className="h-3 w-3 text-primary" />
              <span>Tools</span>
            </div>
            <div className="flex items-center space-x-1">
              <Tag className="h-3 w-3 text-primary" />
              <span>Components</span>
            </div>
            <div className="flex items-center space-x-1">
              <Tag className="h-3 w-3 text-primary" />
              <span>Accessories</span>
            </div>
            <div className="flex items-center space-x-1">
              <Tag className="h-3 w-3 text-primary" />
              <span>Consumables</span>
            </div>
            <div className="flex items-center space-x-1">
              <Tag className="h-3 w-3 text-primary" />
              <span>Other</span>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={handleCreateDefaults} 
          disabled={isCreating}
          className="w-full gradient-primary"
          size="lg"
        >
          <Zap className="h-4 w-4 mr-2" />
          {isCreating ? 'Creating Categories...' : 'Create Default Categories'}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          You can customize or add more categories later
        </p>
      </CardContent>
    </Card>
  );
}
