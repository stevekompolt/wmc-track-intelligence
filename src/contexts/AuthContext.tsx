import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, AuthState, LoginCredentials, UserRole } from '@/types/auth';
import { z } from 'zod';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'wmc_auth_session';
const SFDC_API_BASE = 'https://api.realintelligence.com/api';
const SFDC_ORG_ID = '00D5e000000HEcP';

// Input validation schema
const loginSchema = z.object({
  email: z.string().trim().email('Invalid email format').max(255, 'Email too long'),
  password: z.string().min(1, 'Password required').max(128, 'Password too long'),
});

// Extract role from XML-style tag in response
function extractRoleFromResponse(responseText: string): UserRole {
  const match = responseText.match(/<intelrole>([^<]+)<\/intelrole>/i);
  const roleValue = match ? match[1].trim().toLowerCase() : '';
  
  const roleMap: Record<string, UserRole> = {
    'race_engineering': 'race_engineering',
    'race engineering': 'race_engineering',
    'engineering': 'race_engineering',
    'race_operations': 'race_operations',
    'race operations': 'race_operations',
    'operations': 'race_operations',
    'media_broadcast': 'media_broadcast',
    'media & broadcast': 'media_broadcast',
    'media': 'media_broadcast',
    'wmc_admin': 'wmc_admin',
    'admin': 'wmc_admin',
  };

  return roleMap[roleValue] || 'wmc_admin';
}

// Extract password from XML-style tag in response
function extractPasswordFromResponse(responseText: string): string | null {
  const match = responseText.match(/<ripassword>([^<]+)<\/ripassword>/);
  return match ? match[1] : null;
}

// Parse user data from response
function parseUserFromResponse(responseData: any): Partial<User> | null {
  try {
    // Handle different response formats
    if (typeof responseData === 'string') {
      // Try to parse as JSON if string
      try {
        responseData = JSON.parse(responseData);
      } catch {
        // Not JSON, might be XML-style
        return null;
      }
    }

    // Extract user fields - adjust based on actual SFDC response structure
    const id = responseData.Id || responseData.id || responseData.sfdc_id || '';
    const email = responseData.Email || responseData.email || '';
    const name = responseData.Name || responseData.name || 
                 `${responseData.FirstName || ''} ${responseData.LastName || ''}`.trim() || 
                 email.split('@')[0];

    if (!id && !email) return null;

    return {
      id,
      email,
      name,
      salesforceId: responseData.Id || responseData.sfdc_id,
    };
  } catch {
    return null;
  }
}

async function authenticateWithSalesforce(credentials: LoginCredentials): Promise<{
  success: boolean;
  user?: User;
  error?: string;
}> {
  try {
    // Validate input
    const validation = loginSchema.safeParse(credentials);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Invalid credentials format',
      };
    }

    const { email, password } = validation.data;

    // Query SFDC endpoint
    const url = `${SFDC_API_BASE}/specific-wmc-member-email.py?orgId=${encodeURIComponent(SFDC_ORG_ID)}&email=${encodeURIComponent(email)}&sandbox=False`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'User not found. Please check your email.' };
      }
      return { success: false, error: 'Authentication service unavailable. Please try again.' };
    }

    const responseText = await response.text();
    
    // Extract password from response
    const storedPassword = extractPasswordFromResponse(responseText);
    
    if (!storedPassword) {
      return { success: false, error: 'User not found or account not configured.' };
    }

    // Validate password
    if (password !== storedPassword) {
      return { success: false, error: 'Invalid credentials. Please check your password.' };
    }

    // Parse user data - try JSON first
    let userData: any;
    try {
      userData = JSON.parse(responseText);
    } catch {
      // Try to extract from XML-style response if not JSON
      userData = { email };
    }

    const user = parseUserFromResponse(userData);
    const role = extractRoleFromResponse(responseText);
    
    if (!user) {
      return { success: false, error: 'Unable to process user data.' };
    }

    return {
      success: true,
      user: {
        id: user.id || `usr_${Date.now()}`,
        email: user.email || email,
        name: user.name || email.split('@')[0],
        role,
        salesforceId: user.salesforceId,
      },
    };

  } catch (error) {
    console.error('Auth error:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.',
    };
  }
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

    const result = await authenticateWithSalesforce(credentials);

    if (result.success && result.user) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(result.user));
      setState({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } else {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: result.error || 'Authentication failed',
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
