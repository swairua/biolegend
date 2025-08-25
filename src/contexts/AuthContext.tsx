import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createRetryableRequest, analyzeNetworkError } from '@/utils/networkDiagnostics';
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
      console.log('🔍 Fetching profile for user ID:', userId);

      const profileData = await createRetryableRequest(async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(); // Use maybeSingle to handle 0 results gracefully

        if (error) {
          throw error;
        }

        return data;
      }, 2, 1000); // Retry up to 2 times with 1 second delay

      if (!profileData) {
        console.warn('⚠️ No profile found for user ID:', userId);
        return null;
      }

      console.log('✅ Profile found:', {
        id: profileData.id,
        email: profileData.email
      });

      return profileData;
    } catch (error) {
      console.error('Exception fetching profile:', error);

      // Analyze the error for better user feedback
      const diagnostic = analyzeNetworkError(error);

      console.warn(`Profile fetch failed: ${diagnostic.type} - ${diagnostic.message}`);

      // Only show toast for certain error types to avoid spam
      if (diagnostic.type === 'browser_extension') {
        setTimeout(() => toast.error(
          'Browser extension is blocking the request. Try disabling extensions or use incognito mode.',
          { duration: 6000 }
        ), 0);
      } else if (diagnostic.type === 'network') {
        setTimeout(() => toast.error(
          'Network connection failed. Please check your internet connection.',
          { duration: 4000 }
        ), 0);
      }

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

  // Handle auth state changes with improved error handling
  const handleAuthStateChange = useCallback(async (event: string, newSession: Session | null) => {
    if (!mountedRef.current || initializingRef.current) return;

    console.log('Auth state changed:', event, newSession?.user?.email);
    
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
      console.error('Error in auth state change:', error);
      
      // If we get invalid token errors, clear tokens
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message;
        if (errorMessage?.includes('Invalid Refresh Token') || 
            errorMessage?.includes('Refresh Token Not Found')) {
          console.warn('Clearing invalid tokens due to auth state error');
          clearAuthTokens();
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchProfile, updateLastLogin]);

  // Initialize auth state with improved error handling and timeout
  useEffect(() => {
    if (initializingRef.current) return;

    initializingRef.current = true;
    mountedRef.current = true;

    const initializeAuthState = async () => {
      const initStartTime = Date.now();
      const INIT_TIMEOUT = 10000; // 10 second timeout

      try {
        console.log('🚀 Initializing auth state...');

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Auth initialization timeout')), INIT_TIMEOUT);
        });

        // Race the initialization against the timeout
        const initPromise = (async () => {
          // Use the helper function for initialization
          const { session: initialSession, error } = await initializeAuth();

          if (error) {
            console.error('❌ Error during auth initialization:', error);
            return { session: null, error };
          }

          if (initialSession?.user && mountedRef.current) {
            console.log('✅ Found valid session, fetching profile...');

            // Add timeout to profile fetching as well
            const profilePromise = fetchProfile(initialSession.user.id);
            const profileTimeoutPromise = new Promise<UserProfile | null>((_, reject) => {
              setTimeout(() => reject(new Error('Profile fetch timeout')), 5000);
            });

            let userProfile: UserProfile | null = null;
            try {
              userProfile = await Promise.race([profilePromise, profileTimeoutPromise]);
            } catch (profileError) {
              console.warn('⚠️ Profile fetch failed or timed out:', profileError);
              // Continue without profile - we still have a valid session
            }

            return { session: initialSession, profile: userProfile, error: null };
          } else {
            console.log('ℹ️ No valid session found');
            return { session: null, profile: null, error: null };
          }
        })();

        // Wait for either initialization or timeout
        const result = await Promise.race([initPromise, timeoutPromise]);

        if (mountedRef.current && typeof result === 'object' && result !== null) {
          const { session: initialSession, profile: userProfile } = result as any;

          if (initialSession?.user) {
            setSession(initialSession);
            setUser(initialSession.user);
            setProfile(userProfile);

            // Update last login silently (don't await)
            if (userProfile) {
              updateLastLogin(initialSession.user.id).catch(console.error);
            }

            console.log('✅ Auth initialization completed successfully');
          }
        }

      } catch (error) {
        const initDuration = Date.now() - initStartTime;
        console.error('❌ Error initializing auth (took', initDuration + 'ms):', error);

        // Handle different types of errors
        if (error instanceof Error && error.message.includes('timeout')) {
          console.warn('⏰ Auth initialization timed out - app will continue without authentication');
          toast.warning('Authentication check timed out. You may need to sign in again.');
        } else if (error && typeof error === 'object' && 'message' in error) {
          const errorMessage = (error as any).message;
          if (errorMessage?.includes('Invalid Refresh Token') ||
              errorMessage?.includes('Refresh Token Not Found')) {
            console.warn('🧹 Clearing invalid tokens during initialization');
            clearAuthTokens();
            toast.info('Authentication tokens were cleared. Please sign in again.');
          }
        }

        // Ensure we always complete initialization even on error
        if (mountedRef.current) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setInitialized(true);
          initializingRef.current = false;
          console.log('🏁 Auth initialization finalized');
        }
      }
    };

    initializeAuthState();

    // Safety timeout - force complete initialization after 20 seconds
    const safetyTimeout = setTimeout(() => {
      if (mountedRef.current && !initialized && !forceCompletedRef.current) {
        console.warn('🚨 Force completing auth initialization due to timeout');
        forceCompletedRef.current = true;
        setLoading(false);
        setInitialized(true);
        initializingRef.current = false;
        toast.warning('Authentication initialization took too long and was force completed. You may need to sign in again.');
      }
    }, 20000); // 20 second safety timeout

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
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
      setTimeout(() => toast.error(error.message), 0);
      setLoading(false);
      return { error: error as AuthError };
    }

    if (data?.error) {
      setTimeout(() => toast.error(data.error.message), 0);
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
      setTimeout(() => toast.error(error.message), 0);
      setLoading(false);
      return { error: error as AuthError };
    }

    if (data?.error) {
      setTimeout(() => toast.error(data.error.message), 0);
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
      setTimeout(() => toast.error(error.message), 0);
      return { error: error as AuthError };
    }

    if (data?.error) {
      setTimeout(() => toast.error(data.error.message), 0);
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

  // Add function to manually clear tokens
  const clearTokens = useCallback(() => {
    clearAuthTokens();
    setUser(null);
    setProfile(null);
    setSession(null);
    toast.info('Authentication tokens cleared. Please sign in again.');
  }, []);

  // Compute derived state - only require user since we removed role-based system
  const isAuthenticated = !!user;

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
    refreshProfile,
    clearTokens,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
