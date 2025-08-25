import { describe, it, expect } from 'vitest'

// Import all exports to verify they exist
import {
  // Types
  PermissionScope,
  PermissionEffect,
  Permission,
  VulturPermissionConfig,
  UserRole,
  UserInfo,
  UserPermissions,
  VulturSSOClientConfig,
  VulturSSOError,
  UseVulturPermissionsOptions,
  ServerConfig,
  
  // Configuration
  initializeVulturSSO,
  getVulturSSOConfig,
  getPermissionConfig,
  VulturPermissionConfigBuilder,
  PermissionPatterns,
  
  // Next.js endpoint handlers
  createVulturPermissionsHandler,
  createStaticVulturPermissionsHandler,
  createVulturPermissionsApiHandler,
  createStaticVulturPermissionsApiHandler,
  validateWellKnownPath,
  getWellKnownUrl,
  
  // React hooks
  useVulturPermissions,
  usePermissionCheck,
  useVulturAuth,
  
  // Server-side utilities
  VulturIdentServerClient,
  ServerPermissionChecker,
  createAuthMiddleware,
  extractJWT,
  withAuth,
  withPermission,
  createServerClient,
  
  // Re-exports
  useQuery,
  useMutation,
  useQueryClient,
} from '../index'

describe('Package Exports', () => {
  it('should export all configuration functions', () => {
    expect(typeof initializeVulturSSO).toBe('function')
    expect(typeof getVulturSSOConfig).toBe('function')
    expect(typeof getPermissionConfig).toBe('function')
    expect(typeof VulturPermissionConfigBuilder.create).toBe('function')
    expect(typeof PermissionPatterns.crud).toBe('function')
    expect(typeof PermissionPatterns.tribal).toBe('function')
  })

  it('should export all endpoint handlers', () => {
    expect(typeof createVulturPermissionsHandler).toBe('function')
    expect(typeof createStaticVulturPermissionsHandler).toBe('function')
    expect(typeof createVulturPermissionsApiHandler).toBe('function')
    expect(typeof createStaticVulturPermissionsApiHandler).toBe('function')
    expect(typeof validateWellKnownPath).toBe('function')
    expect(typeof getWellKnownUrl).toBe('function')
  })

  it('should export all React hooks', () => {
    expect(typeof useVulturPermissions).toBe('function')
    expect(typeof usePermissionCheck).toBe('function')
    expect(typeof useVulturAuth).toBe('function')
  })

  it('should export all server-side utilities', () => {
    expect(typeof VulturIdentServerClient).toBe('function')
    expect(typeof ServerPermissionChecker).toBe('function')
    expect(typeof createAuthMiddleware).toBe('function')
    expect(typeof extractJWT).toBe('function')
    expect(typeof withAuth).toBe('function')
    expect(typeof withPermission).toBe('function')
    expect(typeof createServerClient).toBe('function')
  })

  it('should export React Query utilities', () => {
    expect(typeof useQuery).toBe('function')
    expect(typeof useMutation).toBe('function')
    expect(typeof useQueryClient).toBe('function')
  })

  it('should export all types (compile-time check)', () => {
    // This test verifies types are exported correctly at compile time
    const _typeCheck = (): void => {
      // Permission types
      const _scope: PermissionScope = null as any
      const _effect: PermissionEffect = null as any
      const _permission: Permission = null as any
      const _config: VulturPermissionConfig = null as any
      
      // User types
      const _role: UserRole = null as any
      const _user: UserInfo = null as any
      const _userPermissions: UserPermissions = null as any
      
      // Config types
      const _clientConfig: VulturSSOClientConfig = null as any
      const _serverConfig: ServerConfig = null as any
      const _error: VulturSSOError = null as any
      const _options: UseVulturPermissionsOptions = null as any
      
      // Suppress unused variable warnings
      void _scope
      void _effect
      void _permission
      void _config
      void _role
      void _user
      void _userPermissions
      void _clientConfig
      void _serverConfig
      void _error
      void _options
    }
    
    expect(typeof _typeCheck).toBe('function')
  })
})

describe('Package Integration', () => {
  it('should allow basic configuration flow', () => {
    const config = VulturPermissionConfigBuilder
      .create('integration-test', '1.0.0')
      .addPermissionScope({
        id: 'test:read',
        name: 'Test Read',
        resource: 'test',
        action: 'read',
      })
      .build()

    expect(config.applicationName).toBe('integration-test')
    expect(config.permissions).toHaveLength(1)
    
    // Should be able to initialize SSO with this config
    expect(() => {
      initializeVulturSSO({
        identApiUrl: 'https://api.example.com',
        applicationName: 'integration-test',
        permissionConfig: config,
      })
    }).not.toThrow()
  })

  it('should allow server client creation', () => {
    const client = createServerClient({
      identApiUrl: 'https://api.example.com',
    })
    
    expect(client).toBeInstanceOf(VulturIdentServerClient)
  })

  it('should allow endpoint handler creation', () => {
    const handler = createVulturPermissionsHandler()
    expect(typeof handler).toBe('function')
  })

  it('should validate well-known paths', () => {
    expect(validateWellKnownPath('/.well-known/vultur-permissions')).toBe(true)
    expect(validateWellKnownPath('/invalid')).toBe(false)
  })

  it('should generate well-known URLs', () => {
    const url = getWellKnownUrl('https://example.com')
    expect(url).toBe('https://example.com/.well-known/vultur-permissions')
  })
})

describe('Permission Patterns Integration', () => {
  it('should work with CRUD patterns', () => {
    const crudPermissions = PermissionPatterns.crud('fleet')
    expect(crudPermissions).toHaveLength(4)
    expect(crudPermissions.map(p => p.action)).toEqual(['read', 'write', 'delete', 'admin'])
  })

  it('should work with tribal patterns', () => {
    const tribalPermissions = PermissionPatterns.tribal('warehouse')
    expect(tribalPermissions).toHaveLength(4)
    expect(tribalPermissions.map(p => p.action)).toEqual(['member', 'officer', 'director', 'ceo'])
  })

  it('should integrate patterns with builder', () => {
    const builder = VulturPermissionConfigBuilder.create('pattern-integration', '1.0.0')
    
    // Add CRUD permissions
    const crudPermissions = PermissionPatterns.crud('api')
    crudPermissions.forEach(permission => builder.addPermissionScope(permission))
    
    // Add tribal permissions
    const tribalPermissions = PermissionPatterns.tribal('tribe')
    tribalPermissions.forEach(permission => builder.addPermissionScope(permission))
    
    const config = builder.build()

    expect(config.permissions).toHaveLength(8) // 4 CRUD + 4 tribal
    
    const apiPermissions = config.permissions.filter(p => p.resource === 'api')
    const tribePermissions = config.permissions.filter(p => p.resource === 'tribe')
    
    expect(apiPermissions).toHaveLength(4)
    expect(tribePermissions).toHaveLength(4)
  })
})
