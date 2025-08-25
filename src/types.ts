/**
 * Permission scope definition
 */
export type PermissionScope = {
  /** Unique identifier for the permission scope */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this permission grants */
  description?: string;
  /** Resource this permission applies to (e.g., 'tribes', 'fleet', 'warehouse') */
  resource: string;
  /** Action this permission allows (e.g., 'read', 'write', 'delete', 'admin') */
  action: string;
};

/**
 * Permission effect - whether to allow or deny
 */
export type PermissionEffect = 'allow' | 'deny';

/**
 * Permission entry with scope and effect
 */
export type Permission = {
  scope: PermissionScope;
  effect: PermissionEffect;
};

/**
 * Application permission configuration
 */
export type VulturPermissionConfig = {
  /** Application name */
  applicationName: string;
  /** Application version */
  version: string;
  /** List of permission scopes this application defines */
  permissions: PermissionScope[];
  /** Default permissions for unauthenticated users */
  defaultPermissions?: Permission[];
  /** Timestamp when configuration was last updated */
  lastUpdated: string;
};

/**
 * User role from vultur-ident-api
 */
export type UserRole = {
  id: number;
  name: string;
  description?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

/**
 * User information from vultur-ident-api
 */
export type UserInfo = {
  eth_address: string;
  character_name: string;
  roles: string[];
  is_admin: boolean;
  tribe_id?: number | null;
};

/**
 * Resolved user permissions for current application
 */
export type UserPermissions = {
  /** User information */
  user: UserInfo;
  /** User's roles with full details */
  roles: UserRole[];
  /** Resolved permissions for current application */
  permissions: Permission[];
  /** Whether user has admin privileges */
  isAdmin: boolean;
  /** Timestamp when permissions were fetched */
  fetchedAt: string;
};

/**
 * Configuration for the SSO client
 */
export type VulturSSOClientConfig = {
  /** Base URL for vultur-ident-api */
  identApiUrl: string;
  /** Application name (must match registered application) */
  applicationName: string;
  /** Local permission configuration */
  permissionConfig: VulturPermissionConfig;
  /** Whether to cache permissions locally */
  enableCache?: boolean;
  /** Cache duration in milliseconds (default: 5 minutes) */
  cacheDuration?: number;
};

// VulturSSOError is now defined as a class in server.ts

/**
 * Hook options for useVulturPermissions
 */
export type UseVulturPermissionsOptions = {
  /** Whether to enable the hook */
  enabled?: boolean;
  /** Custom API URL override */
  apiUrl?: string;
  /** Whether to refetch on window focus */
  refetchOnWindowFocus?: boolean;
  /** Refetch interval in milliseconds */
  refetchInterval?: number;
};
