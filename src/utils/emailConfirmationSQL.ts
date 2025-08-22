/**
 * SQL functions that can be executed in Supabase SQL Editor to bypass email confirmation
 * These functions need to be created as database functions with proper permissions
 */

export const EMAIL_CONFIRMATION_BYPASS_SQL = `
-- Function to confirm user email directly in auth.users table
-- Execute this in Supabase SQL Editor if automatic bypass fails

CREATE OR REPLACE FUNCTION confirm_user_email(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the email_confirmed_at timestamp for the specified user
  UPDATE auth.users 
  SET 
    email_confirmed_at = NOW(),
    updated_at = NOW()
  WHERE email = user_email 
    AND email_confirmed_at IS NULL;
  
  -- Return true if a row was updated
  RETURN FOUND;
END;
$$;

-- Alternative function with more direct approach
CREATE OR REPLACE FUNCTION force_confirm_admin_email(admin_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record auth.users%ROWTYPE;
BEGIN
  -- Find the user by email
  SELECT * INTO user_record 
  FROM auth.users 
  WHERE email = admin_email;
  
  -- If user exists and email not confirmed
  IF FOUND AND user_record.email_confirmed_at IS NULL THEN
    -- Update email confirmation
    UPDATE auth.users 
    SET 
      email_confirmed_at = NOW(),
      confirmed_at = NOW(),
      updated_at = NOW()
    WHERE id = user_record.id;
    
    -- Also update the profile if it exists
    UPDATE public.profiles 
    SET 
      status = 'active',
      updated_at = NOW()
    WHERE id = user_record.id;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Grant necessary permissions (execute as superuser)
GRANT EXECUTE ON FUNCTION confirm_user_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_user_email(text) TO anon;
GRANT EXECUTE ON FUNCTION force_confirm_admin_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION force_confirm_admin_email(text) TO anon;

-- Test the function (replace with actual admin email)
SELECT confirm_user_email('admin@biolegendscientific.co.ke');
SELECT force_confirm_admin_email('admin@biolegendscientific.co.ke');
`;

export const DISABLE_EMAIL_CONFIRMATION_SQL = `
-- Alternative: Disable email confirmations entirely in Supabase
-- Execute this in Supabase SQL Editor to disable email confirmation for all new users

-- Note: This should be done via Supabase Dashboard → Auth → Settings
-- But if you need to do it via SQL, you would need to modify the auth configuration
-- This is typically not recommended for production environments

-- Instead, create a policy to allow admin creation without confirmation:
CREATE POLICY "Allow admin creation without confirmation" ON auth.users
FOR INSERT WITH CHECK (
  email = 'admin@biolegendscientific.co.ke'
);
`;

export const MANUAL_EMAIL_CONFIRMATION_STEPS = [
  '🔧 Manual Email Confirmation Steps',
  '=====================================',
  '',
  '1. Open Supabase Dashboard',
  '2. Navigate to Authentication → Users',
  '3. Find the user: admin@biolegendscientific.co.ke',
  '4. Click the three dots menu (⋯) next to the user',
  '5. Select "Confirm email"',
  '6. Return to the application and refresh',
  '',
  'Alternative Method:',
  '1. Go to Authentication → Settings',
  '2. Turn OFF "Enable email confirmations"',
  '3. This will disable confirmation for all future users',
  '',
  'SQL Method (Advanced):',
  '1. Go to SQL Editor in Supabase Dashboard',
  '2. Copy and execute the email confirmation SQL functions',
  '3. Run: SELECT force_confirm_admin_email(\'admin@biolegendscientific.co.ke\');'
];

/**
 * Get the complete SQL script for manual execution
 */
export const getEmailConfirmationBypassSQL = () => {
  return EMAIL_CONFIRMATION_BYPASS_SQL;
};

/**
 * Get manual instructions as a formatted string
 */
export const getManualConfirmationInstructions = () => {
  return MANUAL_EMAIL_CONFIRMATION_STEPS.join('\n');
};

/**
 * Copy SQL to clipboard for easy manual execution
 */
export const copyEmailConfirmationSQL = () => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(EMAIL_CONFIRMATION_BYPASS_SQL);
    return true;
  }
  return false;
};

console.log('📋 Email Confirmation SQL Functions Loaded');
console.log('Use getEmailConfirmationBypassSQL() to get the SQL script');
console.log('Use getManualConfirmationInstructions() for step-by-step guide');
