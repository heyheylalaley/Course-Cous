import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserProfile, EnglishLevel } from '../types';
import { db, supabase } from '../services/db';

interface AuthContextValue {
  isAuthenticated: boolean;
  userProfile: UserProfile;
  isLoading: boolean;
  isPasswordRecovery: boolean;
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
    const initAuth = async () => {
      setIsLoading(true);
      
      // Handle Supabase auth callback
      if (supabase) {
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
              // Don't load profile yet - let user update password first
            } else {
              // Normal login flow
              setIsAuthenticated(true);
              await loadUserProfile();
            }
          }
        }

        // Check existing session (but not if we're in recovery mode)
        if (!isPasswordRecovery) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setIsAuthenticated(true);
            await loadUserProfile();
          }
        }

        // Listen to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (import.meta.env.DEV) {
            console.log('Auth state changed:', event);
          }
          
          // Handle PASSWORD_RECOVERY event from Supabase
          if (event === 'PASSWORD_RECOVERY' && session) {
            setIsPasswordRecovery(true);
            setIsAuthenticated(true);
            if (window.location.hash) {
              window.history.replaceState({}, document.title, import.meta.env.BASE_URL);
            }
          } else if (event === 'SIGNED_IN' && session) {
            // Only auto-login if not in password recovery mode
            if (!isPasswordRecovery) {
              if (window.location.hash) {
                window.history.replaceState({}, document.title, import.meta.env.BASE_URL);
              }
              setIsAuthenticated(true);
              loadUserProfile();
            }
          } else if (event === 'SIGNED_OUT') {
            setIsAuthenticated(false);
            setIsPasswordRecovery(false);
            setUserProfile(defaultProfile);
          } else if (event === 'TOKEN_REFRESHED' && session) {
            setIsAuthenticated(true);
          } else if (event === 'USER_UPDATED' && session) {
            // Password was updated successfully
            if (isPasswordRecovery) {
              setIsPasswordRecovery(false);
              loadUserProfile();
            }
          }
        });

        setIsLoading(false);
        return () => subscription.unsubscribe();
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
  }, [loadUserProfile]);

  const login = useCallback(() => {
    setIsAuthenticated(true);
    loadUserProfile();
  }, [loadUserProfile]);

  const logout = useCallback(async () => {
    // Reset demo user data before signing out
    await db.resetDemoUserData();
    await db.signOut();
    setIsAuthenticated(false);
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
