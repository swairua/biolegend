import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Building, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from '@/contexts/CompanyContext';

interface UserProfileInfo {
  id: string;
  email: string;
  company_id: string | null;
  role: string | null;
  status: string | null;
}

interface CompanyInfo {
  id: string;
  name: string;
}

export function UserProfileDiagnostic() {
  const [isChecking, setIsChecking] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileInfo | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { currentCompany } = useCurrentCompany();

  const checkProfile = async () => {
    setIsChecking(true);
    setError(null);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, company_id, role, status')
        .eq('id', user.id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          setError('No profile found for current user. Profile needs to be created.');
        } else {
          throw profileError;
        }
      } else {
        setUserProfile(profile);

        // If user has a company_id, get company info
        if (profile.company_id) {
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('id, name')
            .eq('id', profile.company_id)
            .single();

          if (!companyError && company) {
            setCompanyInfo(company);
          }
        }
      }

      toast.success('Profile check completed');
    } catch (err) {
      console.error('Error checking profile:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error('Failed to check profile');
    } finally {
      setIsChecking(false);
    }
  };

  const fixProfile = async () => {
    if (!currentCompany?.id) {
      toast.error('No current company found. Please check company setup.');
      return;
    }

    setIsChecking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Try to upsert profile with current company
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          company_id: currentCompany.id,
          role: 'admin', // Default to admin for now
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      setUserProfile(data);
      setCompanyInfo({
        id: currentCompany.id,
        name: currentCompany.name
      });

      toast.success('Profile updated successfully!');
    } catch (err) {
      console.error('Error fixing profile:', err);
      toast.error(`Failed to fix profile: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'bg-success-light text-success border-success/20';
      case 'pending':
        return 'bg-warning-light text-warning border-warning/20';
      case 'inactive':
        return 'bg-muted text-muted-foreground border-muted-foreground/20';
      default:
        return 'bg-destructive-light text-destructive border-destructive/20';
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5 text-primary" />
          <span>User Profile Diagnostic</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Button onClick={checkProfile} disabled={isChecking}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Check Profile'}
          </Button>
          {userProfile && !userProfile.company_id && (
            <Button onClick={fixProfile} disabled={isChecking} variant="outline">
              Fix Profile
            </Button>
          )}
        </div>

        {error && (
          <Alert className="border-destructive/20 bg-destructive-light">
            <XCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {userProfile && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>User Profile</span>
                </h4>
                <div className="text-sm space-y-1">
                  <div><strong>ID:</strong> {userProfile.id}</div>
                  <div><strong>Email:</strong> {userProfile.email}</div>
                  <div className="flex items-center space-x-2">
                    <strong>Role:</strong>
                    <Badge variant="outline" className={getStatusColor(userProfile.role)}>
                      {userProfile.role || 'Not Set'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <strong>Status:</strong>
                    <Badge variant="outline" className={getStatusColor(userProfile.status)}>
                      {userProfile.status || 'Not Set'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span>Company Association</span>
                </h4>
                <div className="text-sm space-y-1">
                  {userProfile.company_id ? (
                    <>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-success">Company Linked</span>
                      </div>
                      <div><strong>Company ID:</strong> {userProfile.company_id}</div>
                      {companyInfo && (
                        <div><strong>Company Name:</strong> {companyInfo.name}</div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span className="text-destructive">No Company Linked</span>
                      </div>
                      <Alert className="border-warning/20 bg-warning-light mt-2">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        <AlertDescription className="text-warning text-xs">
                          This user profile has no company association. This will cause RLS policy failures for payment allocations and other company-scoped operations.
                        </AlertDescription>
                      </Alert>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* RLS Policy Status */}
            <div className="space-y-2">
              <h4 className="font-medium">RLS Policy Compatibility</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center space-x-2">
                  {userProfile.company_id ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span>Payment Allocations: ✓ Allowed</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span>Payment Allocations: ✗ Blocked</span>
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {userProfile.company_id ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span>Company Data Access: ✓ Allowed</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span>Company Data Access: ✗ Limited</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
