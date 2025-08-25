import { describe, it, expect } from 'vitest'
import type {
  PermissionScope,
  PermissionEffect,
  Permission,
  VulturPermissionConfig,
  UserRole,
  UserInfo,
  UserPermissions,
  VulturSSOClientConfig,
  UseVulturPermissionsOptions,
} from '../types'
import { VulturSSOError } from '../server'

describe('TypeScript Types', () => {
  describe('PermissionScope', () => {
    it('should accept valid permission scope', () => {
      const scope: PermissionScope = {
        id: 'test:read',
        name: 'Test Read',
        description: 'Read test data',
        resource: 'test',
        action: 'read',
      }
      
      expect(scope.id).toBe('test:read')
      expect(scope.name).toBe('Test Read')
      expect(scope.description).toBe('Read test data')
      expect(scope.resource).toBe('test')
      expect(scope.action).toBe('read')
    })

    it('should accept scope without description', () => {
      const scope: PermissionScope = {
        id: 'test:write',
        name: 'Test Write',
        resource: 'test',
        action: 'write',
      }
      
      expect(scope.description).toBeUndefined()
    })
  })

  describe('PermissionEffect', () => {
    it('should accept allow effect', () => {
      const effect: PermissionEffect = 'allow'
      expect(effect).toBe('allow')
    })

    it('should accept deny effect', () => {
      const effect: PermissionEffect = 'deny'
      expect(effect).toBe('deny')
    })
  })

  describe('Permission', () => {
    it('should combine scope and effect', () => {
      const permission: Permission = {
        scope: {
          id: 'test:read',
          name: 'Test Read',
          resource: 'test',
          action: 'read',
        },
        effect: 'allow',
      }
      
      expect(permission.scope.id).toBe('test:read')
      expect(permission.effect).toBe('allow')
    })
  })

  describe('VulturPermissionConfig', () => {
    it('should accept complete configuration', () => {
      const config: VulturPermissionConfig = {
        applicationName: 'test-app',
        version: '1.0.0',
        permissions: [
          {
            id: 'test:read',
            name: 'Test Read',
            resource: 'test',
            action: 'read',
          },
        ],
        defaultPermissions: [
          {
            scope: {
              id: 'test:read',
              name: 'Test Read',
              resource: 'test',
              action: 'read',
            },
            effect: 'allow',
          },
        ],
        lastUpdated: '2024-01-01T00:00:00Z',
      }
      
      expect(config.applicationName).toBe('test-app')
      expect(config.version).toBe('1.0.0')
      expect(config.permissions).toHaveLength(1)
      expect(config.defaultPermissions).toHaveLength(1)
      expect(config.lastUpdated).toBe('2024-01-01T00:00:00Z')
    })

    it('should accept configuration without default permissions', () => {
      const config: VulturPermissionConfig = {
        applicationName: 'test-app',
        version: '1.0.0',
        permissions: [],
        lastUpdated: '2024-01-01T00:00:00Z',
      }
      
      expect(config.defaultPermissions).toBeUndefined()
    })
  })

  describe('UserRole', () => {
    it('should accept complete user role', () => {
      const role: UserRole = {
        id: 1,
        name: 'Test Role',
        description: 'A test role',
        created_by: '0x1234567890abcdef1234567890abcdef12345678',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        is_active: true,
      }
      
      expect(role.id).toBe(1)
      expect(role.name).toBe('Test Role')
      expect(role.description).toBe('A test role')
      expect(role.is_active).toBe(true)
    })

    it('should accept role without description', () => {
      const role: UserRole = {
        id: 2,
        name: 'Simple Role',
        description: null,
        created_by: '0x1234567890abcdef1234567890abcdef12345678',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        is_active: false,
      }
      
      expect(role.description).toBeNull()
      expect(role.is_active).toBe(false)
    })
  })

  describe('UserInfo', () => {
    it('should accept complete user info', () => {
      const user: UserInfo = {
        eth_address: '0x1234567890abcdef1234567890abcdef12345678',
        character_name: 'TestPilot',
        roles: ['Fleet Member', 'Warehouse Worker'],
        is_admin: false,
        tribe_id: 12345,
      }
      
      expect(user.eth_address).toBe('0x1234567890abcdef1234567890abcdef12345678')
      expect(user.character_name).toBe('TestPilot')
      expect(user.roles).toEqual(['Fleet Member', 'Warehouse Worker'])
      expect(user.is_admin).toBe(false)
      expect(user.tribe_id).toBe(12345)
    })

    it('should accept user without tribe', () => {
      const user: UserInfo = {
        eth_address: '0x1234567890abcdef1234567890abcdef12345678',
        character_name: 'SoloPilot',
        roles: [],
        is_admin: true,
        tribe_id: null,
      }
      
      expect(user.tribe_id).toBeNull()
      expect(user.is_admin).toBe(true)
      expect(user.roles).toEqual([])
    })

    it('should accept user without tribe_id property', () => {
      const user: UserInfo = {
        eth_address: '0x1234567890abcdef1234567890abcdef12345678',
        character_name: 'FreePilot',
        roles: ['Independent'],
        is_admin: false,
      }
      
      expect(user.tribe_id).toBeUndefined()
    })
  })

  describe('UserPermissions', () => {
    it('should combine user, roles, and permissions', () => {
      const userPermissions: UserPermissions = {
        user: {
          eth_address: '0x1234567890abcdef1234567890abcdef12345678',
          character_name: 'TestPilot',
          roles: ['Fleet Member'],
          is_admin: false,
        },
        roles: [
          {
            id: 1,
            name: 'Fleet Member',
            description: 'Basic fleet access',
            created_by: '0xadmin',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_active: true,
          },
        ],
        permissions: [
          {
            scope: {
              id: 'fleet:read',
              name: 'Read Fleet',
              resource: 'fleet',
              action: 'read',
            },
            effect: 'allow',
          },
        ],
        isAdmin: false,
        fetchedAt: '2024-01-01T12:00:00Z',
      }
      
      expect(userPermissions.user.character_name).toBe('TestPilot')
      expect(userPermissions.roles).toHaveLength(1)
      expect(userPermissions.permissions).toHaveLength(1)
      expect(userPermissions.isAdmin).toBe(false)
      expect(userPermissions.fetchedAt).toBe('2024-01-01T12:00:00Z')
    })
  })

  describe('VulturSSOClientConfig', () => {
    it('should accept complete client configuration', () => {
      const config: VulturSSOClientConfig = {
        identApiUrl: 'https://api.example.com',
        applicationName: 'test-app',
        permissionConfig: {
          applicationName: 'test-app',
          version: '1.0.0',
          permissions: [],
          lastUpdated: '2024-01-01T00:00:00Z',
        },
        enableCache: true,
        cacheDuration: 300000,
      }
      
      expect(config.identApiUrl).toBe('https://api.example.com')
      expect(config.applicationName).toBe('test-app')
      expect(config.enableCache).toBe(true)
      expect(config.cacheDuration).toBe(300000)
    })

    it('should accept minimal configuration', () => {
      const config: VulturSSOClientConfig = {
        identApiUrl: 'https://api.example.com',
        applicationName: 'test-app',
        permissionConfig: {
          applicationName: 'test-app',
          version: '1.0.0',
          permissions: [],
          lastUpdated: '2024-01-01T00:00:00Z',
        },
      }
      
      expect(config.enableCache).toBeUndefined()
      expect(config.cacheDuration).toBeUndefined()
    })
  })

  describe('VulturSSOError', () => {
    it('should accept all error types', () => {
      const errors: Array<{ code: VulturSSOError['code']; message: string }> = [
        { code: 'UNAUTHORIZED', message: 'Unauthorized access' },
        { code: 'FORBIDDEN', message: 'Forbidden action' },
        { code: 'NOT_FOUND', message: 'Resource not found' },
        { code: 'NETWORK_ERROR', message: 'Network connection failed' },
        { code: 'CONFIG_ERROR', message: 'Configuration error' },
      ]
      
      errors.forEach(({ code, message }) => {
        const error = new VulturSSOError(code, message, { extra: 'info' })
        
        expect(error.code).toBe(code)
        expect(error.message).toBe(message)
        expect(error.details).toEqual({ extra: 'info' })
      })
    })
  })

  describe('UseVulturPermissionsOptions', () => {
    it('should accept all options', () => {
      const options: UseVulturPermissionsOptions = {
        enabled: true,
        apiUrl: 'https://custom-api.example.com',
        refetchOnWindowFocus: false,
        refetchInterval: 30000,
      }
      
      expect(options.enabled).toBe(true)
      expect(options.apiUrl).toBe('https://custom-api.example.com')
      expect(options.refetchOnWindowFocus).toBe(false)
      expect(options.refetchInterval).toBe(30000)
    })

    it('should accept empty options', () => {
      const options: UseVulturPermissionsOptions = {}
      
      expect(options.enabled).toBeUndefined()
      expect(options.apiUrl).toBeUndefined()
      expect(options.refetchOnWindowFocus).toBeUndefined()
      expect(options.refetchInterval).toBeUndefined()
    })
  })
})

describe('Type Compatibility', () => {
  it('should allow permission scope in permission config', () => {
    const scope: PermissionScope = {
      id: 'test:read',
      name: 'Test Read',
      resource: 'test',
      action: 'read',
    }

    const config: VulturPermissionConfig = {
      applicationName: 'test-app',
      version: '1.0.0',
      permissions: [scope],
      lastUpdated: '2024-01-01T00:00:00Z',
    }
    
    expect(config.permissions[0]).toBe(scope)
  })

  it('should allow user roles in user permissions', () => {
    const role: UserRole = {
      id: 1,
      name: 'Test Role',
      description: 'Test role description',
      created_by: '0xadmin',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      is_active: true,
    }

    const userPermissions: UserPermissions = {
      user: {
        eth_address: '0x123',
        character_name: 'TestUser',
        roles: ['Test Role'],
        is_admin: false,
      },
      roles: [role],
      permissions: [],
      isAdmin: false,
      fetchedAt: '2024-01-01T12:00:00Z',
    }
    
    expect(userPermissions.roles[0]).toBe(role)
  })

  it('should allow permission config in client config', () => {
    const permissionConfig: VulturPermissionConfig = {
      applicationName: 'test-app',
      version: '1.0.0',
      permissions: [],
      lastUpdated: '2024-01-01T00:00:00Z',
    }

    const clientConfig: VulturSSOClientConfig = {
      identApiUrl: 'https://api.example.com',
      applicationName: 'test-app',
      permissionConfig,
    }
    
    expect(clientConfig.permissionConfig).toBe(permissionConfig)
  })
})

describe('Type Inference', () => {
  it('should infer permission effect types', () => {
    const allowEffect: PermissionEffect = 'allow'
    const denyEffect: PermissionEffect = 'deny'
    
    // TypeScript should not allow invalid effects
    expect(allowEffect).toBe('allow')
    expect(denyEffect).toBe('deny')
  })

  it('should infer error code types', () => {
    const codes: VulturSSOError['code'][] = [
      'UNAUTHORIZED',
      'FORBIDDEN', 
      'NOT_FOUND',
      'NETWORK_ERROR',
      'CONFIG_ERROR',
    ]
    
    expect(codes).toHaveLength(5)
  })

  it('should require all required fields', () => {
    // These should compile without errors
    const minimalScope: PermissionScope = {
      id: 'test',
      name: 'Test',
      resource: 'test',
      action: 'read',
    }

    const minimalUser: UserInfo = {
      eth_address: '0x123',
      character_name: 'Test',
      roles: [],
      is_admin: false,
    }

    const minimalConfig: VulturPermissionConfig = {
      applicationName: 'test',
      version: '1.0.0',
      permissions: [],
      lastUpdated: '2024-01-01T00:00:00Z',
    }
    
    expect(minimalScope.id).toBe('test')
    expect(minimalUser.eth_address).toBe('0x123')
    expect(minimalConfig.applicationName).toBe('test')
  })
})
