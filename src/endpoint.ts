import { NextRequest, NextResponse } from 'next/server';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getPermissionConfig } from './config';
import { VulturPermissionConfig } from './types';

/**
 * Next.js route handler for serving .well-known/vultur-permissions
 * 
 * Usage in your Next.js app:
 * Create a file at: app/.well-known/vultur-permissions/route.ts
 * 
 * ```typescript
 * import { createVulturPermissionsHandler } from '@vultur-evefrontier/vultur-sso-client';
 * 
 * export const GET = createVulturPermissionsHandler();
 * ```
 */
export function createVulturPermissionsHandler() {
  return async function handler(request: NextRequest): Promise<NextResponse> {
    try {
      const config = getPermissionConfig();
      
      // Set appropriate headers
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      });

      return new NextResponse(JSON.stringify(config, null, 2), {
        status: 200,
        headers,
      });
    } catch (error) {
      console.error('Error serving vultur-permissions:', error);
      
      const errorResponse = {
        error: 'Internal server error',
        message: 'Failed to load permission configuration',
        timestamp: new Date().toISOString(),
      };

      return new NextResponse(JSON.stringify(errorResponse, null, 2), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  };
}

/**
 * Alternative static configuration handler for when you want to serve
 * a static configuration without using the global config
 */
export function createStaticVulturPermissionsHandler(config: VulturPermissionConfig) {
  return async function handler(request: NextRequest): Promise<NextResponse> {
    try {
      // Set appropriate headers
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      });

      return new NextResponse(JSON.stringify(config, null, 2), {
        status: 200,
        headers,
      });
    } catch (error) {
      console.error('Error serving static vultur-permissions:', error);
      
      const errorResponse = {
        error: 'Internal server error',
        message: 'Failed to load permission configuration',
        timestamp: new Date().toISOString(),
      };

      return new NextResponse(JSON.stringify(errorResponse, null, 2), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  };
}

/**
 * Utility function to validate the well-known path format
 */
export function validateWellKnownPath(path: string): boolean {
  return path === '/.well-known/vultur-permissions' || path === '.well-known/vultur-permissions';
}

/**
 * Next.js Pages Router API handler for serving .well-known/vultur-permissions
 * 
 * Usage in your Next.js Pages Router app:
 * Create a file at: pages/api/.well-known/vultur-permissions.ts
 * 
 * ```typescript
 * import { createVulturPermissionsApiHandler } from '@vultur-evefrontier/vultur-sso-client';
 * 
 * export default createVulturPermissionsApiHandler();
 * ```
 */
export function createVulturPermissionsApiHandler() {
  return async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Only allow GET requests
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({
        error: 'Method not allowed',
        message: 'Only GET requests are supported',
      });
    }

    try {
      const config = getPermissionConfig();
      
      // Set appropriate headers
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      return res.status(200).json(config);
    } catch (error) {
      console.error('Error serving vultur-permissions:', error);
      
      const errorResponse = {
        error: 'Internal server error',
        message: 'Failed to load permission configuration',
        timestamp: new Date().toISOString(),
      };

      return res.status(500).json(errorResponse);
    }
  };
}

/**
 * Static configuration API handler for Pages Router
 */
export function createStaticVulturPermissionsApiHandler(config: VulturPermissionConfig) {
  return async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Only allow GET requests
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({
        error: 'Method not allowed',
        message: 'Only GET requests are supported',
      });
    }

    try {
      // Validate that the config can be serialized to JSON
      JSON.stringify(config);
      
      // Set appropriate headers
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      return res.status(200).json(config);
    } catch (error) {
      console.error('Error serving static vultur-permissions:', error);
      
      const errorResponse = {
        error: 'Internal server error',
        message: 'Failed to load permission configuration',
        timestamp: new Date().toISOString(),
      };

      return res.status(500).json(errorResponse);
    }
  };
}

/**
 * Helper to generate the full well-known URL for an application
 */
export function getWellKnownUrl(baseUrl: string): string {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  return `${cleanBaseUrl}/.well-known/vultur-permissions`;
}
