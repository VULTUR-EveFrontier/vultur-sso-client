/**
 * @vultur-evefrontier/vultur-sso-client
 * 
 * TypeScript library for VULTUR SSO client integration
 * Provides Next.js endpoints and React hooks for permission management
 */

// Types
export type {
  PermissionScope,
  PermissionEffect,
  Permission,
  VulturPermissionConfig,
  UserRole,
  UserInfo,
  UserPermissions,
  VulturSSOClientConfig,
  UseVulturPermissionsOptions,
} from './types';

// Configuration
export {
  initializeVulturSSO,
  getVulturSSOConfig,
  getPermissionConfig,
  resetVulturSSOConfig,
  VulturPermissionConfigBuilder,
  PermissionPatterns,
} from './config';

// Next.js endpoint handlers
export {
  createVulturPermissionsHandler,
  createStaticVulturPermissionsHandler,
  createVulturPermissionsApiHandler,
  createStaticVulturPermissionsApiHandler,
  validateWellKnownPath,
  getWellKnownUrl,
} from './endpoint';

// React hooks
export {
  useVulturPermissions,
  usePermissionCheck,
  useVulturAuth,
  PermissionResolver,
  NoOpPermissionResolver,
} from './hooks';

// Server-side utilities
export {
  VulturIdentServerClient,
  ServerPermissionChecker,
  createAuthMiddleware,
  extractJWT,
  withAuth,
  withPermission,
  createServerClient,
  VulturSSOError,
} from './server';

export type {
  ServerConfig,
} from './server';

// Re-export for convenience
export { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
