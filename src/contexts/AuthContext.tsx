import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { clearAuthTokens, safeAuthOperation } from '@/utils/authHelpers';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  company_id?: string;
  department?: string;
  position?: string;
  role?: string;
  status?: string;
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
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  clearTokens: () => void;
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

  // Use refs to prevent stale closures and memory leaks
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);

  // Fetch user profile from database with comprehensive error handling
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, phone, company_id, department, position, role, status, last_login, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Profile fetch error:', error.message);
        return null;
      }

      return profileData;
    } catch (error) {
      console.warn('Profile fetch exception:', error);
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
      console.warn('Error updating last login:', error);
    }
  }, []);

  // Handle auth state changes
  const handleAuthStateChange = useCallback(async (event: string, newSession: Session | null) => {
    if (!mountedRef.current || initializingRef.current) return;

    try {
      if (newSession?.user) {
        const userProfile = await fetchProfile(newSession.user.id);
        
        if (mountedRef.current) {
          setSession(newSession);
          setUser(newSession.user);
          setProfile(userProfile);
          
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
    } catch (error) {
      console.warn('Error in auth state change:', error);
      
      // Clear invalid tokens if needed
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message;
        if (errorMessage?.includes('Invalid Refresh Token') || 
            errorMessage?.includes('Refresh Token Not Found')) {
          clearAuthTokens();
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchProfile, updateLastLogin]);

  // **FIXED: Ultra-reliable auth initialization with guaranteed completion**
  useEffect(() => {
    if (initializingRef.current || !mountedRef.current) return;

    initializingRef.current = true;
    console.log('🚀 Starting reliable auth initialization...');

    const initializeAuthState = async () => {
      // **CRITICAL FIX: Always complete initialization within 3 seconds maximum**
      const forceCompleteTimer = setTimeout(() => {
        if (mountedRef.current && loading) {
          console.log('⏰ Force completing auth initialization after 3 seconds');
          setLoading(false);
          setInitialized(true);
          initializingRef.current = false;
        }
      }, 3000); // Hard 3-second limit

      try {
        // Create a fast connectivity check with 1.5-second timeout
        const connectivityPromise = new Promise<boolean>((resolve) => {
          fetch(supabase.supabaseUrl + '/rest/v1/', { 
            method: 'HEAD',
            cache: 'no-cache'
          })
            .then(() => resolve(true))
            .catch(() => resolve(false));
          
          // Timeout connectivity check after 1.5 seconds
          setTimeout(() => resolve(false), 1500);
        });

        const hasConnectivity = await connectivityPromise;

        if (!hasConnectivity) {
          console.warn('🌐 No Supabase connectivity - starting app without auth');
          clearTimeout(forceCompleteTimer);
          if (mountedRef.current) {
            setLoading(false);
            setInitialized(true);
            initializingRef.current = false;
          }
          return;
        }

        // Quick session check with timeout
        const sessionPromise = supabase.auth.getSession();
        const sessionTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Session check timeout')), 2000);
        });

        const sessionResult = await Promise.race([sessionPromise, sessionTimeout]);
        const { data: sessionData, error: sessionError } = sessionResult as any;

        // Clear the force complete timer since we got a result
        clearTimeout(forceCompleteTimer);

        if (sessionError) {
          console.warn('⚠️ Session error:', sessionError.message);
          
          // Handle invalid token errors
          if (sessionError.message?.includes('Invalid Refresh Token') ||
              sessionError.message?.includes('invalid_token')) {
            console.log('🧹 Clearing invalid tokens');
            clearAuthTokens();
          }
        }

        // Set auth state if we have a valid session
        if (sessionData?.session?.user && mountedRef.current) {
          console.log('✅ Auth session found - setting user');
          setSession(sessionData.session);
          setUser(sessionData.session.user);
          
          // Fetch profile in background (non-blocking)
          fetchProfile(sessionData.session.user.id)
            .then(userProfile => {
              if (mountedRef.current) {
                setProfile(userProfile);
                if (userProfile) {
                  updateLastLogin(sessionData.session.user.id).catch(console.error);
                }
              }
            })
            .catch(console.warn);
        }

        // Complete initialization
        if (mountedRef.current) {
          setLoading(false);
          setInitialized(true);
          initializingRef.current = false;
          console.log('🎉 Auth initialization completed successfully');
        }

      } catch (error) {
        console.warn('⚠️ Auth initialization error:', error);
        clearTimeout(forceCompleteTimer);
        
        // Always complete initialization even on error
        if (mountedRef.current) {
          setLoading(false);
          setInitialized(true);
          initializingRef.current = false;
        }
      }
    };

    initializeAuthState();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await safeAuthOperation(async () => {
      setLoading(true);
      return await supabase.auth.signInWithPassword({
        email,
        password,
      });
    }, 'signIn');

    if (error) {
      setLoading(false);
      return { error: error as AuthError };
    }

    if (data?.error) {
      setLoading(false);
      return { error: data.error };
    }

    setTimeout(() => toast.success('Signed in successfully'), 0);
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    const { data, error } = await safeAuthOperation(async () => {
      setLoading(true);
      return await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
    }, 'signUp');

    if (error) {
      setLoading(false);
      return { error: error as AuthError };
    }

    if (data?.error) {
      setLoading(false);
      return { error: data.error };
    }

    setTimeout(() => toast.success('Account created successfully'), 0);
    setLoading(false);
    return { error: null };
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
        console.log('✅ Sign out successful');
        setUser(null);
        setProfile(null);
        setSession(null);
        clearAuthTokens();
        setTimeout(() => toast.success('Signed out successfully'), 0);
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
    const { data, error } = await safeAuthOperation(async () => {
      return await supabase.auth.resetPasswordForEmail(email);
    }, 'resetPassword');

    if (error) {
      return { error: error as AuthError };
    }

    if (data?.error) {
      return { error: data.error };
    }

    setTimeout(() => toast.success('Password reset email sent'), 0);
    return { error: null };
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

  const clearTokens = useCallback(() => {
    clearAuthTokens();
    setUser(null);
    setProfile(null);
    setSession(null);
    toast.info('Authentication tokens cleared. Please sign in again.');
  }, []);

  // Compute derived state
  const isAuthenticated = !!user;
  const isAdmin = profile?.role === 'admin';

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading: loading && !initialized,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    isAuthenticated,
    isAdmin,
    refreshProfile,
    clearTokens,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
