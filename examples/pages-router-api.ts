/**
 * Example Next.js Pages Router API implementation
 * Save this as: pages/api/.well-known/vultur-permissions.ts
 */

import { createVulturPermissionsApiHandler } from '@vultur-evefrontier/vultur-sso-client';

// For Pages Router, export the handler as default
export default createVulturPermissionsApiHandler();

/**
 * Alternative: Static configuration example
 * If you want to serve a static configuration without using global config
 */

// import { 
//   createStaticVulturPermissionsApiHandler,
//   VulturPermissionConfigBuilder,
//   PermissionPatterns 
// } from '@vultur-evefrontier/vultur-sso-client';

// const staticConfig = VulturPermissionConfigBuilder
//   .create('my-api-app', '1.0.0')
//   .addPermissionScope(...PermissionPatterns.crud('api', 'API Access'))
//   .build();

// export default createStaticVulturPermissionsApiHandler(staticConfig);

/**
 * Example of what this endpoint will serve:
 * GET /api/.well-known/vultur-permissions
 * 
 * Response:
 * {
 *   "applicationName": "my-api-app",
 *   "version": "1.0.0", 
 *   "permissions": [
 *     {
 *       "id": "api:read",
 *       "name": "Read API",
 *       "description": "View API data",
 *       "resource": "api",
 *       "action": "read"
 *     },
 *     {
 *       "id": "api:write", 
 *       "name": "Write API",
 *       "description": "Create and update API data",
 *       "resource": "api",
 *       "action": "write"
 *     }
 *     // ... more permissions
 *   ],
 *   "defaultPermissions": [
 *     {
 *       "scope": {
 *         "id": "api:read",
 *         "name": "Read API",
 *         "description": "View API data",
 *         "resource": "api", 
 *         "action": "read"
 *       },
 *       "effect": "allow"
 *     }
 *   ],
 *   "lastUpdated": "2024-01-01T00:00:00.000Z"
 * }
 */
