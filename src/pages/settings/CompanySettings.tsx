import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Building2, Save, Upload, Plus, Trash2, Edit, Check, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useCompanies, useUpdateCompany, useCreateCompany, useTaxSettings, useCreateTaxSetting, useUpdateTaxSetting, useDeleteTaxSetting } from '@/hooks/useDatabase';
import { toast } from 'sonner';
import { ForceTaxSettings } from '@/components/ForceTaxSettings';

export default function CompanySettings() {
  const [editingTax, setEditingTax] = useState<string | null>(null);
  const [newTax, setNewTax] = useState({ name: '', rate: 0, is_default: false });
  const [showNewTaxForm, setShowNewTaxForm] = useState(false);
  const [companyData, setCompanyData] = useState({
    name: '',
    registration_number: '',
    tax_number: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    currency: '',
    fiscal_year_start: 1,
    logo_url: '/assets/medplus-logo.webp'
  });

  const { data: companies, isLoading: companiesLoading, error: companiesError } = useCompanies();
  const currentCompany = companies?.[0]; // Assuming single company for now
  const { data: taxSettings, isLoading: taxSettingsLoading, error: taxSettingsError } = useTaxSettings(currentCompany?.id);
  const updateCompany = useUpdateCompany();
  const createCompany = useCreateCompany();
  const createTaxSetting = useCreateTaxSetting();
  const updateTaxSetting = useUpdateTaxSetting();
  const deleteTaxSetting = useDeleteTaxSetting();

  // Debug logging
  useEffect(() => {
    console.log('Companies data:', companies);
    console.log('Companies loading:', companiesLoading);
    console.log('Companies error:', companiesError);
    console.log('Current company:', currentCompany);
    console.log('Tax settings:', taxSettings);
    console.log('Tax settings loading:', taxSettingsLoading);
    console.log('Tax settings error:', taxSettingsError);
  }, [companies, companiesLoading, companiesError, currentCompany, taxSettings, taxSettingsLoading, taxSettingsError]);

  useEffect(() => {
    if (currentCompany) {
      setCompanyData({
        name: currentCompany.name || '',
        registration_number: currentCompany.registration_number || '',
        tax_number: currentCompany.tax_number || '',
        email: currentCompany.email || '',
        phone: currentCompany.phone || '',
        address: currentCompany.address || '',
        city: currentCompany.city || '',
        state: currentCompany.state || '',
        postal_code: currentCompany.postal_code || '',
        country: currentCompany.country || 'Kenya',
        currency: currentCompany.currency || 'KES',
        fiscal_year_start: currentCompany.fiscal_year_start || 1,
        logo_url: currentCompany.logo_url || '/assets/medplus-logo.webp'
      });
    }
  }, [currentCompany]);

  // Auto-update company logo on component mount - force update to local asset
  useEffect(() => {
    const updateCompanyLogo = async () => {
      if (currentCompany && currentCompany.logo_url !== '/assets/medplus-logo.webp') {
        try {
          const newLogoUrl = '/assets/medplus-logo.webp';
          await updateCompany.mutateAsync({
            id: currentCompany.id,
            logo_url: newLogoUrl
          });
          console.log('Company logo updated to local asset automatically');
        } catch (error) {
          console.error('Failed to auto-update company logo:', error);
        }
      }
    };

    updateCompanyLogo();
  }, [currentCompany, updateCompany]);

  const handleSaveCompany = async () => {
    console.log('Saving company with data:', companyData);
    console.log('Current company:', currentCompany);

    try {
      if (!currentCompany) {
        // Create a new company if none exists
        console.log('No company found, creating new one');
        await createCompany.mutateAsync(companyData);
        toast.success('Company created successfully');
      } else {
        // Update existing company
        console.log('Updating existing company with ID:', currentCompany.id);
        await updateCompany.mutateAsync({
          id: currentCompany.id,
          ...companyData
        });
        toast.success('Company settings saved successfully');
      }
    } catch (error) {
      console.error('Company save error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to save company settings: ${errorMessage}`);
    }
  };

  const handleCreateTax = async () => {
    if (!currentCompany) {
      toast.error('No company found. Please create a company first.');
      return;
    }

    if (!newTax.name.trim()) {
      toast.error('Please enter a tax name');
      return;
    }

    if (newTax.rate <= 0) {
      toast.error('Please enter a valid tax rate greater than 0');
      return;
    }

    console.log('Creating tax:', {
      company_id: currentCompany.id,
      name: newTax.name,
      rate: newTax.rate,
      is_default: newTax.is_default
    });

    try {
      await createTaxSetting.mutateAsync({
        company_id: currentCompany.id,
        name: newTax.name.trim(),
        rate: newTax.rate,
        is_active: true,
        is_default: newTax.is_default
      });

      setNewTax({ name: '', rate: 0, is_default: false });
      setShowNewTaxForm(false);
      toast.success(`Tax setting "${newTax.name}" created successfully!`);
    } catch (error) {
      console.error('Tax creation error:', error);

      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        // Handle Supabase error objects
        const supabaseError = error as any;
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        } else if (supabaseError.details) {
          errorMessage = supabaseError.details;
        } else if (supabaseError.hint) {
          errorMessage = supabaseError.hint;
        } else {
          errorMessage = JSON.stringify(error);
        }
      }

      // Check if it's a table missing error
      if (errorMessage.includes('tax_settings') && (errorMessage.includes('does not exist') || errorMessage.includes('relation') || errorMessage.includes('table'))) {
        toast.error('Tax settings table does not exist. Please create the table first using the migration runner above.');
      } else {
        toast.error(`Failed to create tax setting: ${errorMessage}`);
      }
    }
  };

  const handleUpdateTax = async (taxId: string, updates: any) => {
    try {
      await updateTaxSetting.mutateAsync({
        id: taxId,
        ...updates
      });
      setEditingTax(null);
      toast.success('Tax setting updated successfully');
    } catch (error) {
      console.error('Tax update error:', error);

      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        const supabaseError = error as any;
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        } else if (supabaseError.details) {
          errorMessage = supabaseError.details;
        } else if (supabaseError.hint) {
          errorMessage = supabaseError.hint;
        } else {
          errorMessage = JSON.stringify(error);
        }
      }

      toast.error(`Failed to update tax setting: ${errorMessage}`);
    }
  };

  const handleDeleteTax = async (taxId: string) => {
    if (!confirm('Are you sure you want to delete this tax setting?')) {
      return;
    }

    try {
      await deleteTaxSetting.mutateAsync(taxId);
      toast.success('Tax setting deleted successfully');
    } catch (error) {
      console.error('Tax deletion error:', error);

      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        const supabaseError = error as any;
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        } else if (supabaseError.details) {
          errorMessage = supabaseError.details;
        } else if (supabaseError.hint) {
          errorMessage = supabaseError.hint;
        } else {
          errorMessage = JSON.stringify(error);
        }
      }

      toast.error(`Failed to delete tax setting: ${errorMessage}`);
    }
  };

  // Show loading state while companies are loading
  if (companiesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Company Settings</h1>
            <p className="text-muted-foreground">Loading company information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Company Settings</h1>
          <p className="text-muted-foreground">
            Manage company information and preferences
          </p>
        </div>
        <Button variant="primary-gradient" size="lg" onClick={handleSaveCompany}>
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Company Information */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Company Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={companyData.name || ''}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-id">Tax ID / Registration Number</Label>
                <Input
                  id="tax-id"
                  value={companyData.registration_number || ''}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, registration_number: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={companyData.address || ''}
                onChange={(e) => setCompanyData(prev => ({ ...prev, address: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={companyData.phone || ''}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={companyData.email || ''}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-number">PIN/Tax Number</Label>
                <Input
                  id="tax-number"
                  value={companyData.tax_number || ''}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, tax_number: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo & Branding */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Logo & Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {companyData.logo_url ? (
                  <img
                    src={companyData.logo_url}
                    alt="Company Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex flex-col space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const newLogoUrl = '/assets/medplus-logo.webp';
                      setCompanyData(prev => ({ ...prev, logo_url: newLogoUrl }));
                      toast.success('Logo updated! Click Save Company to apply changes.');
                    }}
                  >
                    <Upload className="h-4 w-4" />
                    Use New MedPlus Logo
                  </Button>
                  {companyData.logo_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCompanyData(prev => ({ ...prev, logo_url: '' }));
                      }}
                    >
                      Remove Logo
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Current: MedPlus Africa Logo (Local Asset)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Default Settings */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Default Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <Input
                  id="currency"
                  value={companyData.currency || ''}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, currency: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fiscal-year">Fiscal Year Start (Month)</Label>
                <Input
                  id="fiscal-year"
                  type="number"
                  min="1"
                  max="12"
                  value={companyData.fiscal_year_start || 1}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, fiscal_year_start: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={companyData.city || ''}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={companyData.country || ''}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, country: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={companyData.state || ''}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, state: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal-code">Postal Code</Label>
                <Input
                  id="postal-code"
                  value={companyData.postal_code || ''}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, postal_code: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Settings - Force Implementation */}
        {currentCompany && (
          <ForceTaxSettings companyId={currentCompany.id} />
        )}
      </div>
    </div>
  );
}

// Tax Edit Form Component
interface TaxEditFormProps {
  tax: any;
  onSave: (updates: any) => void;
  onCancel: () => void;
}

function TaxEditForm({ tax, onSave, onCancel }: TaxEditFormProps) {
  const [editData, setEditData] = useState({
    name: tax?.name || '',
    rate: tax?.rate || 0,
    is_active: tax?.is_active || false,
    is_default: tax?.is_default || false
  });

  return (
    <div className="flex-1 grid gap-4 md:grid-cols-4">
      <Input
        value={editData.name || ''}
        onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
      />
      <Input
        type="number"
        step="0.01"
        value={editData.rate || 0}
        onChange={(e) => setEditData(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
      />
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={editData.is_active}
            onCheckedChange={(checked) => setEditData(prev => ({ ...prev, is_active: checked }))}
          />
          <span className="text-sm">Active</span>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={editData.is_default}
            onCheckedChange={(checked) => setEditData(prev => ({ ...prev, is_default: checked }))}
          />
          <span className="text-sm">Default</span>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button size="sm" onClick={() => onSave(editData)}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
