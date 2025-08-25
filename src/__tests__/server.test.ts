import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  VulturIdentServerClient,
  ServerPermissionChecker,
  createAuthMiddleware,
  extractJWT,
  withAuth,
  withPermission,
  createServerClient,
  VulturSSOError,
} from '../server'
import { mockUserInfo, mockAdminUser, mockUserRoles } from './mocks/server'

const TEST_API_URL = 'https://api.example.com'

describe('VulturSSOError', () => {
  it('should create error with code and message', () => {
    const error = new VulturSSOError('UNAUTHORIZED', 'Test error')
    
    expect(error.name).toBe('VulturSSOError')
    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.message).toBe('Test error')
    expect(error.details).toBeUndefined()
  })

  it('should create error with details', () => {
    const details = { extra: 'info' }
    const error = new VulturSSOError('NETWORK_ERROR', 'Test error', details)
    
    expect(error.details).toEqual(details)
  })
})

describe('VulturIdentServerClient', () => {
  let client: VulturIdentServerClient

  beforeEach(() => {
    client = new VulturIdentServerClient({
      identApiUrl: TEST_API_URL,
      cacheTTL: 1000,
    })
  })

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(client).toBeInstanceOf(VulturIdentServerClient)
    })

    it('should remove trailing slash from URL', () => {
      const clientWithSlash = new VulturIdentServerClient({
        identApiUrl: 'https://api.example.com/',
      })
      expect(clientWithSlash).toBeInstanceOf(VulturIdentServerClient)
    })

    it('should set default cache TTL', () => {
      const clientWithDefaults = new VulturIdentServerClient({
        identApiUrl: TEST_API_URL,
      })
      expect(clientWithDefaults).toBeInstanceOf(VulturIdentServerClient)
    })
  })

  describe('validateToken', () => {
    it('should validate valid token', async () => {
      const user = await client.validateToken('valid-token')
      expect(user).toEqual(mockUserInfo)
    })

    it('should validate admin token', async () => {
      const user = await client.validateToken('admin-token')
      expect(user).toEqual(mockAdminUser)
    })

    it('should throw UNAUTHORIZED for invalid token', async () => {
      await expect(client.validateToken('invalid-token')).rejects.toThrow(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        })
      )
    })

    it('should throw UNAUTHORIZED for expired token', async () => {
      await expect(client.validateToken('expired-token')).rejects.toThrow(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
        })
      )
    })

    it('should throw NETWORK_ERROR for other errors', async () => {
      // Mock a 500 error
      const spy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(null, { status: 500 })
      )

      await expect(client.validateToken('any-token')).rejects.toThrow(
        expect.objectContaining({
          code: 'NETWORK_ERROR',
          message: expect.stringContaining('Token validation failed: 500'),
        })
      )

      spy.mockRestore()
    })
  })

  describe('getUserRoles', () => {
    it('should get user roles', async () => {
      const roles = await client.getUserRoles(mockUserInfo.eth_address, 'valid-token')
      expect(roles).toEqual(mockUserRoles)
    })

    it('should throw UNAUTHORIZED for invalid token', async () => {
      await expect(
        client.getUserRoles(mockUserInfo.eth_address, 'invalid-token')
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
        })
      )
    })

    it('should throw NOT_FOUND for non-existent user', async () => {
      await expect(
        client.getUserRoles('0xinvalidaddress', 'valid-token')
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      )
    })
  })

  describe('getUserInfo', () => {
    it('should get user info as admin', async () => {
      const user = await client.getUserInfo(mockUserInfo.eth_address, 'admin-token')
      expect(user).toEqual(mockUserInfo)
    })

    it('should throw FORBIDDEN for non-admin', async () => {
      await expect(
        client.getUserInfo(mockUserInfo.eth_address, 'valid-token')
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'FORBIDDEN',
          message: 'Admin access required',
        })
      )
    })

    it('should throw NOT_FOUND for non-existent user', async () => {
      await expect(
        client.getUserInfo('0xinvalidaddress', 'admin-token')
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'NOT_FOUND',
        })
      )
    })
  })

  describe('checkUserPermission', () => {
    it('should return true for allowed permission', async () => {
      const hasPermission = await client.checkUserPermission(
        mockUserInfo.eth_address,
        'test-app',
        'read',
        'valid-token'
      )
      expect(hasPermission).toBe(true)
    })

    it('should return false for denied permission', async () => {
      const hasPermission = await client.checkUserPermission(
        mockUserInfo.eth_address,
        'test-app',
        'admin',
        'valid-token'
      )
      expect(hasPermission).toBe(false)
    })

    it('should return true for admin user', async () => {
      const hasPermission = await client.checkUserPermission(
        mockAdminUser.eth_address,
        'test-app',
        'admin',
        'admin-token'
      )
      expect(hasPermission).toBe(true)
    })

    it('should return false for non-existent permission', async () => {
      const hasPermission = await client.checkUserPermission(
        mockUserInfo.eth_address,
        'non-existent-app',
        'read',
        'valid-token'
      )
      expect(hasPermission).toBe(false)
    })

    it('should throw UNAUTHORIZED for invalid token', async () => {
      await expect(
        client.checkUserPermission(
          mockUserInfo.eth_address,
          'test-app',
          'read',
          'invalid-token'
        )
      ).rejects.toThrow(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
        })
      )
    })
  })
})

describe('createAuthMiddleware', () => {
  let client: VulturIdentServerClient
  let middleware: ReturnType<typeof createAuthMiddleware>

  beforeEach(() => {
    client = new VulturIdentServerClient({ identApiUrl: TEST_API_URL })
    middleware = createAuthMiddleware(client)
  })

  it('should validate request with valid token', async () => {
    const req = {
      headers: new Headers({
        'Authorization': 'Bearer valid-token',
      }),
    }

    const user = await middleware(req)
    expect(user).toEqual(mockUserInfo)
  })

  it('should work with Request object', async () => {
    const req = new Request('https://example.com', {
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    })

    const user = await middleware(req)
    expect(user).toEqual(mockUserInfo)
  })

  it('should throw UNAUTHORIZED for missing auth header', async () => {
    const req = { headers: new Headers() }

    await expect(middleware(req)).rejects.toThrow(
      expect.objectContaining({
        code: 'UNAUTHORIZED',
        message: 'No authorization header provided',
      })
    )
  })

  it('should throw UNAUTHORIZED for invalid auth header format', async () => {
    const req = {
      headers: new Headers({
        'Authorization': 'InvalidFormat token',
      }),
    }

    await expect(middleware(req)).rejects.toThrow(
      expect.objectContaining({
        code: 'UNAUTHORIZED',
        message: 'Invalid authorization header format',
      })
    )
  })
})

describe('extractJWT', () => {
  it('should extract JWT from NextRequest (App Router)', () => {
    const req = {
      headers: {
        get: vi.fn().mockReturnValue('Bearer test-token'),
      },
    }

    const token = extractJWT(req)
    expect(token).toBe('test-token')
    expect(req.headers.get).toHaveBeenCalledWith('Authorization')
  })

  it('should extract JWT from NextApiRequest (Pages Router)', () => {
    const req = {
      headers: {
        authorization: 'Bearer test-token',
      },
    }

    const token = extractJWT(req)
    expect(token).toBe('test-token')
  })

  it('should extract JWT from Request object', () => {
    const req = new Request('https://example.com', {
      headers: {
        'Authorization': 'Bearer test-token',
      },
    })

    const token = extractJWT(req)
    expect(token).toBe('test-token')
  })

  it('should return null for missing auth header', () => {
    const req = { headers: {} }
    const token = extractJWT(req)
    expect(token).toBeNull()
  })

  it('should return null for invalid auth header format', () => {
    const req = {
      headers: {
        authorization: 'InvalidFormat token',
      },
    }

    const token = extractJWT(req)
    expect(token).toBeNull()
  })

  it('should return null for unsupported request format', () => {
    const req = {}
    const token = extractJWT(req)
    expect(token).toBeNull()
  })
})

describe('ServerPermissionChecker', () => {
  let client: VulturIdentServerClient
  let checker: ServerPermissionChecker

  beforeEach(() => {
    client = new VulturIdentServerClient({ identApiUrl: TEST_API_URL })
    checker = new ServerPermissionChecker(client, 'test-app')
  })

  describe('hasPermission', () => {
    it('should return true for allowed permission', async () => {
      const hasPermission = await checker.hasPermission(
        mockUserInfo.eth_address,
        'read',
        'valid-token'
      )
      expect(hasPermission).toBe(true)
    })

    it('should return false for denied permission', async () => {
      const hasPermission = await checker.hasPermission(
        mockUserInfo.eth_address,
        'admin',
        'valid-token'
      )
      expect(hasPermission).toBe(false)
    })

    it('should return false for NOT_FOUND error', async () => {
      const hasPermission = await checker.hasPermission(
        'invalid-address',
        'read',
        'valid-token'
      )
      expect(hasPermission).toBe(false)
    })

    it('should re-throw non-NOT_FOUND errors', async () => {
      await expect(
        checker.hasPermission(mockUserInfo.eth_address, 'read', 'invalid-token')
      ).rejects.toThrow(VulturSSOError)
    })
  })

  describe('hasAnyPermission', () => {
    it('should return true if user has any permission', async () => {
      const hasAny = await checker.hasAnyPermission(
        mockUserInfo.eth_address,
        ['admin', 'read', 'write'],
        'valid-token'
      )
      expect(hasAny).toBe(true)
    })

    it('should return false if user has no permissions', async () => {
      const hasAny = await checker.hasAnyPermission(
        mockUserInfo.eth_address,
        ['admin', 'delete'],
        'valid-token'
      )
      expect(hasAny).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    it('should return true if user has all permissions', async () => {
      const hasAll = await checker.hasAllPermissions(
        mockAdminUser.eth_address,
        ['read', 'write', 'admin'],
        'admin-token'
      )
      expect(hasAll).toBe(true)
    })

    it('should return false if user is missing any permission', async () => {
      const hasAll = await checker.hasAllPermissions(
        mockUserInfo.eth_address,
        ['read', 'admin'],
        'valid-token'
      )
      expect(hasAll).toBe(false)
    })
  })

  describe('hasRole', () => {
    it('should return true for user with role', async () => {
      const hasRole = await checker.hasRole(
        mockUserInfo.eth_address,
        'Fleet Member',
        'valid-token'
      )
      expect(hasRole).toBe(true)
    })

    it('should return false for user without role', async () => {
      const hasRole = await checker.hasRole(
        mockUserInfo.eth_address,
        'Administrator',
        'valid-token'
      )
      expect(hasRole).toBe(false)
    })

    it('should return false for NOT_FOUND error', async () => {
      const hasRole = await checker.hasRole(
        'invalid-address',
        'Fleet Member',
        'valid-token'
      )
      expect(hasRole).toBe(false)
    })
  })

  describe('isAdmin', () => {
    it('should return true for admin user', async () => {
      const isAdmin = await checker.isAdmin(mockAdminUser.eth_address, 'admin-token')
      expect(isAdmin).toBe(true)
    })

    it('should return false for non-admin user', async () => {
      const isAdmin = await checker.isAdmin(mockUserInfo.eth_address, 'valid-token')
      expect(isAdmin).toBe(false)
    })

    it('should return false for invalid token', async () => {
      const isAdmin = await checker.isAdmin(mockUserInfo.eth_address, 'invalid-token')
      expect(isAdmin).toBe(false)
    })
  })
})

describe('withAuth', () => {
  let client: VulturIdentServerClient

  beforeEach(() => {
    client = new VulturIdentServerClient({ identApiUrl: TEST_API_URL })
  })

  it('should execute handler with validated user', async () => {
    const handler = vi.fn().mockResolvedValue('success')
    const protectedHandler = withAuth(client, handler)

    const req = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    }

    const result = await protectedHandler(req, 'arg1', 'arg2')

    expect(result).toBe('success')
    expect(handler).toHaveBeenCalledWith(mockUserInfo, 'arg1', 'arg2')
  })

  it('should throw UNAUTHORIZED for missing token', async () => {
    const handler = vi.fn()
    const protectedHandler = withAuth(client, handler)

    const req = { headers: {} }

    await expect(protectedHandler(req)).rejects.toThrow(
      expect.objectContaining({
        code: 'UNAUTHORIZED',
        message: 'No JWT token provided',
      })
    )

    expect(handler).not.toHaveBeenCalled()
  })

  it('should throw UNAUTHORIZED for invalid token', async () => {
    const handler = vi.fn()
    const protectedHandler = withAuth(client, handler)

    const req = {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    }

    await expect(protectedHandler(req)).rejects.toThrow(VulturSSOError)
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('withPermission', () => {
  let client: VulturIdentServerClient

  beforeEach(() => {
    client = new VulturIdentServerClient({ identApiUrl: TEST_API_URL })
  })

  it('should execute handler when user has permission', async () => {
    const handler = vi.fn().mockResolvedValue('success')
    const protectedHandler = withPermission(client, 'test-app', 'read', handler)

    const req = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    }

    const result = await protectedHandler(req, 'arg1')

    expect(result).toBe('success')
    expect(handler).toHaveBeenCalledWith(mockUserInfo, 'arg1')
  })

  it('should throw FORBIDDEN when user lacks permission', async () => {
    const handler = vi.fn()
    const protectedHandler = withPermission(client, 'test-app', 'admin', handler)

    const req = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    }

    await expect(protectedHandler(req)).rejects.toThrow(
      expect.objectContaining({
        code: 'FORBIDDEN',
        message: "Permission 'admin' required",
      })
    )

    expect(handler).not.toHaveBeenCalled()
  })

  it('should throw UNAUTHORIZED for missing token', async () => {
    const handler = vi.fn()
    const protectedHandler = withPermission(client, 'test-app', 'read', handler)

    const req = { headers: {} }

    await expect(protectedHandler(req)).rejects.toThrow(
      expect.objectContaining({
        code: 'UNAUTHORIZED',
      })
    )

    expect(handler).not.toHaveBeenCalled()
  })
})

describe('createServerClient', () => {
  it('should create VulturIdentServerClient instance', () => {
    const client = createServerClient({
      identApiUrl: TEST_API_URL,
      cacheTTL: 1000,
    })

    expect(client).toBeInstanceOf(VulturIdentServerClient)
  })
})
