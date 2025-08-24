/**
 * Example Next.js route implementation
 * Save this as: app/.well-known/vultur-permissions/route.ts
 */

import { createVulturPermissionsHandler } from '@vultur-evefrontier/vultur-sso-client';

// The GET handler will serve your application's permission configuration
export const GET = createVulturPermissionsHandler();

// Example of what this endpoint will serve:
// GET /.well-known/vultur-permissions
// {
//   "applicationName": "my-app",
//   "version": "1.0.0",
//   "permissions": [
//     {
//       "id": "tribes:read",
//       "name": "View Tribes",
//       "description": "View tribal information",
//       "resource": "tribes",
//       "action": "read"
//     }
//     // ... more permissions
//   ],
//   "defaultPermissions": [
//     {
//       "scope": {
//         "id": "tribes:read",
//         "name": "View Tribes",
//         "description": "View tribal information", 
//         "resource": "tribes",
//         "action": "read"
//       },
//       "effect": "allow"
//     }
//   ],
//   "lastUpdated": "2024-01-01T00:00:00.000Z"
// }
