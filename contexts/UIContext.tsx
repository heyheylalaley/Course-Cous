import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Language, Theme } from '../types';

interface UIContextValue {
  language: Language;
  theme: Theme;
  isSidebarOpen: boolean;
  activeTab: 'chat' | 'dashboard' | 'admin';
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveTab: (tab: 'chat' | 'dashboard' | 'admin') => void;
  isRtl: boolean;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

interface UIProviderProps {
  children: ReactNode;
}

const getInitialTheme = (): Theme => {
  const saved = localStorage.getItem('theme') as Theme;
  return saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
};

const getInitialActiveTab = (): 'chat' | 'dashboard' | 'admin' => {
  const saved = localStorage.getItem('appActiveTab');
  if (saved && ['chat', 'dashboard', 'admin'].includes(saved)) {
    return saved as 'chat' | 'dashboard' | 'admin';
  }
  return 'chat';
};

export const UIProvider: React.FC<UIProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTabState] = useState<'chat' | 'dashboard' | 'admin'>(getInitialActiveTab);

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Save activeTab to localStorage
  useEffect(() => {
    localStorage.setItem('appActiveTab', activeTab);
  }, [activeTab]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const setSidebarOpen = useCallback((open: boolean) => {
    setIsSidebarOpen(open);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  const setActiveTab = useCallback((tab: 'chat' | 'dashboard' | 'admin') => {
    setActiveTabState(tab);
    setIsSidebarOpen(false); // Close sidebar on tab change (mobile)
  }, []);

  const isRtl = language === 'ar';

  const value: UIContextValue = {
    language,
    theme,
    isSidebarOpen,
    activeTab,
    setLanguage,
    setTheme,
    toggleTheme,
    setSidebarOpen,
    toggleSidebar,
    setActiveTab,
    isRtl
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};
