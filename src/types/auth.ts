// WMC Track Intelligence - Authentication Types

export type UserRole = 
  | 'race_engineering'
  | 'race_operations'
  | 'media_broadcast'
  | 'wmc_admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  salesforceId?: string;
  avatarUrl?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SalesforceAuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    salesforceId: string;
  };
  error?: string;
}

// Role-based access configuration
export const ROLE_ACCESS: Record<UserRole, {
  label: string;
  description: string;
  allowedViews: string[];
  canEdit: boolean;
}> = {
  race_engineering: {
    label: 'Race Engineering',
    description: 'Full Track Editor access',
    allowedViews: ['editor', 'ops', 'media', 'fan'],
    canEdit: true,
  },
  race_operations: {
    label: 'Race Operations',
    description: 'Event Ops View + read-only editor',
    allowedViews: ['editor', 'ops'],
    canEdit: false,
  },
  media_broadcast: {
    label: 'Media & Broadcast',
    description: 'Media Intelligence + read-only views',
    allowedViews: ['editor', 'ops', 'media'],
    canEdit: false,
  },
  wmc_admin: {
    label: 'WMC Admin',
    description: 'Full access to all views + Settings',
    allowedViews: ['editor', 'ops', 'media', 'fan', 'settings'],
    canEdit: true,
  },
};

// Helper to check if a role can access a view
export function canAccessView(role: UserRole | undefined, view: string): boolean {
  if (!role) return false;
  return ROLE_ACCESS[role]?.allowedViews.includes(view) ?? false;
}

// Helper to check if a role can edit
export function canEdit(role: UserRole | undefined): boolean {
  if (!role) return false;
  return ROLE_ACCESS[role]?.canEdit ?? false;
}
