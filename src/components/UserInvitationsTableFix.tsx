import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  Database, 
  Play, 
  CheckCircle, 
  XCircle, 
  Copy,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const USER_INVITATIONS_FIX_SQL = `
-- Fix user_invitations table to include invited_at column
DO $$
BEGIN
    -- Check if user_invitations table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_invitations') THEN
        -- Add invited_at column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_invitations' AND column_name = 'invited_at') THEN
            ALTER TABLE user_invitations ADD COLUMN invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Added invited_at column to user_invitations table';
        ELSE
            RAISE NOTICE 'invited_at column already exists in user_invitations table';
        END IF;
        
        -- Update existing rows to have invited_at if they don't
        UPDATE user_invitations SET invited_at = created_at WHERE invited_at IS NULL;
        RAISE NOTICE 'Updated existing invitations with invited_at values';
        
    ELSE
        -- Create the complete user_invitations table with all required columns
        CREATE TABLE user_invitations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
            invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
            accepted_at TIMESTAMP WITH TIME ZONE,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
            invitation_token UUID DEFAULT gen_random_uuid(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(email, company_id)
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
        CREATE INDEX IF NOT EXISTS idx_user_invitations_company_id ON user_invitations(company_id);
        CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
        CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invitation_token);
        
        RAISE NOTICE 'Created user_invitations table with invited_at column';
    END IF;
END $$;
`;

export function UserInvitationsTableFix() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; error?: string } | null>(null);
  const [showSQL, setShowSQL] = useState(false);

  const handleRunFix = async () => {
    setIsRunning(true);
    setResult(null);
    
    try {
      console.log('🚀 Starting user_invitations table fix...');
      
      // Try different RPC methods to execute the SQL
      const executionMethods = [
        { name: 'exec_sql', params: { sql: USER_INVITATIONS_FIX_SQL } },
        { name: 'sql', params: { query: USER_INVITATIONS_FIX_SQL } },
        { name: 'execute_sql', params: { sql_text: USER_INVITATIONS_FIX_SQL } }
      ];

      let fixExecuted = false;
      let lastError = '';

      for (const method of executionMethods) {
        try {
          console.log(`Trying RPC method: ${method.name}`);
          const { data, error } = await supabase.rpc(method.name, method.params);
          
          if (!error) {
            console.log(`✅ Fix executed successfully using ${method.name}`);
            fixExecuted = true;
            break;
          } else {
            console.log(`❌ ${method.name} failed:`, error.message);
            lastError = error.message;
          }
        } catch (err: any) {
          console.log(`❌ ${method.name} error:`, err.message);
          lastError = err.message;
        }
      }

      if (fixExecuted) {
        // Test the fix by trying to fetch invitations
        const { error: testError } = await supabase
          .from('user_invitations')
          .select('*')
          .limit(1);

        if (!testError) {
          setResult({
            success: true,
            message: 'User invitations table fixed successfully! The invited_at column has been added.'
          });
          
          toast.success('Fix Applied!', {
            description: 'User invitations table is now working properly.'
          });
          
          // Refresh the page to clear the error
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          setResult({
            success: false,
            message: 'Fix applied but table test failed',
            error: testError.message
          });
        }
      } else {
        setResult({
          success: false,
          message: 'Could not execute fix automatically. Manual SQL execution required.',
          error: lastError
        });
        setShowSQL(true);
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: 'Unexpected error occurred',
        error: error.message
      });
    } finally {
      setIsRunning(false);
    }
  };

  const copySQL = () => {
    navigator.clipboard.writeText(USER_INVITATIONS_FIX_SQL);
    toast.success('SQL copied to clipboard!');
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Fix User Invitations Table
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            The user_invitations table is missing the "invited_at" column which is required for the invitations feature to work properly.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button 
            onClick={handleRunFix}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isRunning ? 'Fixing...' : 'Fix Table Now'}
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => setShowSQL(!showSQL)}
          >
            {showSQL ? 'Hide SQL' : 'Show SQL'}
          </Button>
        </div>

        {result && (
          <Alert className={result.success ? 'border-green-500' : 'border-red-500'}>
            {result.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            <AlertDescription>
              <div className="font-medium">{result.message}</div>
              {result.error && (
                <div className="text-sm text-muted-foreground mt-1">{result.error}</div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {(showSQL || (result && !result.success)) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Manual SQL (copy and paste into Supabase SQL Editor):</label>
              <Button size="sm" variant="outline" onClick={copySQL}>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <Textarea 
              value={USER_INVITATIONS_FIX_SQL}
              readOnly
              className="font-mono text-xs"
              rows={20}
            />
            <Alert>
              <AlertDescription className="text-xs">
                If automatic execution failed, copy the SQL above and run it in your Supabase project's SQL Editor.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
