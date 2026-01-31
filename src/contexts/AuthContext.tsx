import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, AuthState, LoginCredentials, UserRole, SalesforceAuthResponse } from '@/types/auth';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'wmc_auth_session';

// Placeholder for SFDC authentication - to be replaced with actual endpoint
async function authenticateWithSalesforce(credentials: LoginCredentials): Promise<SalesforceAuthResponse> {
  // TODO: Replace with actual SFDC endpoint call
  // This is the structure your existing pattern uses
  
  // Mock implementation for development
  // In production, this calls your SFDC credential validation endpoint
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
  
  // Mock users for development - remove when connecting to SFDC
  const mockUsers: Record<string, { password: string; user: User }> = {
    'engineer@wmc.racing': {
      password: 'demo123',
      user: {
        id: 'usr_001',
        email: 'engineer@wmc.racing',
        name: 'Alex Martinez',
        role: 'race_engineering',
        salesforceId: 'sf_001',
      },
    },
    'ops@wmc.racing': {
      password: 'demo123',
      user: {
        id: 'usr_002',
        email: 'ops@wmc.racing',
        name: 'Jordan Chen',
        role: 'race_operations',
        salesforceId: 'sf_002',
      },
    },
    'media@wmc.racing': {
      password: 'demo123',
      user: {
        id: 'usr_003',
        email: 'media@wmc.racing',
        name: 'Sam Williams',
        role: 'media_broadcast',
        salesforceId: 'sf_003',
      },
    },
    'admin@wmc.racing': {
      password: 'demo123',
      user: {
        id: 'usr_004',
        email: 'admin@wmc.racing',
        name: 'Taylor Rodriguez',
        role: 'wmc_admin',
        salesforceId: 'sf_004',
      },
    },
  };

  const mockUser = mockUsers[credentials.email.toLowerCase()];
  
  if (mockUser && mockUser.password === credentials.password) {
    return {
      success: true,
      user: {
        id: mockUser.user.id,
        email: mockUser.user.email,
        name: mockUser.user.name,
        role: mockUser.user.role,
        salesforceId: mockUser.user.salesforceId || '',
      },
    };
  }

  return {
    success: false,
    error: 'Invalid credentials. Please check your email and password.',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Restore session on mount
  useEffect(() => {
    const storedSession = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (storedSession) {
      try {
        const user = JSON.parse(storedSession) as User;
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } catch {
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authenticateWithSalesforce(credentials);

      if (response.success && response.user) {
        const user: User = {
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          role: response.user.role as UserRole,
          salesforceId: response.user.salesforceId,
        };

        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: response.error || 'Authentication failed',
        });
      }
    } catch (err) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Network error. Please try again.',
      });
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
