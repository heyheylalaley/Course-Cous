import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { UserProfile, EnglishLevel } from '../types';
import { db, supabase } from '../services/db';

interface AuthContextValue {
  isAuthenticated: boolean;
  userProfile: UserProfile;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  isDemoUser: boolean;
  login: () => void;
  logout: () => Promise<void>;
  updateProfile: (profile: UserProfile) => void;
  updateEnglishLevel: (level: EnglishLevel) => Promise<void>;
  refreshProfile: () => Promise<void>;
  completePasswordRecovery: () => void;
}

const defaultProfile: UserProfile = {
  id: '',
  email: '',
  englishLevel: 'None'
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isDemoUser, setIsDemoUser] = useState(false);
  const isPasswordRecoveryRef = useRef(isPasswordRecovery);

  useEffect(() => {
    isPasswordRecoveryRef.current = isPasswordRecovery;
  }, [isPasswordRecovery]);

  const loadUserProfile = useCallback(async () => {
    try {
      const profile = await db.getProfile();
      setUserProfile(profile);
      return profile;
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error("Failed to load profile", e);
      }
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadUserProfile();
  }, [loadUserProfile]);

  useEffect(() => {
    let profileChannel: any = null;
    let authSubscription: { unsubscribe: () => void } | null = null;

    // Setup realtime subscription for profile changes
    const setupProfileSubscription = (userId: string) => {
      if (!supabase || profileChannel) return;
      
      profileChannel = supabase
        .channel(`profile-changes-${userId}`)
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`
          },
          () => {
            // Reload profile when it changes (e.g., admin updated it)
            loadUserProfile();
          }
        )
        .subscribe();
    };

    const initAuth = async () => {
      setIsLoading(true);
      
      // Check for demo session first
      const isDemo = await db.isDemoUser();
      if (isDemo) {
        setIsDemoUser(true);
        setIsAuthenticated(true);
        await loadUserProfile();
        setIsLoading(false);
        return;
      }
      
      // Handle Supabase auth callback
      if (supabase) {
        let skipSessionCheck = false;
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        // Check if this is a password recovery flow
        const isRecoveryFlow = type === 'recovery';
        
        if (accessToken && refreshToken) {
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (session && !error) {
            // Clear URL hash
            window.history.replaceState({}, document.title, import.meta.env.BASE_URL);
            
            if (isRecoveryFlow) {
              // Password recovery - set flag instead of auto-login
              setIsPasswordRecovery(true);
              setIsAuthenticated(true);
              skipSessionCheck = true;
              // Don't load profile yet - let user update password first
            } else {
              // Normal login flow
              setIsAuthenticated(true);
              await loadUserProfile();
              
              // Setup realtime subscription for profile updates
              setupProfileSubscription(session.user.id);
            }
          }
        }

        // Check existing session (but not if we're in recovery mode)
        if (!skipSessionCheck && !isPasswordRecoveryRef.current) {
          try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
              // Silently handle invalid refresh token errors
              if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token')) {
                // Clear invalid session silently
                await supabase.auth.signOut();
              }
            } else if (session?.user) {
              setIsAuthenticated(true);
              await loadUserProfile();
              
              // Setup realtime subscription for profile updates
              setupProfileSubscription(session.user.id);
            }
          } catch (err: any) {
            // Silently handle refresh token errors
            if (err?.message?.includes('Refresh Token') || err?.message?.includes('refresh_token')) {
              // Clear invalid session silently
              try {
                await supabase.auth.signOut();
              } catch {
                // Ignore sign out errors
              }
            }
          }
        }

        // Listen to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          // Handle PASSWORD_RECOVERY event from Supabase
          if (event === 'PASSWORD_RECOVERY' && session) {
            setIsPasswordRecovery(true);
            setIsAuthenticated(true);
            if (window.location.hash) {
              window.history.replaceState({}, document.title, import.meta.env.BASE_URL);
            }
          } else if (event === 'SIGNED_IN' && session) {
            // Only auto-login if not in password recovery mode
            if (!isPasswordRecoveryRef.current) {
              if (window.location.hash) {
                window.history.replaceState({}, document.title, import.meta.env.BASE_URL);
              }
              setIsAuthenticated(true);
              loadUserProfile();
              
              // Setup realtime subscription for profile updates
              setupProfileSubscription(session.user.id);
            }
          } else if (event === 'SIGNED_OUT') {
            setIsAuthenticated(false);
            setIsPasswordRecovery(false);
            setIsDemoUser(false);
            setUserProfile(defaultProfile);
            
            // Clean up profile subscription
            if (profileChannel && supabase) {
              supabase.removeChannel(profileChannel);
              profileChannel = null;
            }
          } else if (event === 'TOKEN_REFRESHED' && session) {
            setIsAuthenticated(true);
          } else if (event === 'TOKEN_REFRESHED' && !session) {
            // Token refresh failed - user needs to sign in again
            setIsAuthenticated(false);
            setIsPasswordRecovery(false);
            setIsDemoUser(false);
            setUserProfile(defaultProfile);
          } else if (event === 'USER_UPDATED' && session) {
            // Password was updated successfully
            if (isPasswordRecoveryRef.current) {
              setIsPasswordRecovery(false);
              loadUserProfile();
            }
          }
        });

        authSubscription = subscription;
        setIsLoading(false);
      } else {
        // Mock mode
        const session = db.getCurrentSession();
        if (session) {
          setIsAuthenticated(true);
          await loadUserProfile();
        }
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      if (profileChannel && supabase) {
        supabase.removeChannel(profileChannel);
      }
    };
  }, [loadUserProfile]);

  const login = useCallback(async () => {
    setIsAuthenticated(true);
    // Check if this is a demo login
    const isDemo = await db.isDemoUser();
    setIsDemoUser(isDemo);
    loadUserProfile();
  }, [loadUserProfile]);

  const logout = useCallback(async () => {
    await db.signOut();
    setIsAuthenticated(false);
    setIsDemoUser(false);
    setUserProfile(defaultProfile);
  }, []);

  const updateProfile = useCallback((newProfile: UserProfile) => {
    setUserProfile(prev => {
      // Only update if profile actually changed
      if (prev.id === newProfile.id && 
          prev.email === newProfile.email &&
          prev.englishLevel === newProfile.englishLevel &&
          prev.firstName === newProfile.firstName &&
          prev.lastName === newProfile.lastName &&
          prev.address === newProfile.address &&
          prev.eircode === newProfile.eircode &&
          prev.mobileNumber === newProfile.mobileNumber &&
          prev.dateOfBirth === newProfile.dateOfBirth) {
        return prev;
      }
      return newProfile;
    });
  }, []);

  const updateEnglishLevel = useCallback(async (level: EnglishLevel) => {
    await db.updateEnglishLevel(level);
    setUserProfile(prev => ({ ...prev, englishLevel: level }));
  }, []);

  const completePasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
    loadUserProfile();
  }, [loadUserProfile]);

  const value: AuthContextValue = {
    isAuthenticated,
    userProfile,
    isLoading,
    isPasswordRecovery,
    isDemoUser,
    login,
    logout,
    updateProfile,
    updateEnglishLevel,
    refreshProfile,
    completePasswordRecovery
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
