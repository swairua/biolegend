import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Building2, Save, Upload, Plus, Trash2, Edit, Check, X, Image } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useCompanies, useUpdateCompany, useCreateCompany, useTaxSettings, useCreateTaxSetting, useUpdateTaxSetting, useDeleteTaxSetting } from '@/hooks/useDatabase';
import { toast } from 'sonner';
import { ForceTaxSettings } from '@/components/ForceTaxSettings';
import { supabase } from '@/integrations/supabase/client';
import StorageSetup from '@/components/StorageSetup';

export default function CompanySettings() {
  const [editingTax, setEditingTax] = useState<string | null>(null);
  const [newTax, setNewTax] = useState({ name: '', rate: 0, is_default: false });
  const [showNewTaxForm, setShowNewTaxForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [companyData, setCompanyData] = useState({
    name: 'BIOLEGEND SCIENTIFIC LTD',
    registration_number: '',
    tax_number: 'P051658002D',
    email: 'biolegend@biolegendscientific.co.ke',
    phone: 'Tel: 0741 207 690/0780 165 490',
    address: 'P.O Box 85988-00200\nNairobi, Kenya',
    city: 'Nairobi',
    state: '',
    postal_code: '00200',
    country: 'Kenya',
    currency: 'KES',
    fiscal_year_start: 1,
    logo_url: ''
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
        logo_url: currentCompany.logo_url || ''
      });
    }
  }, [currentCompany]);

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentCompany) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      // Choose a path; e.g. company-{id}/logo-{timestamp}.{ext}
      const ext = file.name.split('.').pop();
      const filePath = `company-${currentCompany.id}/logo-${Date.now()}.${ext}`;

      // Upload to Supabase storage bucket 'company-logos'
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('company-logos')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase
        .storage
        .from('company-logos')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // Update local state & persist using existing hook
      setCompanyData(prev => ({ ...prev, logo_url: publicUrl }));
      await updateCompany.mutateAsync({ id: currentCompany.id, logo_url: publicUrl });

      toast.success('Logo uploaded and saved successfully!');
    } catch (err: any) {
      console.error('Upload error', err);

      let errorMessage = 'Unknown error occurred';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err && typeof err === 'object') {
        // Handle Supabase error objects
        const supabaseError = err as any;
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        } else if (supabaseError.details) {
          errorMessage = supabaseError.details;
        } else if (supabaseError.hint) {
          errorMessage = supabaseError.hint;
        } else {
          errorMessage = JSON.stringify(err);
        }
      }

      // Check for specific storage errors
      if (errorMessage.includes('company-logos') && errorMessage.includes('bucket')) {
        toast.error('Storage bucket "company-logos" does not exist. Please create the storage bucket first.');
      } else if (errorMessage.includes('permission denied') || errorMessage.includes('insufficient_privilege')) {
        toast.error('Permission denied: Please check your storage permissions.');
      } else {
        toast.error(`Failed to upload logo: ${errorMessage}`);
      }
    } finally {
      setUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const validateCompanyData = (data: any) => {
    const errors = [];

    // Required fields
    if (!data.name || !data.name.trim()) {
      errors.push('Company name is required');
    } else if (data.name.length > 255) {
      errors.push('Company name must be less than 255 characters');
    }

    // Email validation
    if (data.email && data.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('Please enter a valid email address');
      } else if (data.email.length > 255) {
        errors.push('Email must be less than 255 characters');
      }
    }

    // Length validations for other fields
    if (data.registration_number && data.registration_number.length > 100) {
      errors.push('Registration number must be less than 100 characters');
    }
    if (data.tax_number && data.tax_number.length > 100) {
      errors.push('Tax number must be less than 100 characters');
    }
    if (data.phone && data.phone.length > 50) {
      errors.push('Phone number must be less than 50 characters');
    }
    if (data.city && data.city.length > 100) {
      errors.push('City must be less than 100 characters');
    }
    if (data.state && data.state.length > 100) {
      errors.push('State must be less than 100 characters');
    }
    if (data.postal_code && data.postal_code.length > 20) {
      errors.push('Postal code must be less than 20 characters');
    }
    if (data.country && data.country.length > 100) {
      errors.push('Country must be less than 100 characters');
    }
    if (data.currency && data.currency.length > 3) {
      errors.push('Currency code must be 3 characters or less');
    }

    // Fiscal year validation
    if (data.fiscal_year_start && (data.fiscal_year_start < 1 || data.fiscal_year_start > 12)) {
      errors.push('Fiscal year start must be between 1 and 12');
    }

    return errors;
  };

  const testCompanySave = async () => {
    console.log('🧪 Testing company save with detailed logging...');
    console.log('Current company data:', JSON.stringify(companyData, null, 2));
    console.log('Current company:', JSON.stringify(currentCompany, null, 2));

    try {
      // Test direct Supabase call first
      const testData = {
        name: companyData.name || 'Test Company',
        email: companyData.email || 'test@example.com',
        phone: companyData.phone,
        address: companyData.address,
        city: companyData.city,
        country: companyData.country || 'Kenya',
        currency: companyData.currency || 'KES'
      };

      console.log('Test data to be saved:', JSON.stringify(testData, null, 2));

      if (!currentCompany) {
        console.log('Creating new company directly...');
        const { data, error } = await supabase
          .from('companies')
          .insert([testData])
          .select()
          .single();

        if (error) {
          console.error('Direct Supabase error:', error);
          throw error;
        }
        console.log('Direct creation success:', data);
      } else {
        console.log('Updating company directly...');
        const { data, error } = await supabase
          .from('companies')
          .update(testData)
          .eq('id', currentCompany.id)
          .select()
          .single();

        if (error) {
          console.error('Direct Supabase error:', error);
          throw error;
        }
        console.log('Direct update success:', data);
      }

      toast.success('🧪 Test save successful!');

    } catch (error) {
      console.error('🧪 Test save failed:', error);
      toast.error('🧪 Test failed - check console for details');
    }
  };

  const handleSaveCompany = async () => {
    console.log('Saving company with data:', companyData);
    console.log('Current company:', currentCompany);

    // Comprehensive validation
    const validationErrors = validateCompanyData(companyData);
    if (validationErrors.length > 0) {
      toast.error(`Validation failed: ${validationErrors[0]}`);
      console.error('Validation errors:', validationErrors);
      return;
    }

    try {
      // Sanitize and prepare company data to match database schema
      const sanitizedData: any = {
        name: companyData.name?.trim() || '',
        registration_number: companyData.registration_number?.trim() || null,
        tax_number: companyData.tax_number?.trim() || null,
        email: companyData.email?.trim() || null,
        phone: companyData.phone?.trim() || null,
        address: companyData.address?.trim() || null,
        city: companyData.city?.trim() || null,
        state: companyData.state?.trim() || null,
        postal_code: companyData.postal_code?.trim() || null,
        country: companyData.country?.trim() || 'Kenya',
        currency: companyData.currency?.trim() || 'KES',
        logo_url: companyData.logo_url?.trim() || null,
        fiscal_year_start: companyData.fiscal_year_start || 1
      };

      // Remove empty strings and convert to null for optional fields
      Object.keys(sanitizedData).forEach(key => {
        if (key !== 'name' && key !== 'country' && key !== 'currency' && key !== 'fiscal_year_start') {
          if (sanitizedData[key] === '' || sanitizedData[key] === undefined) {
            sanitizedData[key] = null;
          }
        }
      });

      console.log('Sanitized company data:', JSON.stringify(sanitizedData, null, 2));

      if (!currentCompany) {
        // Create a new company if none exists
        console.log('No company found, creating new one');
        await createCompany.mutateAsync(sanitizedData);
        toast.success('Company created successfully');
      } else {
        // Update existing company
        console.log('Updating existing company with ID:', currentCompany.id);
        await updateCompany.mutateAsync({
          id: currentCompany.id,
          ...sanitizedData
        });
        toast.success('Company settings saved successfully');
      }
    } catch (error) {
      // Enhanced error logging for debugging
      console.error('Company save error (detailed):', {
        error,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorString: String(error),
        errorJSON: JSON.stringify(error, null, 2)
      });

      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
        console.log('Error is instance of Error, message:', error.message);
      } else if (error && typeof error === 'object') {
        // Handle Supabase error objects
        const supabaseError = error as any;
        console.log('Supabase error object:', {
          message: supabaseError.message,
          details: supabaseError.details,
          hint: supabaseError.hint,
          code: supabaseError.code,
          status: supabaseError.status,
          statusText: supabaseError.statusText
        });

        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        } else if (supabaseError.details) {
          errorMessage = supabaseError.details;
        } else if (supabaseError.hint) {
          errorMessage = supabaseError.hint;
        } else if (supabaseError.code) {
          errorMessage = `Error code: ${supabaseError.code}`;
        } else if (supabaseError.statusText) {
          errorMessage = supabaseError.statusText;
        } else {
          // Try to extract any string value from the error object
          const errorKeys = Object.keys(supabaseError);
          for (const key of errorKeys) {
            if (typeof supabaseError[key] === 'string' && supabaseError[key].length > 0) {
              errorMessage = `${key}: ${supabaseError[key]}`;
              break;
            }
          }
          if (errorMessage === 'Unknown error occurred') {
            errorMessage = JSON.stringify(error);
          }
        }
      } else {
        errorMessage = String(error);
      }

      console.log('Final error message to display:', errorMessage);

      // Check for specific table missing errors
      if (errorMessage.includes('companies') && (errorMessage.includes('does not exist') || errorMessage.includes('relation') || errorMessage.includes('table'))) {
        toast.error('Companies table does not exist. Please run the database setup first.');
      } else if (errorMessage.includes('permission denied') || errorMessage.includes('insufficient_privilege')) {
        toast.error('Permission denied: Please check your database permissions or contact your administrator.');
      } else if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        toast.error('Database schema mismatch detected. Please update your database schema or contact support.');
      } else if (errorMessage.includes('null value') && errorMessage.includes('violates not-null constraint')) {
        toast.error('Required field is missing. Please ensure all required fields are filled.');
      } else if (errorMessage.includes('invalid input syntax')) {
        toast.error('Invalid data format detected. Please check your input values.');
      } else if (errorMessage.includes('duplicate key') || errorMessage.includes('already exists')) {
        toast.error('A company with this information already exists.');
      } else if (errorMessage.includes('value too long')) {
        toast.error('One of your input values is too long. Please shorten your text fields.');
      } else if (errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('network')) {
        toast.error('Network or timeout error. Please check your connection and try again.');
      } else {
        toast.error(`Failed to save company settings: ${errorMessage}`);
      }
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
        <div className="flex gap-2">
          <Button variant="primary-gradient" size="lg" onClick={handleSaveCompany}>
            <Save className="h-4 w-4" />
            Save Settings
          </Button>
          <Button variant="outline" size="lg" onClick={testCompanySave}>
            🧪 Debug Test
          </Button>
        </div>
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
            <div className="flex items-start space-x-6">
              <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/25">
                {companyData.logo_url ? (
                  <img
                    src={companyData.logo_url}
                    alt="Company Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Image className="h-6 w-6 mb-1" />
                    <span className="text-xs">No Logo</span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-sm font-medium">Company Logo</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload your company logo. Recommended size: 200x200px, max 5MB. Supports PNG, JPG, GIF, WebP.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant="outline"
                    onClick={handleChooseFile}
                    disabled={uploading}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                  {companyData.logo_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCompanyData(prev => ({ ...prev, logo_url: '' }));
                        toast.success('Logo removed. Click Save Settings to apply changes.');
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove Logo
                    </Button>
                  )}
                </div>
                {companyData.logo_url && (
                  <p className="text-xs text-muted-foreground">
                    Current: Custom uploaded logo
                  </p>
                )}
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

        {/* Storage Setup for Logo Upload */}
        <StorageSetup />
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
