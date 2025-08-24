# @vultur-evefrontier/vultur-sso-client

TypeScript library for VULTUR SSO client integration. Provides Next.js endpoints and React hooks for permission management.

## Installation

```bash
pnpm add @vultur-evefrontier/vultur-sso-client
```

## Features

1. **Next.js Endpoint**: Serves `.well-known/vultur-permissions` configuration
2. **React Hooks**: Fetch user roles and permissions from vultur-ident-api
3. **Server-Side Utilities**: JWT validation and permission checking for API routes
4. **Permission Management**: Type-safe permission checking and role-based access control
5. **Configuration Builder**: Fluent API for defining application permissions

## Quick Start

### 1. Initialize Configuration

```typescript
// app/lib/vultur-config.ts
import { 
  initializeVulturSSO, 
  VulturPermissionConfigBuilder,
  PermissionPatterns 
} from '@vultur-evefrontier/vultur-sso-client';

// Define your application's permissions
const permissionConfig = VulturPermissionConfigBuilder
  .create('my-app', '1.0.0')
  .addPermissionScope({
    id: 'tribes:read',
    name: 'View Tribes',
    description: 'View tribal information',
    resource: 'tribes',
    action: 'read'
  })
  // Add CRUD permissions for fleet management
  ...PermissionPatterns.crud('fleet', 'Fleet Management').map(scope => 
    builder.addPermissionScope(scope)
  )
  // Add tribal hierarchy permissions
  ...PermissionPatterns.tribal('warehouse', 'Warehouse Operations').map(scope =>
    builder.addPermissionScope(scope)
  )
  .addDefaultPermission('tribes:read', 'allow') // Public access
  .build();

// Initialize the SSO client
initializeVulturSSO({
  identApiUrl: process.env.NEXT_PUBLIC_VULTUR_IDENT_API!,
  applicationName: 'my-app',
  permissionConfig,
  enableCache: true,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
});
```

### 2. Create .well-known Endpoint

#### Option A: App Router (app/ directory)

```typescript
// app/.well-known/vultur-permissions/route.ts
import { createVulturPermissionsHandler } from '@vultur-evefrontier/vultur-sso-client';

export const GET = createVulturPermissionsHandler();
```

#### Option B: Pages Router (pages/api/ directory)

```typescript
// pages/api/.well-known/vultur-permissions.ts
import { createVulturPermissionsApiHandler } from '@vultur-evefrontier/vultur-sso-client';

export default createVulturPermissionsApiHandler();
```

### 3. Use Permission Hooks

```typescript
// app/components/ProtectedComponent.tsx
'use client';

import { useVulturPermissions, usePermissionCheck } from '@vultur-evefrontier/vultur-sso-client';

export function ProtectedComponent() {
  const { data: permissions, isLoading, error } = useVulturPermissions();
  const { hasPermission, hasRole, isAdmin } = usePermissionCheck();

  if (isLoading) return <div>Loading permissions...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Welcome, {permissions?.user.character_name}</h1>
      
      {hasPermission('tribes:read') && (
        <div>You can view tribal information</div>
      )}
      
      {hasRole('Fleet Commander') && (
        <div>Fleet commander tools available</div>
      )}
      
      {isAdmin() && (
        <div>Admin panel access</div>
      )}
    </div>
  );
}
```

### 4. Setup Query Client (Required)

```typescript
// app/layout.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

## API Reference

### Configuration

#### `initializeVulturSSO(config: VulturSSOClientConfig)`

Initialize the VULTUR SSO client with configuration.

#### `VulturPermissionConfigBuilder`

Fluent builder for creating permission configurations.

```typescript
const config = VulturPermissionConfigBuilder
  .create('app-name', '1.0.0')
  .addPermissionScope({
    id: 'resource:action',
    name: 'Permission Name',
    description: 'What this permission allows',
    resource: 'resource',
    action: 'action'
  })
  .addDefaultPermission('resource:action', 'allow')
  .build();
```

#### `PermissionPatterns`

Pre-built permission patterns for common use cases.

```typescript
// CRUD permissions
PermissionPatterns.crud('tribes'); // Creates tribes:read, tribes:write, tribes:delete, tribes:admin

// Tribal hierarchy permissions  
PermissionPatterns.tribal('fleet'); // Creates fleet:member, fleet:officer, fleet:director, fleet:ceo
```

### Next.js Endpoints

#### `createVulturPermissionsHandler()`

Creates a Next.js App Router route handler for serving `.well-known/vultur-permissions`.

#### `createStaticVulturPermissionsHandler(config)`

Creates an App Router handler with static configuration (doesn't use global config).

#### `createVulturPermissionsApiHandler()`

Creates a Next.js Pages Router API handler for serving `.well-known/vultur-permissions`.

#### `createStaticVulturPermissionsApiHandler(config)`

Creates a Pages Router API handler with static configuration (doesn't use global config).

### Server-Side Utilities

#### `VulturIdentServerClient`

Server-side client for validating JWTs and interacting with vultur-ident-api.

```typescript
const client = createServerClient({
  identApiUrl: 'https://your-api.com',
  cacheTTL: 5 * 60 * 1000 // 5 minutes
});

// Validate JWT and get user info
const user = await client.validateToken(token);

// Check user permission
const hasPermission = await client.checkUserPermission(
  userAddress, 
  'app-name', 
  'permission:scope', 
  token
);
```

#### `withAuth(client, handler)`

Higher-order function to create JWT-protected API routes.

#### `withPermission(client, app, permission, handler)`

Higher-order function to create permission-protected API routes.

### React Hooks

#### `useVulturPermissions(options?)`

Fetch user permissions for the current application.

```typescript
const { data, isLoading, error } = useVulturPermissions({
  enabled: true,
  refetchOnWindowFocus: false,
  refetchInterval: 30000, // 30 seconds
});
```

#### `usePermissionCheck()`

Get permission checking functions.

```typescript
const { 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions, 
  hasRole, 
  isAdmin 
} = usePermissionCheck();

// Check single permission
if (hasPermission('tribes:admin')) {
  // User has tribe admin access
}

// Check multiple permissions (any)
if (hasAnyPermission(['fleet:read', 'fleet:write'])) {
  // User has at least one fleet permission
}

// Check multiple permissions (all)
if (hasAllPermissions(['warehouse:read', 'warehouse:write'])) {
  // User has both warehouse permissions
}

// Check role
if (hasRole('Fleet Commander')) {
  // User has Fleet Commander role
}

// Check admin status
if (isAdmin()) {
  // User is an admin
}
```

#### `useVulturAuth()`

Check authentication status.

```typescript
const { isAuthenticated, user, isLoading, error } = useVulturAuth();
```

### 4. Server-Side Usage (API Routes)

```typescript
// pages/api/protected-route.ts
import { createServerClient, withAuth } from '@vultur-evefrontier/vultur-sso-client';

const serverClient = createServerClient({
  identApiUrl: process.env.NEXT_PUBLIC_VULTUR_IDENT_API!
});

const protectedHandler = withAuth(serverClient, async (user, req, res) => {
  // User is validated, perform operations
  return res.json({ 
    message: 'Success', 
    user: user.character_name 
  });
});

export default protectedHandler;
```

## Environment Variables

```bash
# Required
NEXT_PUBLIC_VULTUR_IDENT_API=https://your-vultur-ident-api.com

# Optional - JWT token is stored in localStorage as 'vultur_sso_token'
```

## Types

All types are exported for TypeScript users:

```typescript
import type { 
  UserPermissions, 
  PermissionScope, 
  VulturSSOClientConfig 
} from '@vultur-evefrontier/vultur-sso-client';
```

## Error Handling

The library provides typed errors:

```typescript
import { useVulturPermissions } from '@vultur-evefrontier/vultur-sso-client';

const { error } = useVulturPermissions();

if (error) {
  switch (error.code) {
    case 'UNAUTHORIZED':
      // Redirect to login
      break;
    case 'FORBIDDEN':
      // Show access denied
      break;
    case 'NETWORK_ERROR':
      // Show network error
      break;
    case 'CONFIG_ERROR':
      // Configuration issue
      break;
  }
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build the library
pnpm build

# Watch for changes
pnpm dev
```
