
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, PlanType, ThemeMode } from '../../types';
import { api, setAuthToken, removeAuthToken, getAuthToken } from '../../services/api';
import { getCurrentUser, updateUserInStorage } from '../../services/storageService';

export type UserCenterTab = 'account' | 'settings' | 'usage' | 'connectors';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  
  // Theme
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  // Modal Controls
  isLoginOpen: boolean;
  isSubscriptionOpen: boolean;
  isProfileOpen: boolean;
  activeProfileTab: UserCenterTab;
  
  openLogin: () => void;
  closeLogin: () => void;
  openSubscription: () => void;
  closeSubscription: () => void;
  openProfile: (tab?: UserCenterTab) => void;
  closeProfile: () => void;
  
  // Actions
  upgradePlan: (plan: PlanType) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Theme State
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  // Modal States
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<UserCenterTab>('account');

  useEffect(() => {
    const initAuth = async () => {
      // 1. Check API Token
      if (getAuthToken()) {
          try {
              const remoteUser = await api.auth.me();
              setUser(remoteUser);
          } catch (err) {
              console.warn("Auth check failed", err);
              removeAuthToken();
              // Fallback to local user if any (for offline/demo)
              const storedUser = getCurrentUser();
              if (storedUser) setUser(storedUser);
          }
      } else {
          // Fallback
          const storedUser = getCurrentUser();
          if (storedUser) setUser(storedUser);
      }
      
      const savedTheme = localStorage.getItem('enexus_theme_mode') as ThemeMode;
      if (savedTheme) setThemeMode(savedTheme);

      setIsLoading(false);
    };
    initAuth();
  }, []);

  // Theme Effect (Unchanged)
  useEffect(() => {
      const applyTheme = () => {
          let resolvedTheme: 'light' | 'dark' = 'light';
          if (themeMode === 'system') {
              const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              resolvedTheme = systemDark ? 'dark' : 'light';
          } else {
              resolvedTheme = themeMode;
          }

          if (resolvedTheme === 'dark') {
              document.documentElement.classList.add('dark');
          } else {
              document.documentElement.classList.remove('dark');
          }
      };

      applyTheme();
      localStorage.setItem('enexus_theme_mode', themeMode);

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => { if (themeMode === 'system') applyTheme(); };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
  }, [themeMode]);

  const login = async (data: any) => {
    setIsLoading(true);
    try {
        const res = await api.auth.login(data);
        setAuthToken(res.token);
        setUser(res.user);
        setIsLoginOpen(false);
    } catch (err) {
        setIsLoading(false);
        throw err;
    }
    setIsLoading(false);
  };

  const register = async (data: any) => {
      setIsLoading(true);
      try {
          const res = await api.auth.register(data);
          setAuthToken(res.token);
          setUser(res.user);
          setIsLoginOpen(false);
      } catch (err) {
          setIsLoading(false);
          throw err;
      }
      setIsLoading(false);
  };

  const logout = () => {
    removeAuthToken();
    // Also clear local storage user for complete logout
    localStorage.removeItem('enexus_user');
    setUser(null);
    setIsProfileOpen(false);
    // Reload to clear sensitive state
    window.location.reload();
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    updateUserInStorage(updated); // Sync local
    // TODO: Sync remote /api/auth/update
  };

  const upgradePlan = (plan: PlanType) => {
      if (!user) return;
      
      let creditsToAdd = 0;
      if (plan === 'pro') creditsToAdd = 1000;
      if (plan === 'team') creditsToAdd = 5000;

      updateUser({
          plan,
          credits: user.credits + creditsToAdd
      });
      setIsSubscriptionOpen(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      register,
      logout,
      updateUser,
      themeMode,
      setThemeMode,
      isLoginOpen,
      openLogin: () => setIsLoginOpen(true),
      closeLogin: () => setIsLoginOpen(false),
      isSubscriptionOpen,
      openSubscription: () => setIsSubscriptionOpen(true),
      closeSubscription: () => setIsSubscriptionOpen(false),
      isProfileOpen,
      activeProfileTab,
      openProfile: (tab = 'account') => { setActiveProfileTab(tab); setIsProfileOpen(true); },
      closeProfile: () => setIsProfileOpen(false),
      upgradePlan
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
