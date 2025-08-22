import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Database, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export function ManualMigrationInstructions() {
  const [showInstructions, setShowInstructions] = useState(false);

  const migrationSQL = `-- Product Category Migration SQL
-- Copy and paste this into your Supabase SQL Editor

-- Step 1: Create product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES product_categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add category_id column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id);

-- Step 3: Insert default categories (replace the company_id with your actual company ID)
INSERT INTO product_categories (company_id, name, description) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Electronics', 'Electronic devices and components'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Tools', 'Tools and equipment'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Components', 'Spare parts and components'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Accessories', 'Accessories and add-ons'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Consumables', 'Consumable items'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Other', 'Miscellaneous items')
ON CONFLICT DO NOTHING;

-- Step 4: Enable RLS policies for product_categories
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policy for product_categories
CREATE POLICY "Enable read access for authenticated users" ON product_categories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON product_categories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON product_categories
    FOR UPDATE USING (auth.role() = 'authenticated');
`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(migrationSQL);
      toast.success('Migration SQL copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (!showInstructions) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <Database className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <div className="flex items-center justify-between">
            <span>Auto-migration failed. Manual database setup required.</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowInstructions(true)}
              className="ml-2"
            >
              Show Instructions
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <Database className="h-5 w-5" />
          Manual Database Migration Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            The automatic migration failed. Please follow these steps to manually set up the database:
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <h4 className="font-medium">Steps:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Go to your Supabase Dashboard</li>
            <li>Navigate to the SQL Editor</li>
            <li>Copy the SQL below and paste it into a new query</li>
            <li>Replace the company_id in the INSERT statements with your actual company ID</li>
            <li>Run the query</li>
            <li>Refresh this page</li>
          </ol>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Migration SQL:</h4>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-1" />
                Copy SQL
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                asChild
              >
                <a 
                  href="https://supabase.com/dashboard/projects" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open Supabase
                </a>
              </Button>
            </div>
          </div>
          
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto border">
            <code>{migrationSQL}</code>
          </pre>
        </div>

        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => setShowInstructions(false)}
          >
            Hide Instructions
          </Button>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            Refresh Page After Migration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
