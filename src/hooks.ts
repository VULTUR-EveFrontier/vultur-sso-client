import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { getVulturSSOConfig } from './config';
import { 
  UserInfo, 
  UserRole, 
  UserPermissions, 
  Permission, 
  VulturSSOError,
  UseVulturPermissionsOptions 
} from './types';

/**
 * API client for fetching user data from vultur-ident-api
 */
class VulturIdentApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private getAuthHeaders(): HeadersInit {
    // Get the JWT token from localStorage (set by the login process)
    const token = typeof window !== 'undefined' ? localStorage.getItem('vultur_sso_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async getCurrentUser(): Promise<UserInfo> {
    const response = await fetch(`${this.baseUrl}/me`, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new VulturSSOError('UNAUTHORIZED', 'Not authenticated');
      }
      throw new VulturSSOError('NETWORK_ERROR', `Get current user failed: ${response.status}`);
    }

    return response.json();
  }

  async getUserRoles(address: string): Promise<UserRole[]> {
    const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(address)}/roles`, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new VulturSSOError('UNAUTHORIZED', 'Not authenticated');
      }
      if (response.status === 404) {
        throw new VulturSSOError('NOT_FOUND', 'User not found');
      }
      throw new VulturSSOError('NETWORK_ERROR', `Get user roles failed: ${response.status}`);
    }

    return response.json();
  }
}

/**
 * Permission resolver that combines user roles with application permissions
 */
class PermissionResolver {
  static resolveUserPermissions(
    user: UserInfo,
    roles: UserRole[],
    applicationName: string
  ): Permission[] {
    // This is a simplified implementation
    // In a real implementation, you would:
    // 1. Fetch the application's permission mapping from vultur-ident-api
    // 2. Map user roles to application-specific permissions
    // 3. Apply policy rules and inheritance
    
    const permissions: Permission[] = [];
    const config = getVulturSSOConfig();
    
    // For now, we'll create basic permissions based on roles
    // This should be replaced with actual permission resolution logic
    for (const roleName of user.roles) {
      const role = roles.find(r => r.name === roleName);
      if (role && role.is_active) {
        // Map role to application permissions
        // This is where you'd implement your role -> permission mapping logic
        for (const permissionScope of config.permissionConfig.permissions) {
          // Simple mapping example - you'll want to make this more sophisticated
          if (user.is_admin) {
            permissions.push({
              scope: permissionScope,
              effect: 'allow'
            });
          } else if (roleName.toLowerCase().includes('member')) {
            if (permissionScope.action === 'read') {
              permissions.push({
                scope: permissionScope,
                effect: 'allow'
              });
            }
          }
        }
      }
    }

    return permissions;
  }
}

/**
 * Custom error class for VULTUR SSO operations
 */
class VulturSSOError extends Error {
  public code: VulturSSOError['code'];
  public details?: unknown;

  constructor(code: VulturSSOError['code'], message: string, details?: unknown) {
    super(message);
    this.name = 'VulturSSOError';
    this.code = code;
    this.details = details;
  }
}

/**
 * React hook for fetching user permissions for the current application
 */
export function useVulturPermissions(
  options: UseVulturPermissionsOptions = {}
): UseQueryResult<UserPermissions, VulturSSOError> {
  const {
    enabled = true,
    apiUrl,
    refetchOnWindowFocus = false,
    refetchInterval,
  } = options;

  return useQuery({
    queryKey: ['vultur-permissions'],
    queryFn: async (): Promise<UserPermissions> => {
      try {
        const config = getVulturSSOConfig();
        const baseUrl = apiUrl || config.identApiUrl;
        const client = new VulturIdentApiClient(baseUrl);

        // Fetch current user and their roles
        const user = await client.getCurrentUser();
        const roles = await client.getUserRoles(user.eth_address);

        // Resolve permissions for this application
        const permissions = PermissionResolver.resolveUserPermissions(
          user,
          roles,
          config.applicationName
        );

        return {
          user,
          roles,
          permissions,
          isAdmin: user.is_admin,
          fetchedAt: new Date().toISOString(),
        };
      } catch (error) {
        if (error instanceof VulturSSOError) {
          throw error;
        }
        throw new VulturSSOError(
          'NETWORK_ERROR',
          'Failed to fetch user permissions',
          error
        );
      }
    },
    enabled,
    refetchOnWindowFocus,
    refetchInterval,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof VulturSSOError && error.code === 'UNAUTHORIZED') {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook that returns permission checking functions
 */
export function usePermissionCheck() {
  const { data: userPermissions } = useVulturPermissions();

  const hasPermission = (scopeId: string, requiredEffect: 'allow' | 'deny' = 'allow'): boolean => {
    if (!userPermissions) return false;
    
    const permission = userPermissions.permissions.find(p => p.scope.id === scopeId);
    return permission?.effect === requiredEffect;
  };

  const hasAnyPermission = (scopeIds: string[], requiredEffect: 'allow' | 'deny' = 'allow'): boolean => {
    return scopeIds.some(scopeId => hasPermission(scopeId, requiredEffect));
  };

  const hasAllPermissions = (scopeIds: string[], requiredEffect: 'allow' | 'deny' = 'allow'): boolean => {
    return scopeIds.every(scopeId => hasPermission(scopeId, requiredEffect));
  };

  const hasRole = (roleName: string): boolean => {
    if (!userPermissions) return false;
    return userPermissions.user.roles.includes(roleName);
  };

  const isAdmin = (): boolean => {
    return userPermissions?.isAdmin ?? false;
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isAdmin,
    userPermissions,
  };
}

/**
 * Hook for checking if the current user is authenticated
 */
export function useVulturAuth() {
  const { data: userPermissions, isLoading, error } = useVulturPermissions({
    refetchOnWindowFocus: true,
  });

  return {
    isAuthenticated: !!userPermissions,
    user: userPermissions?.user,
    isLoading,
    error,
  };
}
