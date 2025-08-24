import { VulturSSOClientConfig, VulturPermissionConfig } from './types';

/**
 * Global configuration instance
 */
let globalConfig: VulturSSOClientConfig | null = null;

/**
 * Initialize the VULTUR SSO Client with configuration
 */
export function initializeVulturSSO(config: VulturSSOClientConfig): void {
  // Validate required configuration
  if (!config.identApiUrl) {
    throw new Error('identApiUrl is required in VulturSSOClientConfig');
  }
  if (!config.applicationName) {
    throw new Error('applicationName is required in VulturSSOClientConfig');
  }
  if (!config.permissionConfig) {
    throw new Error('permissionConfig is required in VulturSSOClientConfig');
  }

  // Set defaults
  const configWithDefaults: VulturSSOClientConfig = {
    ...config,
    enableCache: config.enableCache ?? true,
    cacheDuration: config.cacheDuration ?? 5 * 60 * 1000, // 5 minutes
  };

  globalConfig = configWithDefaults;
}

/**
 * Get the current configuration
 */
export function getVulturSSOConfig(): VulturSSOClientConfig {
  if (!globalConfig) {
    throw new Error('VULTUR SSO Client not initialized. Call initializeVulturSSO() first.');
  }
  return globalConfig;
}

/**
 * Get the permission configuration for .well-known endpoint
 */
export function getPermissionConfig(): VulturPermissionConfig {
  const config = getVulturSSOConfig();
  return config.permissionConfig;
}

/**
 * Create a permission configuration builder
 */
export class VulturPermissionConfigBuilder {
  private config: Partial<VulturPermissionConfig> = {
    permissions: [],
    defaultPermissions: [],
  };

  static create(applicationName: string, version: string = '1.0.0'): VulturPermissionConfigBuilder {
    const builder = new VulturPermissionConfigBuilder();
    builder.config.applicationName = applicationName;
    builder.config.version = version;
    builder.config.lastUpdated = new Date().toISOString();
    return builder;
  }

  addPermissionScope(scope: {
    id: string;
    name: string;
    description?: string;
    resource: string;
    action: string;
  }): VulturPermissionConfigBuilder {
    if (!this.config.permissions) {
      this.config.permissions = [];
    }
    this.config.permissions.push(scope);
    return this;
  }

  addDefaultPermission(scopeId: string, effect: 'allow' | 'deny' = 'deny'): VulturPermissionConfigBuilder {
    if (!this.config.permissions) {
      throw new Error('Must add permission scopes before adding default permissions');
    }
    
    const scope = this.config.permissions.find(p => p.id === scopeId);
    if (!scope) {
      throw new Error(`Permission scope '${scopeId}' not found`);
    }

    if (!this.config.defaultPermissions) {
      this.config.defaultPermissions = [];
    }

    this.config.defaultPermissions.push({
      scope,
      effect,
    });
    return this;
  }

  build(): VulturPermissionConfig {
    if (!this.config.applicationName) {
      throw new Error('Application name is required');
    }
    if (!this.config.version) {
      throw new Error('Version is required');
    }
    if (!this.config.permissions) {
      throw new Error('At least one permission scope is required');
    }

    return this.config as VulturPermissionConfig;
  }
}

/**
 * Helper function to create common permission patterns
 */
export const PermissionPatterns = {
  /**
   * Create CRUD permissions for a resource
   */
  crud(resource: string, resourceDisplayName?: string): Array<{
    id: string;
    name: string;
    description: string;
    resource: string;
    action: string;
  }> {
    const displayName = resourceDisplayName || resource;
    return [
      {
        id: `${resource}:read`,
        name: `Read ${displayName}`,
        description: `View ${displayName} data`,
        resource,
        action: 'read',
      },
      {
        id: `${resource}:write`,
        name: `Write ${displayName}`,
        description: `Create and update ${displayName} data`,
        resource,
        action: 'write',
      },
      {
        id: `${resource}:delete`,
        name: `Delete ${displayName}`,
        description: `Delete ${displayName} data`,
        resource,
        action: 'delete',
      },
      {
        id: `${resource}:admin`,
        name: `Admin ${displayName}`,
        description: `Full administrative access to ${displayName}`,
        resource,
        action: 'admin',
      },
    ];
  },

  /**
   * Create tribal hierarchy permissions
   */
  tribal(resource: string, resourceDisplayName?: string): Array<{
    id: string;
    name: string;
    description: string;
    resource: string;
    action: string;
  }> {
    const displayName = resourceDisplayName || resource;
    return [
      {
        id: `${resource}:member`,
        name: `${displayName} Member`,
        description: `Basic member access to ${displayName}`,
        resource,
        action: 'member',
      },
      {
        id: `${resource}:officer`,
        name: `${displayName} Officer`,
        description: `Officer-level access to ${displayName}`,
        resource,
        action: 'officer',
      },
      {
        id: `${resource}:director`,
        name: `${displayName} Director`,
        description: `Director-level access to ${displayName}`,
        resource,
        action: 'director',
      },
      {
        id: `${resource}:ceo`,
        name: `${displayName} CEO`,
        description: `CEO-level access to ${displayName}`,
        resource,
        action: 'ceo',
      },
    ];
  },
};
