import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserProfile, EnglishLevel } from '../types';
import { db, supabase } from '../services/db';

interface AuthContextValue {
  isAuthenticated: boolean;
  userProfile: UserProfile;
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  updateProfile: (profile: UserProfile) => void;
  updateEnglishLevel: (level: EnglishLevel) => Promise<void>;
  refreshProfile: () => Promise<void>;
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
        
        if (accessToken && refreshToken) {
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (session && !error) {
            window.history.replaceState({}, document.title, '/Course-Cous/');
            setIsAuthenticated(true);
            await loadUserProfile();
          }
        }

        // Check existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setIsAuthenticated(true);
          await loadUserProfile();
        }

        // Listen to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (import.meta.env.DEV) {
            console.log('Auth state changed:', event);
          }
          
          if (event === 'SIGNED_IN' && session) {
            if (window.location.hash) {
              window.history.replaceState({}, document.title, '/Course-Cous/');
            }
            setIsAuthenticated(true);
            loadUserProfile();
          } else if (event === 'SIGNED_OUT') {
            setIsAuthenticated(false);
            setUserProfile(defaultProfile);
          } else if (event === 'TOKEN_REFRESHED' && session) {
            setIsAuthenticated(true);
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

  const value: AuthContextValue = {
    isAuthenticated,
    userProfile,
    isLoading,
    login,
    logout,
    updateProfile,
    updateEnglishLevel,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
