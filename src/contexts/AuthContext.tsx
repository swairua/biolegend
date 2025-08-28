import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { initializeAuth, clearAuthTokens, safeAuthOperation } from '@/utils/authHelpers';

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

  // Use refs to prevent stale closures and unnecessary re-renders
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);
  const forceCompletedRef = useRef(false);

  // Fetch user profile from database with error handling and retry logic
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, phone, company_id, department, position, role, status, last_login, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle to handle 0 results gracefully

      if (error) {
        throw error;
      }

      if (!profileData) {
        return null;
      }


      return profileData;
    } catch (error) {
      // Properly log error details instead of [object Object]
      console.error('Exception fetching profile:', {
        message: error instanceof Error ? error.message : String(error),
        code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
        details: error && typeof error === 'object' && 'details' in error ? error.details : undefined,
        hint: error && typeof error === 'object' && 'hint' in error ? error.hint : undefined,
        userId,
        timestamp: new Date().toISOString()
      });

      // Handle specific error types
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message;

        // Handle specific Supabase errors
        if (errorMessage?.includes('JWT expired') || errorMessage?.includes('invalid_token')) {
          console.warn('Profile fetch failed due to expired token - user may need to re-authenticate');
          return null; // Don't show error toast for auth issues
        }

        if (errorMessage?.includes('Failed to fetch') || errorMessage?.includes('Network')) {
          console.warn('Profile fetch failed due to network issue');
          setTimeout(() => toast.error(
            'Network connection issue. Profile will retry automatically.',
            { duration: 3000 }
          ), 0);
          return null;
        }

        if (errorMessage?.includes('Row level security')) {
          console.warn('Profile fetch failed due to permissions');
          setTimeout(() => toast.error(
            'Permission error accessing profile. Please sign in again.',
            { duration: 4000 }
          ), 0);
          return null;
        }
      }

      // Show general error message for other cases
      setTimeout(() => toast.error(
        'Failed to load user profile. Please try again.',
        { duration: 4000 }
      ), 0);

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
      console.error('Error updating last login:', {
        message: error instanceof Error ? error.message : String(error),
        code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
        userId
      });
    }
  }, []);

  // Handle auth state changes with improved error handling
  const handleAuthStateChange = useCallback(async (event: string, newSession: Session | null) => {
    if (!mountedRef.current || initializingRef.current) return;

    
    try {
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
    } catch (error) {
      console.error('Error in auth state change:', {
        message: error instanceof Error ? error.message : String(error),
        code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
        event,
        hasSession: !!newSession
      });
      
      // If we get invalid token errors, clear tokens
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

  // Initialize auth state with simplified logic
  useEffect(() => {
    if (initializingRef.current) return;

    initializingRef.current = true;
    mountedRef.current = true;

    const initializeAuthState = async () => {
      try {
        console.log('🚀 Initializing auth state...');

        // Simple timeout mechanism - 10 seconds max
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Auth initialization timeout after 10000ms')), 10000);
        });

        // Simple auth check
        const authPromise = initializeAuth();

        // Race with timeout
        const result = await Promise.race([authPromise, timeoutPromise]);
        const { session: initialSession, error } = result as any;

        if (error) {
          console.warn('⚠️ Auth initialization error:', error.message);
          throw error;
        }

        if (initialSession?.user && mountedRef.current) {
          console.log('✅ Found valid session, user authenticated');

          // Set user and session immediately
          setSession(initialSession);
          setUser(initialSession.user);

          // Fetch profile in background - don't block initialization
          fetchProfile(initialSession.user.id)
            .then(userProfile => {
              if (mountedRef.current) {
                setProfile(userProfile);
                console.log('✅ Profile loaded');

                // Update last login silently
                if (userProfile) {
                  updateLastLogin(initialSession.user.id).catch(console.error);
                }
              }
            })
            .catch(profileError => {
              console.warn('⚠️ Profile fetch failed:', {
                message: profileError instanceof Error ? profileError.message : String(profileError)
              });
            });

          console.log('✅ Auth initialization completed');
        } else {
          console.log('ℹ️ No valid session found');
        }

      } catch (error) {
        console.error('❌ Auth initialization error:', error);

        // Handle specific error types
        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            console.warn('⏰ Auth initialization timed out - continuing without auth');
          } else if (error.message.includes('Invalid Refresh Token') ||
                    error.message.includes('invalid_token')) {
            console.warn('🧹 Clearing invalid tokens');
            clearAuthTokens();
          }
        }

        // Always reset to clean state on error
        if (mountedRef.current) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        // Always complete initialization
        if (mountedRef.current) {
          setLoading(false);
          setInitialized(true);
          initializingRef.current = false;
          console.log('🏁 Auth initialization completed');
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
  }, [fetchProfile, updateLastLogin, handleAuthStateChange]);

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
      // Return error without showing toast - let the component handle it
      return { error: error as AuthError };
    }

    if (data?.error) {
      setLoading(false);
      // Return error without showing toast - let the component handle it
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
      // Return error without showing toast - let the component handle it
      return { error: error as AuthError };
    }

    if (data?.error) {
      setLoading(false);
      // Return error without showing toast - let the component handle it
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
        console.error('❌ Sign out error:', {
          message: error instanceof Error ? error.message : String(error),
          code: error && typeof error === 'object' && 'code' in error ? error.code : undefined
        });
        setTimeout(() => toast.error('Error signing out'), 0);
      } else {
        console.log('✅ Supabase sign out successful');

        // Clear state immediately
        setUser(null);
        setProfile(null);
        setSession(null);

        // Clear local storage
        clearAuthTokens();

        setTimeout(() => toast.success('Signed out successfully'), 0);
        console.log('🎉 Sign out complete!');
      }
    } catch (error) {
      console.error('❌ Sign out exception:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
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
      // Return error without showing toast - let the component handle it
      return { error: error as AuthError };
    }

    if (data?.error) {
      // Return error without showing toast - let the component handle it
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
        console.error('Error updating profile:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        setTimeout(() => toast.error('Failed to update profile'), 0);
        return { error: new Error(error.message) };
      }

      // Refresh profile data
      await refreshProfile();
      setTimeout(() => toast.success('Profile updated successfully'), 0);
      return { error: null };
    } catch (error) {
      console.error('Error updating profile:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
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

  // Add function to manually clear tokens
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
    loading: (loading || !initialized) && !forceCompletedRef.current,
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
