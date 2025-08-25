import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import type { VulturPermissionConfig } from '../types'

// Mock Next.js types before importing endpoint
vi.mock('next/server', () => {
  class MockNextRequest {
    constructor(public url: string, public init?: RequestInit) {}
    
    get headers() {
      return new Headers(this.init?.headers)
    }
  }

  class MockNextResponse {
    constructor(public body: string, private responseInit?: ResponseInit) {}
    
    static json(data: any, init?: ResponseInit) {
      return new MockNextResponse(JSON.stringify(data), {
        ...init,
        headers: new Headers(init?.headers),
      })
    }
    
    // Helper method to get response body as text
    async text() {
      return this.body
    }
    
    // Helper method to get response body as JSON
    async json() {
      return JSON.parse(this.body)
    }
    
    // Mock properties to match NextResponse interface
    get status() {
      return this.responseInit?.status || 200
    }
    
    get headers() {
      return this.responseInit?.headers as Headers || new Headers()
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  }
})

// Import after mocking
import {
  createVulturPermissionsHandler,
  createStaticVulturPermissionsHandler,
  createVulturPermissionsApiHandler,
  createStaticVulturPermissionsApiHandler,
  validateWellKnownPath,
  getWellKnownUrl,
} from '../endpoint'
import { initializeVulturSSO, resetVulturSSOConfig, VulturPermissionConfigBuilder } from '../config'

// Get the mocked classes for use in tests
let MockNextRequest: any
let MockNextResponse: any

beforeAll(async () => {
  const nextServer = await import('next/server')
  MockNextRequest = nextServer.NextRequest
  MockNextResponse = nextServer.NextResponse
})

const mockPermissionConfig: VulturPermissionConfig = {
  applicationName: 'test-app',
  version: '1.0.0',
  permissions: [
    {
      id: 'test:read',
      name: 'Test Read',
      description: 'Read test data',
      resource: 'test',
      action: 'read',
    },
    {
      id: 'test:write',
      name: 'Test Write',
      description: 'Write test data',
      resource: 'test',
      action: 'write',
    },
  ],
  defaultPermissions: [
    {
      scope: {
        id: 'test:read',
        name: 'Test Read',
        description: 'Read test data',
        resource: 'test',
        action: 'read',
      },
      effect: 'allow',
    },
  ],
  lastUpdated: '2024-01-01T00:00:00Z',
}

describe('Next.js Endpoint Handlers', () => {
  beforeEach(() => {
    // Reset global config
    resetVulturSSOConfig()
  })

  describe('createVulturPermissionsHandler', () => {
    beforeEach(() => {
      // Initialize global config
      initializeVulturSSO({
        identApiUrl: 'https://api.example.com',
        applicationName: 'test-app',
        permissionConfig: mockPermissionConfig,
      })
    })

    it('should return permission configuration', async () => {
      const handler = createVulturPermissionsHandler()
      const request = new MockNextRequest('https://example.com/.well-known/vultur-permissions')
      
      const response = await handler(request as any)
      
      expect(response).toBeInstanceOf(MockNextResponse)
      const config = await response.json()
      expect(config).toEqual(mockPermissionConfig)
    })

    it('should set correct headers', async () => {
      const handler = createVulturPermissionsHandler()
      const request = new MockNextRequest('https://example.com/.well-known/vultur-permissions')
      
      const response = await handler(request as any)
      
      expect(response.status).toBe(200)
      const headers = response.headers
      expect(headers.get('Content-Type')).toBe('application/json')
      expect(headers.get('Cache-Control')).toBe('public, max-age=300')
      expect(headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(headers.get('Access-Control-Allow-Methods')).toBe('GET')
      expect(headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
    })

    it('should handle configuration errors', async () => {
      // Reset global config to trigger error
      resetVulturSSOConfig()
      
      const handler = createVulturPermissionsHandler()
      const request = new MockNextRequest('https://example.com/.well-known/vultur-permissions')
      
      const response = await handler(request as any)
      
      expect(response.status).toBe(500)
      const errorResponse = await response.json()
      expect(errorResponse.error).toBe('Internal server error')
      expect(errorResponse.message).toBe('Failed to load permission configuration')
    })
  })

  describe('createStaticVulturPermissionsHandler', () => {
    it('should return static configuration', async () => {
      const handler = createStaticVulturPermissionsHandler(mockPermissionConfig)
      const request = new MockNextRequest('https://example.com/.well-known/vultur-permissions')
      
      const response = await handler(request as any)
      
      expect(response).toBeInstanceOf(MockNextResponse)
      const config = await response.json()
      expect(config).toEqual(mockPermissionConfig)
    })

    it('should set correct headers', async () => {
      const handler = createStaticVulturPermissionsHandler(mockPermissionConfig)
      const request = new MockNextRequest('https://example.com/.well-known/vultur-permissions')
      
      const response = await handler(request as any)
      
      expect(response.status).toBe(200)
      const headers = response.headers
      expect(headers.get('Content-Type')).toBe('application/json')
      expect(headers.get('Cache-Control')).toBe('public, max-age=300')
    })

    it('should handle errors gracefully', async () => {
      // Create handler that will throw during JSON.stringify
      const circularConfig = { ...mockPermissionConfig } as any
      circularConfig.circular = circularConfig
      
      const handler = createStaticVulturPermissionsHandler(circularConfig)
      const request = new MockNextRequest('https://example.com/.well-known/vultur-permissions')
      
      const response = await handler(request as any)
      
      expect(response.status).toBe(500)
      const errorResponse = await response.json()
      expect(errorResponse.error).toBe('Internal server error')
    })
  })

  describe('createVulturPermissionsApiHandler (Pages Router)', () => {
    let mockRes: any

    beforeEach(() => {
      // Initialize global config
      initializeVulturSSO({
        identApiUrl: 'https://api.example.com',
        applicationName: 'test-app',
        permissionConfig: mockPermissionConfig,
      })

      // Mock NextApiResponse
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
      }
    })

    it('should return permission configuration for GET request', async () => {
      const handler = createVulturPermissionsApiHandler()
      const mockReq = { method: 'GET' }
      
      await handler(mockReq as any, mockRes)
      
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith(mockPermissionConfig)
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json')
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300')
    })

    it('should return 405 for non-GET requests', async () => {
      const handler = createVulturPermissionsApiHandler()
      const mockReq = { method: 'POST' }
      
      await handler(mockReq as any, mockRes)
      
      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['GET'])
      expect(mockRes.status).toHaveBeenCalledWith(405)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Method not allowed',
        message: 'Only GET requests are supported',
      })
    })

    it('should handle configuration errors', async () => {
      // Reset global config to trigger error
      resetVulturSSOConfig()
      
      const handler = createVulturPermissionsApiHandler()
      const mockReq = { method: 'GET' }
      
      await handler(mockReq as any, mockRes)
      
      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
          message: 'Failed to load permission configuration',
        })
      )
    })
  })

  describe('createStaticVulturPermissionsApiHandler', () => {
    let mockRes: any

    beforeEach(() => {
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
      }
    })

    it('should return static configuration', async () => {
      const handler = createStaticVulturPermissionsApiHandler(mockPermissionConfig)
      const mockReq = { method: 'GET' }
      
      await handler(mockReq as any, mockRes)
      
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith(mockPermissionConfig)
    })

    it('should return 405 for non-GET requests', async () => {
      const handler = createStaticVulturPermissionsApiHandler(mockPermissionConfig)
      const mockReq = { method: 'POST' }
      
      await handler(mockReq as any, mockRes)
      
      expect(mockRes.status).toHaveBeenCalledWith(405)
    })

    it('should handle errors gracefully', async () => {
      // Create a circular reference to cause JSON.stringify to fail
      const circularConfig = { ...mockPermissionConfig } as any
      circularConfig.circular = circularConfig
      
      const handler = createStaticVulturPermissionsApiHandler(circularConfig)
      const mockReq = { method: 'GET' }
      
      await handler(mockReq as any, mockRes)
      
      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
        })
      )
    })
  })
})

describe('Utility Functions', () => {
  describe('validateWellKnownPath', () => {
    it('should validate correct paths', () => {
      expect(validateWellKnownPath('/.well-known/vultur-permissions')).toBe(true)
      expect(validateWellKnownPath('.well-known/vultur-permissions')).toBe(true)
    })

    it('should reject incorrect paths', () => {
      expect(validateWellKnownPath('/api/permissions')).toBe(false)
      expect(validateWellKnownPath('/.well-known/other')).toBe(false)
      expect(validateWellKnownPath('vultur-permissions')).toBe(false)
      expect(validateWellKnownPath('')).toBe(false)
    })
  })

  describe('getWellKnownUrl', () => {
    it('should generate correct URL', () => {
      const url = getWellKnownUrl('https://example.com')
      expect(url).toBe('https://example.com/.well-known/vultur-permissions')
    })

    it('should handle URLs with trailing slash', () => {
      const url = getWellKnownUrl('https://example.com/')
      expect(url).toBe('https://example.com/.well-known/vultur-permissions')
    })

    it('should handle URLs with path', () => {
      const url = getWellKnownUrl('https://example.com/api')
      expect(url).toBe('https://example.com/api/.well-known/vultur-permissions')
    })

    it('should handle URLs with multiple trailing slashes', () => {
      const url = getWellKnownUrl('https://example.com///')
      expect(url).toBe('https://example.com///.well-known/vultur-permissions')
    })
  })
})

describe('Integration Tests', () => {
  it('should work with permission builder configuration', async () => {
    const config = VulturPermissionConfigBuilder
      .create('integration-test', '2.0.0')
      .addPermissionScope({
        id: 'integration:test',
        name: 'Integration Test',
        description: 'Test integration',
        resource: 'integration',
        action: 'test',
      })
      .addDefaultPermission('integration:test', 'allow')
      .build()

    initializeVulturSSO({
      identApiUrl: 'https://api.example.com',
      applicationName: 'integration-test',
      permissionConfig: config,
    })

    const handler = createVulturPermissionsHandler()
    const request = new MockNextRequest('https://example.com/.well-known/vultur-permissions')
    
    const response = await handler(request as any)
    
    expect(response.status).toBe(200)
    const returnedConfig = await response.json()
    expect(returnedConfig.applicationName).toBe('integration-test')
    expect(returnedConfig.version).toBe('2.0.0')
    expect(returnedConfig.permissions).toHaveLength(1)
    expect(returnedConfig.permissions[0].id).toBe('integration:test')
    expect(returnedConfig.defaultPermissions).toHaveLength(1)
  })

  it('should work with static handler and permission patterns', async () => {
    const config = VulturPermissionConfigBuilder
      .create('pattern-test', '1.5.0')
      .addPermissionScope({
        id: 'fleet:read',
        name: 'Read Fleet',
        description: 'View fleet data',
        resource: 'fleet',
        action: 'read',
      })
      .build()

    const handler = createStaticVulturPermissionsHandler(config)
    const request = new MockNextRequest('https://example.com/.well-known/vultur-permissions')
    
    const response = await handler(request as any)
    
    expect(response.status).toBe(200)
    const returnedConfig = await response.json()
    expect(returnedConfig.applicationName).toBe('pattern-test')
    expect(returnedConfig.permissions[0].id).toBe('fleet:read')
  })
})
