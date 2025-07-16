import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  userRole: string | null;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; isBlocked?: boolean }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  createProfile: (profileData: Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let loadingTimeout: NodeJS.Timeout;

    // Set loading timeout to prevent indefinite loading
    const setLoadingTimeout = () => {
      loadingTimeout = setTimeout(() => {
        if (isMounted) {
          console.warn('Auth loading timeout reached, setting loading to false');
          setLoading(false);
        }
      }, 10000); // 10 second timeout
    };

    const clearLoadingTimeout = () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };

    const fetchProfile = async (userId: string) => {
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching profile:', error);
        }
        
        if (isMounted) {
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Profile fetch error:', error);
        if (isMounted) {
          setProfile(null);
        }
      }
    };

    const fetchUserRole = async (userId: string) => {
      try {
        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user role:', error);
        }
        
        if (isMounted) {
          const role = roleData?.role || 'user';
          setUserRole(role);
          setIsAdmin(role === 'admin');
        }
      } catch (error) {
        console.error('Role fetch error:', error);
        if (isMounted) {
          setUserRole('user');
          setIsAdmin(false);
        }
      }
    };

    // Initialize auth state first
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch profile and role if user exists
        if (session?.user) {
          await fetchProfile(session.user.id);
          await fetchUserRole(session.user.id);
        } else {
          setProfile(null);
          setUserRole(null);
          setIsAdmin(false);
        }
        
        // Set loading to false after initialization
        setLoading(false);
        clearLoadingTimeout();
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          setLoading(false);
          clearLoadingTimeout();
        }
      }
    };

    // Set up auth state listener (non-async callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        // Update session and user immediately
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle profile and role fetching in a separate microtask to avoid blocking
        if (session?.user) {
          setTimeout(() => {
            if (isMounted) {
              fetchProfile(session.user.id);
              fetchUserRole(session.user.id);
            }
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
          setIsAdmin(false);
        }
        
        // Ensure loading is set to false
        setLoading(false);
        clearLoadingTimeout();
      }
    );

    // Start loading timeout
    setLoadingTimeout();
    
    // Initialize auth
    initializeAuth();

    return () => {
      isMounted = false;
      clearLoadingTimeout();
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Check if user is blocked before attempting login
      const { data: isBlocked } = await supabase.rpc('is_user_blocked', { user_email: email });
      
      if (isBlocked) {
        return { 
          error: { message: 'Account temporarily blocked due to multiple failed login attempts. Please reset your password to continue.' },
          isBlocked: true 
        };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      // Record the login attempt
      await supabase.rpc('record_login_attempt', { 
        user_email: email, 
        is_successful: !error 
      });

      if (error) {
        // Get current failed attempts to show appropriate message
        const { data: attempts } = await supabase
          .from('login_attempts')
          .select('failed_attempts')
          .eq('email', email)
          .maybeSingle();
        
        const failedAttempts = attempts?.failed_attempts || 0;
        const remainingAttempts = 5 - failedAttempts;
        
        if (remainingAttempts <= 0) {
          return { 
            error: { message: 'Account blocked due to multiple failed login attempts. Please reset your password to continue.' },
            isBlocked: true 
          };
        } else if (remainingAttempts <= 2) {
          return { 
            error: { message: `Invalid credentials. ${remainingAttempts} attempt(s) remaining before account is blocked.` }
          };
        }
      }

      return { error };
    } catch (err) {
      console.error('Sign in error:', err);
      return { error: err };
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const createProfile = async (profileData: Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return { error: 'No user logged in' };
    
    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        user_id: user.id,
        ...profileData
      }])
      .select()
      .single();

    if (!error && data) {
      setProfile(data);
    }

    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      isAdmin,
      userRole,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      createProfile,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};