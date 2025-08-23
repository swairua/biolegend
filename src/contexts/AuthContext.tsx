import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  company_id?: string;
  department?: string;
  position?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  // Use refs to prevent stale closures and unnecessary re-renders
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);

  // Fetch user profile from database with error handling
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('🔍 Fetching profile for user ID:', userId);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle to handle 0 results gracefully

      if (error) {
        console.error('Error fetching profile:', JSON.stringify(error, null, 2));
        console.error('Profile fetch error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return null;
      }

      if (!data) {
        console.warn('⚠️ No profile found for user ID:', userId);
        return null;
      }

      console.log('✅ Profile found:', {
        id: data.id,
        email: data.email
      });

      return data;
    } catch (error) {
      console.error('Exception fetching profile:', error);
      return null;
    }
  }, []);

  // Update last login timestamp silently
  const updateLastLogin = useCallback(async (userId: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }, []);

  // Handle auth state changes
  const handleAuthStateChange = useCallback(async (event: string, newSession: Session | null) => {
    if (!mountedRef.current || initializingRef.current) return;

    console.log('Auth state changed:', event, newSession?.user?.email);
    
    // Batch state updates to prevent multiple renders
    if (newSession?.user) {
      const userProfile = await fetchProfile(newSession.user.id);
      
      if (mountedRef.current) {
        setSession(newSession);
        setUser(newSession.user);
        setProfile(userProfile);
        
        // Update last login for sign-in events, but don't await to prevent blocking
        if (event === 'SIGNED_IN' && userProfile) {
          updateLastLogin(newSession.user.id).catch(console.error);
        }
      }
    } else {
      if (mountedRef.current) {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    }

    if (mountedRef.current) {
      setLoading(false);
    }
  }, [fetchProfile, updateLastLogin, loading]);

  // Initialize auth state
  useEffect(() => {
    if (initializingRef.current) return;
    
    initializingRef.current = true;
    mountedRef.current = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mountedRef.current) {
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        if (initialSession?.user && mountedRef.current) {
          const userProfile = await fetchProfile(initialSession.user.id);
          
          if (mountedRef.current) {
            setSession(initialSession);
            setUser(initialSession.user);
            setProfile(userProfile);
            
            // Update last login silently
            if (userProfile) {
              updateLastLogin(initialSession.user.id).catch(console.error);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setInitialized(true);
          initializingRef.current = false;
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, updateLastLogin, handleAuthStateChange]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Use setTimeout to defer toast to avoid setState during render
        setTimeout(() => toast.error(error.message), 0);
        setLoading(false); // Clear loading on error
        return { error };
      }

      // Use setTimeout to defer toast to avoid setState during render
      setTimeout(() => toast.success('Signed in successfully'), 0);
      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      setTimeout(() => toast.error('Sign in failed'), 0);
      setLoading(false); // Clear loading on error
      return { error: authError };
    }
    // Don't set loading to false in finally - auth state change will handle it for success cases
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setTimeout(() => toast.error(error.message), 0);
        return { error };
      }

      setTimeout(() => toast.success('Account created successfully'), 0);
      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      setTimeout(() => toast.error('Sign up failed'), 0);
      return { error: authError };
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Starting sign out process...');
      setLoading(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ Sign out error:', error);
        setTimeout(() => toast.error('Error signing out'), 0);
      } else {
        console.log('✅ Supabase sign out successful');

        // Clear state immediately
        setUser(null);
        setProfile(null);
        setSession(null);

        // Clear local storage
        try {
          localStorage.removeItem('sb-' + supabase.supabaseUrl.split('//')[1].split('.')[0] + '-auth-token');
          console.log('✅ Local storage cleared');
        } catch (storageError) {
          console.error('⚠️ Error clearing localStorage:', storageError);
        }

        setTimeout(() => toast.success('Signed out successfully'), 0);
        console.log('🎉 Sign out complete!');
      }
    } catch (error) {
      console.error('❌ Sign out exception:', error);
      setTimeout(() => toast.error('Error signing out'), 0);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        setTimeout(() => toast.error(error.message), 0);
        return { error };
      }

      setTimeout(() => toast.success('Password reset email sent'), 0);
      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      setTimeout(() => toast.error('Password reset failed'), 0);
      return { error: authError };
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        setTimeout(() => toast.error('Failed to update profile'), 0);
        return { error: new Error(error.message) };
      }

      // Refresh profile data
      await refreshProfile();
      setTimeout(() => toast.success('Profile updated successfully'), 0);
      return { error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      setTimeout(() => toast.error('Failed to update profile'), 0);
      return { error: error as Error };
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;

    const userProfile = await fetchProfile(user.id);
    if (userProfile && mountedRef.current) {
      setProfile(userProfile);
    }
  }, [user, fetchProfile]);

  // Compute derived state - only require user since we removed role-based system
  const isAuthenticated = !!user;

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading: loading || !initialized,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    isAuthenticated,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
