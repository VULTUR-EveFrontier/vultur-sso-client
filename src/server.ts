/**
 * Server-side utilities for vultur-sso-client
 * Use these in Next.js API routes to validate JWTs and interact with vultur-ident-api
 */

import { UserInfo, UserRole } from './types';

/**
 * Configuration for server-side operations
 */
export type ServerConfig = {
  identApiUrl: string;
  /** Optional: cache TTL in milliseconds */
  cacheTTL?: number;
};

export class VulturSSOError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'VulturSSOError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Server-side API client for vultur-ident-api
 */
export class VulturIdentServerClient {
  private baseUrl: string;
  private cacheTTL: number;

  constructor(config: ServerConfig) {
    this.baseUrl = config.identApiUrl.replace(/\/$/, '');
    this.cacheTTL = config.cacheTTL || 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Validate a JWT token and get user information
   */
  async validateToken(token: string): Promise<UserInfo> {
    const response = await fetch(`${this.baseUrl}/me`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new VulturSSOError('UNAUTHORIZED', 'Invalid or expired token');
      }
      throw new VulturSSOError('NETWORK_ERROR', `Token validation failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get user roles by address
   */
  async getUserRoles(address: string, token: string): Promise<UserRole[]> {
    const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(address)}/roles`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new VulturSSOError('UNAUTHORIZED', 'Invalid or expired token');
      }
      if (response.status === 404) {
        throw new VulturSSOError('NOT_FOUND', 'User not found');
      }
      throw new VulturSSOError('NETWORK_ERROR', `Get user roles failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get user information by address (admin only)
   */
  async getUserInfo(address: string, token: string): Promise<UserInfo> {
    const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(address)}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new VulturSSOError('UNAUTHORIZED', 'Invalid or expired token');
      }
      if (response.status === 403) {
        throw new VulturSSOError('FORBIDDEN', 'Admin access required');
      }
      if (response.status === 404) {
        throw new VulturSSOError('NOT_FOUND', 'User not found');
      }
      throw new VulturSSOError('NETWORK_ERROR', `Get user info failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Check if user has specific permission for an application
   * This would need to be implemented in vultur-ident-api
   */
  async checkUserPermission(
    address: string, 
    applicationName: string, 
    permissionScope: string, 
    token: string
  ): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(address)}/permissions/${applicationName}/${permissionScope}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new VulturSSOError('UNAUTHORIZED', 'Invalid or expired token');
      }
      if (response.status === 404) {
        // Permission not found - assume denied
        return false;
      }
      throw new VulturSSOError('NETWORK_ERROR', `Permission check failed: ${response.status}`);
    }

    const result = await response.json();
    return result.allowed === true;
  }
}

/**
 * Middleware-style function to validate JWT and attach user to request context
 */
export function createAuthMiddleware(client: VulturIdentServerClient) {
  return async function validateAuth(req: Request | { headers: Headers }): Promise<UserInfo> {
    const headers = 'headers' in req ? req.headers : new Headers();
    const authHeader = headers.get('Authorization');
    
    if (!authHeader) {
      throw new VulturSSOError('UNAUTHORIZED', 'No authorization header provided');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new VulturSSOError('UNAUTHORIZED', 'Invalid authorization header format');
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    return await client.validateToken(token);
  };
}

/**
 * Helper to extract JWT from various Next.js request formats
 */
export function extractJWT(req: any): string | null {
  // Next.js App Router (NextRequest)
  if (req.headers && typeof req.headers.get === 'function') {
    const authHeader = req.headers.get('Authorization');
    return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  }
  
  // Next.js Pages Router (NextApiRequest)
  if (req.headers && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  }

  // Standard Request object
  if (req instanceof Request) {
    const authHeader = req.headers.get('Authorization');
    return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  }

  return null;
}

/**
 * Permission checking utilities for server-side
 */
export class ServerPermissionChecker {
  constructor(
    private client: VulturIdentServerClient,
    private applicationName: string
  ) {}

  /**
   * Check if user has permission
   */
  async hasPermission(address: string, permissionScope: string, token: string): Promise<boolean> {
    try {
      return await this.client.checkUserPermission(address, this.applicationName, permissionScope, token);
    } catch (error) {
      if (error instanceof VulturSSOError && error.code === 'NOT_FOUND') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(address: string, permissionScopes: string[], token: string): Promise<boolean> {
    for (const scope of permissionScopes) {
      if (await this.hasPermission(address, scope, token)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(address: string, permissionScopes: string[], token: string): Promise<boolean> {
    for (const scope of permissionScopes) {
      if (!(await this.hasPermission(address, scope, token))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if user has a specific role
   */
  async hasRole(address: string, roleName: string, token: string): Promise<boolean> {
    try {
      const roles = await this.client.getUserRoles(address, token);
      return roles.some(role => role.name === roleName && role.is_active);
    } catch (error) {
      if (error instanceof VulturSSOError && error.code === 'NOT_FOUND') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Check if user is admin
   */
  async isAdmin(address: string, token: string): Promise<boolean> {
    try {
      const user = await this.client.validateToken(token);
      return user.is_admin;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Higher-order function to create protected API route handlers
 */
export function withAuth<T extends any[], R>(
  client: VulturIdentServerClient,
  handler: (user: UserInfo, ...args: T) => Promise<R>
) {
  return async (req: any, ...args: T): Promise<R> => {
    const token = extractJWT(req);
    if (!token) {
      throw new VulturSSOError('UNAUTHORIZED', 'No JWT token provided');
    }

    const user = await client.validateToken(token);
    return handler(user, ...args);
  };
}

/**
 * Higher-order function to create permission-protected API route handlers
 */
export function withPermission<T extends any[], R>(
  client: VulturIdentServerClient,
  applicationName: string,
  requiredPermission: string,
  handler: (user: UserInfo, ...args: T) => Promise<R>
) {
  const checker = new ServerPermissionChecker(client, applicationName);
  
  return async (req: any, ...args: T): Promise<R> => {
    const token = extractJWT(req);
    if (!token) {
      throw new VulturSSOError('UNAUTHORIZED', 'No JWT token provided');
    }

    const user = await client.validateToken(token);
    const hasPermission = await checker.hasPermission(user.eth_address, requiredPermission, token);
    
    if (!hasPermission) {
      throw new VulturSSOError('FORBIDDEN', `Permission '${requiredPermission}' required`);
    }

    return handler(user, ...args);
  };
}

/**
 * Utility to create a server client instance
 */
export function createServerClient(config: ServerConfig): VulturIdentServerClient {
  return new VulturIdentServerClient(config);
}
