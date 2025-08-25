import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import type { UserInfo, UserRole } from '../../types'

// Mock data
export const mockUserInfo: UserInfo = {
  eth_address: '0x1234567890abcdef1234567890abcdef12345678',
  character_name: 'TestPilot',
  roles: ['Fleet Member', 'Warehouse Worker'],
  is_admin: false,
  tribe_id: 12345,
}

export const mockAdminUser: UserInfo = {
  eth_address: '0xadmin1234567890abcdef1234567890abcdef12',
  character_name: 'AdminPilot',
  roles: ['Administrator'],
  is_admin: true,
  tribe_id: 12345,
}

export const mockUserRoles: UserRole[] = [
  {
    id: 1,
    name: 'Fleet Member',
    description: 'Basic fleet operations access',
    created_by: '0xadmin1234567890abcdef1234567890abcdef12',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true,
  },
  {
    id: 2,
    name: 'Warehouse Worker',
    description: 'Warehouse operations access',
    created_by: '0xadmin1234567890abcdef1234567890abcdef12',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true,
  },
]

// Request handlers
export const handlers = [
  // GET /me - Current user info
  http.get('*/me', ({ request }) => {
    const auth = request.headers.get('Authorization')
    
    if (!auth || !auth.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 })
    }

    const token = auth.slice(7)
    
    if (token === 'valid-token') {
      return HttpResponse.json(mockUserInfo)
    }
    
    if (token === 'admin-token') {
      return HttpResponse.json(mockAdminUser)
    }
    
    if (token === 'expired-token') {
      return new HttpResponse(null, { status: 401 })
    }
    
    if (token === 'network-error-token') {
      return new HttpResponse(null, { status: 500 })
    }
    
    return new HttpResponse(null, { status: 401 })
  }),

  // GET /users/:address/roles - User roles
  http.get('*/users/:address/roles', ({ params, request }) => {
    const auth = request.headers.get('Authorization')
    
    if (!auth || !auth.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 })
    }

    const token = auth.slice(7)
    const { address } = params
    
    // Check token validity first
    if (token === 'invalid-token' || token === 'expired-token') {
      return new HttpResponse(null, { status: 401 })
    }
    
    if (token === 'network-error-token') {
      return new HttpResponse(null, { status: 500 })
    }
    
    if ((address === mockUserInfo.eth_address && token === 'valid-token') || 
        (address === mockAdminUser.eth_address && token === 'admin-token')) {
      return HttpResponse.json(mockUserRoles)
    }
    
    return new HttpResponse(null, { status: 404 })
  }),

  // GET /users/:address - User info by address
  http.get('*/users/:address', ({ params, request }) => {
    const auth = request.headers.get('Authorization')
    
    if (!auth || !auth.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 })
    }

    const token = auth.slice(7)
    const { address } = params
    
    // Only admin can access this endpoint
    if (token !== 'admin-token') {
      return new HttpResponse(null, { status: 403 })
    }
    
    if (address === mockUserInfo.eth_address) {
      return HttpResponse.json(mockUserInfo)
    }
    
    if (address === mockAdminUser.eth_address) {
      return HttpResponse.json(mockAdminUser)
    }
    
    return new HttpResponse(null, { status: 404 })
  }),

  // GET /users/:address/permissions/:app/:scope - Permission check
  http.get('*/users/:address/permissions/:app/:scope', ({ params, request }) => {
    const auth = request.headers.get('Authorization')
    
    if (!auth || !auth.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 })
    }

    const token = auth.slice(7)
    const { address, app, scope } = params
    
    // Check token validity first
    if (token === 'invalid-token' || token === 'expired-token') {
      return new HttpResponse(null, { status: 401 })
    }
    
    // Mock permission logic
    if (address === mockUserInfo.eth_address && app === 'test-app' && token === 'valid-token') {
      if (scope === 'read' || scope === 'test:read') {
        return HttpResponse.json({ allowed: true })
      }
      if (scope === 'admin' || scope === 'test:admin') {
        return HttpResponse.json({ allowed: false })
      }
    }
    
    if (address === mockAdminUser.eth_address && token === 'admin-token') {
      return HttpResponse.json({ allowed: true })
    }
    
    return new HttpResponse(null, { status: 404 })
  }),

  // Health check
  http.get('*/health', () => {
    return HttpResponse.json({
      status: 'ok',
      database: true,
      timestamp: new Date().toISOString(),
    })
  }),
]

// Create server instance
export const server = setupServer(...handlers)
