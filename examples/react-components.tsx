/**
 * Example React components showing how to use the vultur-sso-client hooks
 */

'use client';

import React from 'react';
import { 
  useVulturPermissions, 
  usePermissionCheck, 
  useVulturAuth 
} from '@vultur-evefrontier/vultur-sso-client';

/**
 * Authentication status component
 */
export function AuthStatus() {
  const { isAuthenticated, user, isLoading, error } = useVulturAuth();

  if (isLoading) {
    return <div className="auth-status loading">Checking authentication...</div>;
  }

  if (error) {
    return (
      <div className="auth-status error">
        Authentication error: {error.message}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-status unauthenticated">
        <p>Please log in to access this application.</p>
      </div>
    );
  }

  return (
    <div className="auth-status authenticated">
      <p>Welcome, {user?.character_name}</p>
      <p>Address: {user?.eth_address}</p>
      {user?.tribe_id && <p>Tribe ID: {user.tribe_id}</p>}
    </div>
  );
}

/**
 * Permission-gated content component
 */
export function PermissionGatedContent() {
  const { hasPermission, hasRole, isAdmin } = usePermissionCheck();

  return (
    <div className="permission-gated-content">
      <h2>Available Features</h2>
      
      {/* Basic tribe viewing - available to all members */}
      {hasPermission('tribe:member') && (
        <div className="feature-card">
          <h3>Tribal Information</h3>
          <p>View tribal roster and basic information</p>
        </div>
      )}

      {/* Fleet operations - requires fleet permissions */}
      {hasPermission('fleet:read') && (
        <div className="feature-card">
          <h3>Fleet Status</h3>
          <p>View current fleet operations and schedules</p>
          
          {hasPermission('fleet:write') && (
            <div className="sub-feature">
              <p>✓ Create and modify fleet operations</p>
            </div>
          )}
          
          {hasPermission('fleet:admin') && (
            <div className="sub-feature">
              <p>✓ Full fleet administration</p>
            </div>
          )}
        </div>
      )}

      {/* Warehouse management - hierarchical permissions */}
      {hasPermission('warehouse:read') && (
        <div className="feature-card">
          <h3>Warehouse Management</h3>
          <p>View warehouse inventory and operations</p>
          
          {hasPermission('warehouse:receive') && (
            <div className="sub-feature">
              <p>✓ Process incoming shipments</p>
            </div>
          )}
          
          {hasPermission('warehouse:pick') && (
            <div className="sub-feature">
              <p>✓ Pick items for orders</p>
            </div>
          )}
          
          {hasPermission('warehouse:fulfill') && (
            <div className="sub-feature">
              <p>✓ Complete order fulfillment</p>
            </div>
          )}
        </div>
      )}

      {/* Token/financial operations - restricted access */}
      {hasPermission('token:stake') && (
        <div className="feature-card">
          <h3>Token Operations</h3>
          <p>Stake tokens for governance and rewards</p>
          
          {hasPermission('token:mint') && (
            <div className="sub-feature admin-only">
              <p>✓ Mint new tokens (Admin only)</p>
            </div>
          )}
          
          {hasPermission('token:slash') && (
            <div className="sub-feature admin-only">
              <p>✓ Slash staked tokens (Admin only)</p>
            </div>
          )}
        </div>
      )}

      {/* Role-based access */}
      {hasRole('Fleet Commander') && (
        <div className="feature-card role-based">
          <h3>Fleet Command Center</h3>
          <p>Advanced fleet coordination tools</p>
        </div>
      )}

      {hasRole('Warehouse Manager') && (
        <div className="feature-card role-based">
          <h3>Warehouse Analytics</h3>
          <p>Warehouse performance metrics and optimization</p>
        </div>
      )}

      {/* Admin-only features */}
      {isAdmin() && (
        <div className="feature-card admin-only">
          <h3>Administrative Panel</h3>
          <p>Full system administration and configuration</p>
          <div className="admin-features">
            <p>✓ User role management</p>
            <p>✓ Permission configuration</p>
            <p>✓ System monitoring</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Detailed permissions display for debugging
 */
export function PermissionsDebugPanel() {
  const { data: userPermissions, isLoading, error } = useVulturPermissions();

  if (isLoading) {
    return <div>Loading permissions...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <h3>Permission Error</h3>
        <p>Code: {error.code}</p>
        <p>Message: {error.message}</p>
      </div>
    );
  }

  if (!userPermissions) {
    return <div>No permissions data available</div>;
  }

  return (
    <div className="permissions-debug">
      <h3>User Permissions Debug</h3>
      
      <div className="user-info">
        <h4>User Information</h4>
        <pre>{JSON.stringify(userPermissions.user, null, 2)}</pre>
      </div>
      
      <div className="roles">
        <h4>Roles ({userPermissions.roles.length})</h4>
        {userPermissions.roles.map(role => (
          <div key={role.id} className="role">
            <strong>{role.name}</strong>
            {role.description && <p>{role.description}</p>}
            <small>
              Active: {role.is_active ? 'Yes' : 'No'} | 
              Created: {new Date(role.created_at).toLocaleDateString()}
            </small>
          </div>
        ))}
      </div>
      
      <div className="permissions">
        <h4>Resolved Permissions ({userPermissions.permissions.length})</h4>
        {userPermissions.permissions.map((permission, index) => (
          <div key={index} className="permission">
            <div className="permission-header">
              <strong>{permission.scope.name}</strong>
              <span className={`effect ${permission.effect}`}>
                {permission.effect.toUpperCase()}
              </span>
            </div>
            <div className="permission-details">
              <p>ID: {permission.scope.id}</p>
              <p>Resource: {permission.scope.resource}</p>
              <p>Action: {permission.scope.action}</p>
              {permission.scope.description && (
                <p>Description: {permission.scope.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="metadata">
        <h4>Metadata</h4>
        <p>Is Admin: {userPermissions.isAdmin ? 'Yes' : 'No'}</p>
        <p>Fetched At: {new Date(userPermissions.fetchedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}

/**
 * Main application component showing complete integration
 */
export function VulturApp() {
  return (
    <div className="vultur-app">
      <header>
        <h1>VULTUR Tribal Ecosystem</h1>
        <AuthStatus />
      </header>
      
      <main>
        <PermissionGatedContent />
      </main>
      
      {process.env.NODE_ENV === 'development' && (
        <aside className="debug-panel">
          <PermissionsDebugPanel />
        </aside>
      )}
    </div>
  );
}
