# Server-Side Usage Examples

This guide shows how to use `vultur-sso-client` in Next.js API routes to validate JWTs and perform server-side operations.

## Use Case: Intel Submission Pipeline

**maw-selector** (Next.js frontend) → **Next.js API route** → **epoch-intel** (Rust backend)

1. User submits intel data via maw-selector frontend
2. Next.js API route validates user's JWT with vultur-ident-api
3. API route checks user permissions
4. API route submits validated intel to epoch-intel backend

## Setup

### 1. Install Dependencies

```bash
# In your Next.js project (maw-selector)
pnpm add @vultur-evefrontier/vultur-sso-client
```

### 2. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_VULTUR_IDENT_API=https://your-vultur-ident-api.com
EPOCH_INTEL_API=http://localhost:3001  # epoch-intel backend
```

### 3. Initialize Server Client

```typescript
// lib/vultur-server.ts
import { createServerClient } from '@vultur-evefrontier/vultur-sso-client';

export const vulturServerClient = createServerClient({
  identApiUrl: process.env.NEXT_PUBLIC_VULTUR_IDENT_API!,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
});
```

## Example 1: Basic Intel Submission

```typescript
// pages/api/intel/submit.ts (Pages Router)
// OR app/api/intel/submit/route.ts (App Router)

import { NextApiRequest, NextApiResponse } from 'next';
import { vulturServerClient } from '@/lib/vultur-server';
import { VulturSSOError } from '@vultur-evefrontier/vultur-sso-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization header' });
    }

    const token = authHeader.slice(7);
    
    // Validate token and get user info
    const user = await vulturServerClient.validateToken(token);
    
    // Check if user has permission to submit intel
    const canSubmitIntel = await vulturServerClient.checkUserPermission(
      user.eth_address,
      'epoch-intel',
      'intel:submit',
      token
    );

    if (!canSubmitIntel && !user.is_admin) {
      return res.status(403).json({ error: 'Permission denied: intel:submit required' });
    }

    // Extract intel data from request
    const { characterName, systemName, structures } = req.body;

    // Submit to epoch-intel backend
    const epochIntelResponse = await fetch(`${process.env.EPOCH_INTEL_API}/characters/discover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any required auth headers for epoch-intel
      },
      body: JSON.stringify({
        character_name: characterName,
        system_name: systemName,
        structures: structures,
        submitted_by: user.eth_address,
        submitted_at: new Date().toISOString(),
      }),
    });

    if (!epochIntelResponse.ok) {
      throw new Error(`Epoch intel submission failed: ${epochIntelResponse.status}`);
    }

    const result = await epochIntelResponse.json();

    return res.status(200).json({
      success: true,
      message: 'Intel submitted successfully',
      result,
      submittedBy: user.character_name,
    });

  } catch (error) {
    console.error('Intel submission error:', error);

    if (error instanceof VulturSSOError) {
      switch (error.code) {
        case 'UNAUTHORIZED':
          return res.status(401).json({ error: error.message });
        case 'FORBIDDEN':
          return res.status(403).json({ error: error.message });
        default:
          return res.status(500).json({ error: 'Internal server error' });
      }
    }

    return res.status(500).json({ error: 'Failed to submit intel' });
  }
}
```

## Example 2: Using Higher-Order Functions

```typescript
// pages/api/intel/submit-protected.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withPermission } from '@vultur-evefrontier/vultur-sso-client';
import { vulturServerClient } from '@/lib/vultur-server';

// Protected handler that automatically validates JWT and checks permissions
const submitIntelHandler = withPermission(
  vulturServerClient,
  'epoch-intel',           // Application name
  'intel:submit',          // Required permission
  async (user, req: NextApiRequest, res: NextApiResponse) => {
    const { characterName, systemName, structures } = req.body;

    // User is already validated and has permission
    const epochIntelResponse = await fetch(`${process.env.EPOCH_INTEL_API}/characters/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        character_name: characterName,
        system_name: systemName,
        structures: structures,
        submitted_by: user.eth_address,
        submitted_at: new Date().toISOString(),
      }),
    });

    const result = await epochIntelResponse.json();
    
    return res.status(200).json({
      success: true,
      result,
      submittedBy: user.character_name,
    });
  }
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await submitIntelHandler(req, res);
  } catch (error) {
    console.error('Intel submission error:', error);
    return res.status(500).json({ error: 'Failed to submit intel' });
  }
}
```

## Example 3: App Router Implementation

```typescript
// app/api/intel/submit/route.ts
import { NextRequest } from 'next/server';
import { vulturServerClient } from '@/lib/vultur-server';
import { extractJWT, VulturSSOError } from '@vultur-evefrontier/vultur-sso-client';

export async function POST(request: NextRequest) {
  try {
    // Extract JWT token
    const token = extractJWT(request);
    if (!token) {
      return Response.json({ error: 'No authorization token' }, { status: 401 });
    }

    // Validate token
    const user = await vulturServerClient.validateToken(token);
    
    // Check permissions
    const canSubmitIntel = await vulturServerClient.checkUserPermission(
      user.eth_address,
      'epoch-intel',
      'intel:submit',
      token
    );

    if (!canSubmitIntel && !user.is_admin) {
      return Response.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Parse request body
    const { characterName, systemName, structures } = await request.json();

    // Submit to epoch-intel
    const epochIntelResponse = await fetch(`${process.env.EPOCH_INTEL_API}/characters/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        character_name: characterName,
        system_name: systemName,
        structures: structures,
        submitted_by: user.eth_address,
        submitted_at: new Date().toISOString(),
      }),
    });

    const result = await epochIntelResponse.json();
    
    return Response.json({
      success: true,
      result,
      submittedBy: user.character_name,
    });

  } catch (error) {
    console.error('Intel submission error:', error);

    if (error instanceof VulturSSOError) {
      const status = error.code === 'UNAUTHORIZED' ? 401 : 
                     error.code === 'FORBIDDEN' ? 403 : 500;
      return Response.json({ error: error.message }, { status });
    }

    return Response.json({ error: 'Failed to submit intel' }, { status: 500 });
  }
}
```

## Example 4: Permission Checking Utilities

```typescript
// lib/intel-permissions.ts
import { ServerPermissionChecker } from '@vultur-evefrontier/vultur-sso-client';
import { vulturServerClient } from '@/lib/vultur-server';

export const intelPermissions = new ServerPermissionChecker(
  vulturServerClient,
  'epoch-intel'
);

export async function canUserSubmitIntel(userAddress: string, token: string): Promise<boolean> {
  return await intelPermissions.hasPermission(userAddress, 'intel:submit', token);
}

export async function canUserViewIntel(userAddress: string, token: string): Promise<boolean> {
  return await intelPermissions.hasAnyPermission(userAddress, [
    'intel:read',
    'intel:submit',
    'intel:admin'
  ], token);
}

export async function isIntelAdmin(userAddress: string, token: string): Promise<boolean> {
  return await intelPermissions.hasPermission(userAddress, 'intel:admin', token);
}
```

## Example 5: Frontend Integration

```typescript
// Frontend component in maw-selector
'use client';

import { useState } from 'react';

export function IntelSubmissionForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const submitIntel = async (data: any) => {
    setIsSubmitting(true);
    
    try {
      // Get JWT token from localStorage (set by your auth system)
      const token = localStorage.getItem('vultur_sso_token');
      
      const response = await fetch('/api/intel/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Submission failed');
      }

      const result = await response.json();
      console.log('Intel submitted:', result);
      
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      submitIntel({
        characterName: formData.get('characterName'),
        systemName: formData.get('systemName'),
        structures: JSON.parse(formData.get('structures') as string),
      });
    }}>
      {/* Your form fields */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Intel'}
      </button>
    </form>
  );
}
```

## Example 6: Middleware Pattern

```typescript
// middleware/auth.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createAuthMiddleware } from '@vultur-evefrontier/vultur-sso-client';
import { vulturServerClient } from '@/lib/vultur-server';

const validateAuth = createAuthMiddleware(vulturServerClient);

export function withAuthMiddleware(handler: (req: NextApiRequest & { user: UserInfo }, res: NextApiResponse) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const user = await validateAuth(req);
      (req as any).user = user;
      return handler(req as NextApiRequest & { user: UserInfo }, res);
    } catch (error) {
      if (error instanceof VulturSSOError) {
        const status = error.code === 'UNAUTHORIZED' ? 401 : 500;
        return res.status(status).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Authentication failed' });
    }
  };
}

// Usage
export default withAuthMiddleware(async (req, res) => {
  // req.user is now available and validated
  console.log('Authenticated user:', req.user.character_name);
  res.json({ message: 'Success', user: req.user });
});
```

## Error Handling Best Practices

```typescript
import { VulturSSOError } from '@vultur-evefrontier/vultur-sso-client';

function handleVulturError(error: unknown) {
  if (error instanceof VulturSSOError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        return { status: 401, message: 'Authentication required' };
      case 'FORBIDDEN':
        return { status: 403, message: 'Insufficient permissions' };
      case 'NOT_FOUND':
        return { status: 404, message: 'Resource not found' };
      case 'NETWORK_ERROR':
        return { status: 502, message: 'Service unavailable' };
      case 'CONFIG_ERROR':
        return { status: 500, message: 'Configuration error' };
      default:
        return { status: 500, message: 'Unknown error' };
    }
  }
  
  return { status: 500, message: 'Internal server error' };
}
```

This setup allows maw-selector to securely validate users and submit intel to epoch-intel while maintaining proper permission controls through the vultur-ident-api system!
