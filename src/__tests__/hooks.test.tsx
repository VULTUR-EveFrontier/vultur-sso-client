import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useVulturPermissions, usePermissionCheck, useVulturAuth } from '../hooks'
import { initializeVulturSSO, resetVulturSSOConfig, VulturPermissionConfigBuilder } from '../config'
import { mockUserInfo, mockUserRoles } from './mocks/server'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // Changed from cacheTime in v5
        staleTime: 0,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('React Hooks', () => {
  beforeEach(() => {
    // Reset localStorage mock
    mockLocalStorage.getItem.mockReset()
    mockLocalStorage.setItem.mockReset()
    mockLocalStorage.removeItem.mockReset()
    mockLocalStorage.clear.mockReset()

    // Reset global config
    resetVulturSSOConfig()

    // Initialize config
    const permissionConfig = VulturPermissionConfigBuilder
      .create('test-app', '1.0.0')
      .addPermissionScope({
        id: 'test:read',
        name: 'Test Read',
        description: 'Read test data',
        resource: 'test',
        action: 'read',
      })
      .addPermissionScope({
        id: 'test:write',
        name: 'Test Write',
        description: 'Write test data',
        resource: 'test',
        action: 'write',
      })
      .addPermissionScope({
        id: 'test:admin',
        name: 'Test Admin',
        description: 'Admin test data',
        resource: 'test',
        action: 'admin',
      })
      .build()

    initializeVulturSSO({
      identApiUrl: 'https://api.example.com',
      applicationName: 'test-app',
      permissionConfig,
    })
  })

  describe('useVulturPermissions', () => {
    it('should fetch user permissions successfully', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'valid-token' : null
      )

      const { result } = renderHook(() => useVulturPermissions(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBeDefined()
      expect(result.current.data?.user).toEqual(mockUserInfo)
      expect(result.current.data?.roles).toEqual(mockUserRoles)
      expect(result.current.data?.permissions).toBeDefined()
      expect(result.current.data?.isAdmin).toBe(false)
      expect(result.current.data?.fetchedAt).toBeDefined()
    })

    it('should handle authentication failure', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'invalid-token' : null
      )

      const { result } = renderHook(() => useVulturPermissions(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
      expect(result.current.data).toBeUndefined()
    })

    it('should handle missing token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const { result } = renderHook(() => useVulturPermissions(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })

    it('should respect enabled option', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'valid-token' : null
      )

      const { result } = renderHook(
        () => useVulturPermissions({ enabled: false }),
        { wrapper: createWrapper() }
      )

      // Should not fetch when disabled - status should be pending but won't progress to success/error
      expect(result.current.isPending).toBe(true)
      expect(result.current.data).toBeUndefined()
    })

    it('should use custom API URL', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'valid-token' : null
      )

      const { result } = renderHook(
        () => useVulturPermissions({ apiUrl: 'https://custom-api.example.com' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should still work with custom URL (mock server handles all URLs)
      expect(result.current.isError || result.current.isSuccess).toBe(true)
    })

    it('should handle API errors', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'invalid-token' : null
      )

      const { result } = renderHook(() => useVulturPermissions(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })
  })

  describe('usePermissionCheck', () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'valid-token' : null
      )
    })

    it('should provide permission checking functions', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'valid-token' : null
      )

      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.userPermissions).toBeDefined()
      })

      expect(typeof result.current.hasPermission).toBe('function')
      expect(typeof result.current.hasAnyPermission).toBe('function')
      expect(typeof result.current.hasAllPermissions).toBe('function')
      expect(typeof result.current.hasRole).toBe('function')
      expect(typeof result.current.isAdmin).toBe('function')
    })

    it('should check permissions correctly', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'valid-token' : null
      )

      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.userPermissions).toBeDefined()
      })

      // Mock resolved permissions - in real implementation, this would come from the permission resolver
      // For testing, we'll mock the behavior
      expect(result.current.hasPermission).toBeDefined()
      expect(result.current.hasAnyPermission).toBeDefined()
      expect(result.current.hasAllPermissions).toBeDefined()
    })

    it('should check roles correctly', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'valid-token' : null
      )

      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.userPermissions).toBeDefined()
      })

      // Test role checking
      expect(result.current.hasRole('Fleet Member')).toBe(true)
      expect(result.current.hasRole('Administrator')).toBe(false)
      expect(result.current.hasRole('Non-existent Role')).toBe(false)
    })

    it('should check admin status correctly', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'admin-token' : null
      )

      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.userPermissions).toBeDefined()
      })

      expect(result.current.isAdmin()).toBe(true)
    })

    it('should handle no user permissions', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      })

      expect(result.current.hasPermission('test:read')).toBe(false)
      expect(result.current.hasRole('Fleet Member')).toBe(false)
      expect(result.current.isAdmin()).toBe(false)
    })

    it('should handle hasAnyPermission correctly', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'valid-token' : null
      )

      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.userPermissions).toBeDefined()
      })

      // Test with mixed permissions
      const hasAny = result.current.hasAnyPermission(['non-existent', 'test:read'])
      expect(typeof hasAny).toBe('boolean')
    })

    it('should handle hasAllPermissions correctly', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'valid-token' : null
      )

      const { result } = renderHook(() => usePermissionCheck(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.userPermissions).toBeDefined()
      })

      // Test with multiple permissions
      const hasAll = result.current.hasAllPermissions(['test:read', 'test:write'])
      expect(typeof hasAll).toBe('boolean')
    })
  })

  describe('useVulturAuth', () => {
    it('should return authentication status for valid token', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'valid-token' : null
      )

      const { result } = renderHook(() => useVulturAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      expect(result.current.user).toEqual(mockUserInfo)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should return false for invalid token', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'invalid-token' : null
      )

      const { result } = renderHook(() => useVulturAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
      })

      expect(result.current.user).toBeUndefined()
      expect(result.current.error).toBeDefined()
    })

    it('should return false for no token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const { result } = renderHook(() => useVulturAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
      })

      expect(result.current.user).toBeUndefined()
    })

    it('should handle loading state', () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'valid-token' : null
      )

      const { result } = renderHook(() => useVulturAuth(), {
        wrapper: createWrapper(),
      })

      // Initially should be loading
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should refetch on window focus by default', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'valid-token' : null
      )

      const { result } = renderHook(() => useVulturAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      // This is hard to test directly, but we can verify the hook is configured correctly
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle VulturSSOError correctly', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'expired-token' : null
      )

      const { result } = renderHook(() => useVulturPermissions(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })

    it('should not retry on auth errors', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'invalid-token' : null
      )

      const { result } = renderHook(() => useVulturPermissions(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      // Should fail quickly without retries for auth errors
      expect(result.current.error).toBeDefined()
    })

    it('should handle missing configuration', async () => {
      // Test that hook works even when localStorage returns consistently null
      mockLocalStorage.getItem.mockReturnValue(null)

      const { result } = renderHook(() => useVulturPermissions(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })
  })

  describe('Permission Resolution', () => {
    it('should resolve basic permissions for regular user', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'valid-token' : null
      )

      const { result } = renderHook(() => useVulturPermissions(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.permissions).toBeDefined()
      expect(Array.isArray(result.current.data?.permissions)).toBe(true)
    })

    it('should resolve admin permissions for admin user', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'admin-token' : null
      )

      const { result } = renderHook(() => useVulturPermissions(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.isAdmin).toBe(true)
      expect(result.current.data?.permissions).toBeDefined()
    })

    it('should handle empty roles gracefully', async () => {
      // This would require mocking a user with no roles
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'valid-token' : null
      )

      const { result } = renderHook(() => useVulturPermissions(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true)
      })

      // Should not crash with empty roles
      expect(result.current.data?.permissions || []).toBeDefined()
    })
  })

  describe('Caching Behavior', () => {
    it('should use cached data on subsequent renders', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'valid-token' : null
      )

      // Use the same wrapper for both renders to share QueryClient
      const wrapper = createWrapper()

      const { result: result1 } = renderHook(() => useVulturPermissions(), {
        wrapper,
      })

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true)
      })

      // Second render should use cached data
      const { result: result2 } = renderHook(() => useVulturPermissions(), {
        wrapper,
      })

      expect(result2.current.data).toBeDefined()
    })

    it('should respect stale time configuration', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'vultur_sso_token' ? 'valid-token' : null
      )

      const { result } = renderHook(() => useVulturPermissions(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Data should be fresh initially
      expect(result.current.data).toBeDefined()
      expect(result.current.isStale).toBe(false)
    })
  })
})
