# Integration Guide: Complete Setup

This guide shows how to integrate `@vultur-evefrontier/vultur-sso-client` into a Next.js application.

## Project Structure

```
my-vultur-app/
├── app/
│   ├── .well-known/
│   │   └── vultur-permissions/
│   │       └── route.ts                 # Permission endpoint
│   ├── lib/
│   │   └── vultur-config.ts            # SSO configuration
│   ├── components/
│   │   ├── auth-provider.tsx           # Query client setup
│   │   └── protected-content.tsx       # Permission-gated components
│   ├── layout.tsx                      # Root layout with providers
│   └── page.tsx                        # Main page
├── .env.local                          # Environment variables
└── package.json
```

## Step-by-Step Setup

### 1. Install Dependencies

```bash
pnpm add @vultur-evefrontier/vultur-sso-client @tanstack/react-query
```

### 2. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_VULTUR_IDENT_API=https://your-vultur-ident-api.com
```

### 3. Configure Permissions

```typescript
// app/lib/vultur-config.ts
import { 
  initializeVulturSSO, 
  VulturPermissionConfigBuilder,
  PermissionPatterns 
} from '@vultur-evefrontier/vultur-sso-client';

const permissionConfig = VulturPermissionConfigBuilder
  .create('my-tribal-app', '1.0.0')
  
  // Add tribal permissions
  .addPermissionScope(...PermissionPatterns.tribal('tribe', 'Tribe Management'))
  
  // Add fleet permissions
  .addPermissionScope(...PermissionPatterns.crud('fleet', 'Fleet Operations'))
  
  // Add warehouse permissions with specific operations
  .addPermissionScope(...PermissionPatterns.crud('warehouse', 'Warehouse'))
  .addPermissionScope({
    id: 'warehouse:receive',
    name: 'Warehouse Receiving',
    description: 'Process incoming shipments',
    resource: 'warehouse',
    action: 'receive'
  })
  
  // Public permissions
  .addDefaultPermission('tribe:member', 'allow')
  .addDefaultPermission('fleet:read', 'allow')
  
  .build();

// Initialize SSO
initializeVulturSSO({
  identApiUrl: process.env.NEXT_PUBLIC_VULTUR_IDENT_API!,
  applicationName: 'my-tribal-app',
  permissionConfig,
  enableCache: true,
});

export { permissionConfig };
```

### 4. Create .well-known Endpoint

```typescript
// app/.well-known/vultur-permissions/route.ts
import { createVulturPermissionsHandler } from '@vultur-evefrontier/vultur-sso-client';

export const GET = createVulturPermissionsHandler();
```

### 5. Setup Query Client Provider

```typescript
// app/components/auth-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error) => {
          // Don't retry auth errors
          if (error?.message?.includes('401')) return false;
          return failureCount < 3;
        },
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### 6. Create Protected Components

```typescript
// app/components/protected-content.tsx
'use client';

import { useVulturAuth, usePermissionCheck } from '@vultur-evefrontier/vultur-sso-client';

export function ProtectedContent() {
  const { isAuthenticated, user, isLoading } = useVulturAuth();
  const { hasPermission, hasRole, isAdmin } = usePermissionCheck();

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-required">
        <h2>Authentication Required</h2>
        <p>Please log in to access tribal features.</p>
      </div>
    );
  }

  return (
    <div className="protected-content">
      <header>
        <h1>Welcome to the Tribe, {user?.character_name}</h1>
        {user?.tribe_id && <p>Tribe ID: {user.tribe_id}</p>}
      </header>

      <nav>
        {hasPermission('fleet:read') && (
          <a href="/fleet">Fleet Operations</a>
        )}
        
        {hasPermission('warehouse:read') && (
          <a href="/warehouse">Warehouse</a>
        )}
        
        {hasRole('Fleet Commander') && (
          <a href="/fleet-command">Command Center</a>
        )}
        
        {isAdmin() && (
          <a href="/admin">Administration</a>
        )}
      </nav>

      <main>
        {/* Your main content here */}
        <FleetDashboard />
        <WarehouseStatus />
      </main>
    </div>
  );
}

function FleetDashboard() {
  const { hasPermission } = usePermissionCheck();
  
  if (!hasPermission('fleet:read')) {
    return null;
  }

  return (
    <section>
      <h2>Fleet Dashboard</h2>
      <p>Fleet status and operations</p>
      
      {hasPermission('fleet:write') && (
        <button>Create Fleet Operation</button>
      )}
    </section>
  );
}

function WarehouseStatus() {
  const { hasPermission } = usePermissionCheck();
  
  if (!hasPermission('warehouse:read')) {
    return null;
  }

  return (
    <section>
      <h2>Warehouse Status</h2>
      <p>Current inventory and operations</p>
      
      {hasPermission('warehouse:receive') && (
        <button>Process Receiving</button>
      )}
      
      {hasPermission('warehouse:admin') && (
        <button>Warehouse Settings</button>
      )}
    </section>
  );
}
```

### 7. Root Layout

```typescript
// app/layout.tsx
import './globals.css';
import { AuthProvider } from './components/auth-provider';
import './lib/vultur-config'; // Initialize SSO config

export const metadata = {
  title: 'VULTUR Tribal App',
  description: 'Tribal ecosystem management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 8. Main Page

```typescript
// app/page.tsx
import { ProtectedContent } from './components/protected-content';

export default function HomePage() {
  return (
    <div>
      <ProtectedContent />
    </div>
  );
}
```

## Testing the Setup

1. **Start your Next.js app**:
   ```bash
   pnpm dev
   ```

2. **Test the .well-known endpoint**:
   ```bash
   curl http://localhost:3000/.well-known/vultur-permissions
   ```

3. **Verify permission configuration**:
   The endpoint should return your application's permission configuration as JSON.

4. **Test authentication flow**:
   - Ensure users can log in through your SSO system
   - JWT token should be stored as `vultur_sso_token` in localStorage
   - Components should show/hide based on user permissions

## Common Patterns

### Permission-Based Navigation

```typescript
function Navigation() {
  const { hasPermission, hasRole } = usePermissionCheck();
  
  const navItems = [
    { href: '/fleet', label: 'Fleet', permission: 'fleet:read' },
    { href: '/warehouse', label: 'Warehouse', permission: 'warehouse:read' },
    { href: '/admin', label: 'Admin', role: 'Administrator' },
  ];

  return (
    <nav>
      {navItems.map(item => {
        const canAccess = item.permission 
          ? hasPermission(item.permission)
          : item.role 
            ? hasRole(item.role)
            : true;
            
        return canAccess ? (
          <a key={item.href} href={item.href}>{item.label}</a>
        ) : null;
      })}
    </nav>
  );
}
```

### Loading States

```typescript
function MyComponent() {
  const { data: permissions, isLoading, error } = useVulturPermissions();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!permissions) return <LoginPrompt />;
  
  return <ProtectedContent permissions={permissions} />;
}
```

### Error Handling

```typescript
function ErrorBoundary({ error }: { error: VulturSSOError }) {
  switch (error.code) {
    case 'UNAUTHORIZED':
      return <LoginRequired />;
    case 'FORBIDDEN':
      return <AccessDenied />;
    case 'CONFIG_ERROR':
      return <ConfigurationError details={error.details} />;
    default:
      return <GenericError message={error.message} />;
  }
}
```

This setup provides a complete integration of the VULTUR SSO client with proper permission management, error handling, and TypeScript support.
