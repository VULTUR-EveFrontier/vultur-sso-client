import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  initializeVulturSSO,
  getVulturSSOConfig,
  getPermissionConfig,
  resetVulturSSOConfig,
  VulturPermissionConfigBuilder,
  PermissionPatterns,
} from '../config'
import type { VulturSSOClientConfig, VulturPermissionConfig } from '../types'

describe('Configuration', () => {
  beforeEach(() => {
    // Reset global config before each test
    resetVulturSSOConfig()
  })

  describe('initializeVulturSSO', () => {
    it('should initialize configuration with required fields', () => {
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

      expect(() => initializeVulturSSO(config)).not.toThrow()
    })

    it('should set default values for optional fields', () => {
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

      initializeVulturSSO(config)
      const storedConfig = getVulturSSOConfig()

      expect(storedConfig.enableCache).toBe(true)
      expect(storedConfig.cacheDuration).toBe(5 * 60 * 1000)
    })

    it('should throw error for missing identApiUrl', () => {
      const config = {
        applicationName: 'test-app',
        permissionConfig: {
          applicationName: 'test-app',
          version: '1.0.0',
          permissions: [],
          lastUpdated: '2024-01-01T00:00:00Z',
        },
      } as VulturSSOClientConfig

      expect(() => initializeVulturSSO(config)).toThrow('identApiUrl is required')
    })

    it('should throw error for missing applicationName', () => {
      const config = {
        identApiUrl: 'https://api.example.com',
        permissionConfig: {
          applicationName: 'test-app',
          version: '1.0.0',
          permissions: [],
          lastUpdated: '2024-01-01T00:00:00Z',
        },
      } as VulturSSOClientConfig

      expect(() => initializeVulturSSO(config)).toThrow('applicationName is required')
    })

    it('should throw error for missing permissionConfig', () => {
      const config = {
        identApiUrl: 'https://api.example.com',
        applicationName: 'test-app',
      } as VulturSSOClientConfig

      expect(() => initializeVulturSSO(config)).toThrow('permissionConfig is required')
    })
  })

  describe('getVulturSSOConfig', () => {
    it('should throw error when not initialized', () => {
      expect(() => getVulturSSOConfig()).toThrow('VULTUR SSO Client not initialized')
    })

    it('should return config after initialization', () => {
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

      initializeVulturSSO(config)
      const storedConfig = getVulturSSOConfig()

      expect(storedConfig.identApiUrl).toBe('https://api.example.com')
      expect(storedConfig.applicationName).toBe('test-app')
    })
  })

  describe('getPermissionConfig', () => {
    it('should return permission config after initialization', () => {
      const permissionConfig: VulturPermissionConfig = {
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
        ],
        lastUpdated: '2024-01-01T00:00:00Z',
      }

      const config: VulturSSOClientConfig = {
        identApiUrl: 'https://api.example.com',
        applicationName: 'test-app',
        permissionConfig,
      }

      initializeVulturSSO(config)
      const storedPermissionConfig = getPermissionConfig()

      expect(storedPermissionConfig).toEqual(permissionConfig)
    })
  })
})

describe('VulturPermissionConfigBuilder', () => {
  it('should create basic config', () => {
    const config = VulturPermissionConfigBuilder
      .create('test-app', '1.0.0')
      .build()

    expect(config.applicationName).toBe('test-app')
    expect(config.version).toBe('1.0.0')
    expect(config.permissions).toEqual([])
    expect(config.lastUpdated).toBeDefined()
  })

  it('should add permission scope', () => {
    const config = VulturPermissionConfigBuilder
      .create('test-app', '1.0.0')
      .addPermissionScope({
        id: 'test:read',
        name: 'Test Read',
        description: 'Read test data',
        resource: 'test',
        action: 'read',
      })
      .build()

    expect(config.permissions).toHaveLength(1)
    expect(config.permissions[0].id).toBe('test:read')
    expect(config.permissions[0].name).toBe('Test Read')
  })

  it('should add multiple permission scopes', () => {
    const config = VulturPermissionConfigBuilder
      .create('test-app', '1.0.0')
      .addPermissionScope({
        id: 'test:read',
        name: 'Test Read',
        resource: 'test',
        action: 'read',
      })
      .addPermissionScope({
        id: 'test:write',
        name: 'Test Write',
        resource: 'test',
        action: 'write',
      })
      .build()

    expect(config.permissions).toHaveLength(2)
    expect(config.permissions[0].id).toBe('test:read')
    expect(config.permissions[1].id).toBe('test:write')
  })

  it('should add default permissions', () => {
    const config = VulturPermissionConfigBuilder
      .create('test-app', '1.0.0')
      .addPermissionScope({
        id: 'test:read',
        name: 'Test Read',
        resource: 'test',
        action: 'read',
      })
      .addDefaultPermission('test:read', 'allow')
      .build()

    expect(config.defaultPermissions).toHaveLength(1)
    expect(config.defaultPermissions![0].scope.id).toBe('test:read')
    expect(config.defaultPermissions![0].effect).toBe('allow')
  })

  it('should throw error when adding default permission for non-existent scope', () => {
    const builder = VulturPermissionConfigBuilder.create('test-app', '1.0.0')

    expect(() => builder.addDefaultPermission('test:read', 'allow')).toThrow(
      "Permission scope 'test:read' not found"
    )
  })

  it('should throw error when building without application name', () => {
    const builder = new (VulturPermissionConfigBuilder as any)()
    builder.config = { permissions: [] }

    expect(() => builder.build()).toThrow('Application name is required')
  })

  it('should throw error when building without version', () => {
    const builder = new (VulturPermissionConfigBuilder as any)()
    builder.config = { applicationName: 'test-app', permissions: [] }

    expect(() => builder.build()).toThrow('Version is required')
  })

  it('should throw error when building without permissions', () => {
    const builder = new (VulturPermissionConfigBuilder as any)()
    builder.config = { applicationName: 'test-app', version: '1.0.0' }

    expect(() => builder.build()).toThrow('At least one permission scope is required')
  })

  it('should use default version when not specified', () => {
    const config = VulturPermissionConfigBuilder
      .create('test-app')
      .addPermissionScope({
        id: 'test:read',
        name: 'Test Read',
        resource: 'test',
        action: 'read',
      })
      .build()

    expect(config.version).toBe('1.0.0')
  })
})

describe('PermissionPatterns', () => {
  describe('crud', () => {
    it('should create CRUD permissions for a resource', () => {
      const permissions = PermissionPatterns.crud('test')

      expect(permissions).toHaveLength(4)
      expect(permissions[0].id).toBe('test:read')
      expect(permissions[1].id).toBe('test:write')
      expect(permissions[2].id).toBe('test:delete')
      expect(permissions[3].id).toBe('test:admin')
    })

    it('should use custom display name', () => {
      const permissions = PermissionPatterns.crud('test', 'Test Resource')

      expect(permissions[0].name).toBe('Read Test Resource')
      expect(permissions[1].name).toBe('Write Test Resource')
      expect(permissions[2].name).toBe('Delete Test Resource')
      expect(permissions[3].name).toBe('Admin Test Resource')
    })

    it('should create proper descriptions', () => {
      const permissions = PermissionPatterns.crud('test', 'Test Resource')

      expect(permissions[0].description).toBe('View Test Resource data')
      expect(permissions[1].description).toBe('Create and update Test Resource data')
      expect(permissions[2].description).toBe('Delete Test Resource data')
      expect(permissions[3].description).toBe('Full administrative access to Test Resource')
    })
  })

  describe('tribal', () => {
    it('should create tribal hierarchy permissions', () => {
      const permissions = PermissionPatterns.tribal('fleet')

      expect(permissions).toHaveLength(4)
      expect(permissions[0].id).toBe('fleet:member')
      expect(permissions[1].id).toBe('fleet:officer')
      expect(permissions[2].id).toBe('fleet:director')
      expect(permissions[3].id).toBe('fleet:ceo')
    })

    it('should use custom display name', () => {
      const permissions = PermissionPatterns.tribal('fleet', 'Fleet Operations')

      expect(permissions[0].name).toBe('Fleet Operations Member')
      expect(permissions[1].name).toBe('Fleet Operations Officer')
      expect(permissions[2].name).toBe('Fleet Operations Director')
      expect(permissions[3].name).toBe('Fleet Operations CEO')
    })

    it('should create proper actions', () => {
      const permissions = PermissionPatterns.tribal('fleet')

      expect(permissions[0].action).toBe('member')
      expect(permissions[1].action).toBe('officer')
      expect(permissions[2].action).toBe('director')
      expect(permissions[3].action).toBe('ceo')
    })
  })
})

describe('Integration', () => {
  it('should work with permission patterns in builder', () => {
    const builder = VulturPermissionConfigBuilder.create('test-app', '1.0.0')
    
    // Add CRUD permissions
    const crudPermissions = PermissionPatterns.crud('fleet')
    crudPermissions.forEach(permission => builder.addPermissionScope(permission))
    
    // Add tribal permissions
    const tribalPermissions = PermissionPatterns.tribal('warehouse')
    tribalPermissions.forEach(permission => builder.addPermissionScope(permission))
    
    const config = builder
      .addDefaultPermission('fleet:read', 'allow')
      .build()

    expect(config.permissions).toHaveLength(8) // 4 CRUD + 4 tribal
    expect(config.defaultPermissions).toHaveLength(1)
    
    const fleetReadPermission = config.permissions.find(p => p.id === 'fleet:read')
    expect(fleetReadPermission).toBeDefined()
    
    const warehouseMemberPermission = config.permissions.find(p => p.id === 'warehouse:member')
    expect(warehouseMemberPermission).toBeDefined()
  })
})
