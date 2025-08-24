/**
 * Example configuration for a VULTUR tribal application
 * This shows how to set up permissions for a comprehensive tribal ecosystem
 */

import { 
  initializeVulturSSO, 
  VulturPermissionConfigBuilder,
  PermissionPatterns 
} from '@vultur-evefrontier/vultur-sso-client';

// Create a comprehensive permission configuration for a tribal ecosystem
const permissionConfig = VulturPermissionConfigBuilder
  .create('vultur-tribal-ecosystem', '1.0.0')
  
  // Basic tribal permissions using the tribal pattern
  .addPermissionScope(...PermissionPatterns.tribal('tribe', 'Tribe Management'))
  
  // Fleet management permissions using CRUD pattern
  .addPermissionScope(...PermissionPatterns.crud('fleet', 'Fleet Operations'))
  
  // Warehouse management system permissions
  .addPermissionScope(...PermissionPatterns.crud('warehouse', 'Warehouse Management'))
  .addPermissionScope({
    id: 'warehouse:receive',
    name: 'Warehouse Receiving',
    description: 'Process incoming shipments and materials',
    resource: 'warehouse',
    action: 'receive'
  })
  .addPermissionScope({
    id: 'warehouse:pick',
    name: 'Warehouse Picking',
    description: 'Pick items for order fulfillment',
    resource: 'warehouse',
    action: 'pick'
  })
  .addPermissionScope({
    id: 'warehouse:fulfill',
    name: 'Order Fulfillment',
    description: 'Complete order fulfillment process',
    resource: 'warehouse',
    action: 'fulfill'
  })
  
  // Token/financial system permissions
  .addPermissionScope({
    id: 'token:mint',
    name: 'Mint Tokens',
    description: 'Create new tokens for rewards and payments',
    resource: 'token',
    action: 'mint'
  })
  .addPermissionScope({
    id: 'token:burn',
    name: 'Burn Tokens',
    description: 'Destroy tokens as penalties or deflationary mechanism',
    resource: 'token',
    action: 'burn'
  })
  .addPermissionScope({
    id: 'token:stake',
    name: 'Stake Tokens',
    description: 'Stake tokens for governance or rewards',
    resource: 'token',
    action: 'stake'
  })
  .addPermissionScope({
    id: 'token:slash',
    name: 'Slash Stakes',
    description: 'Penalize staked tokens for violations',
    resource: 'token',
    action: 'slash'
  })
  
  // Railway/transport network permissions
  .addPermissionScope({
    id: 'transport:gate',
    name: 'Gate Operations',
    description: 'Control transport gates and routing',
    resource: 'transport',
    action: 'gate'
  })
  .addPermissionScope({
    id: 'transport:route',
    name: 'Route Planning',
    description: 'Plan and modify transport routes',
    resource: 'transport',
    action: 'route'
  })
  .addPermissionScope(...PermissionPatterns.crud('transport', 'Transport Network'))
  
  // ZKP/Privacy system permissions
  .addPermissionScope({
    id: 'zkp:generate',
    name: 'Generate Proofs',
    description: 'Generate zero-knowledge proofs for operations',
    resource: 'zkp',
    action: 'generate'
  })
  .addPermissionScope({
    id: 'zkp:verify',
    name: 'Verify Proofs',
    description: 'Verify zero-knowledge proofs',
    resource: 'zkp',
    action: 'verify'
  })
  
  // Standings/reputation system
  .addPermissionScope(...PermissionPatterns.crud('standings', 'Standings System'))
  .addPermissionScope({
    id: 'standings:zkp',
    name: 'ZKP Standings',
    description: 'Access ZKP-based private standings data',
    resource: 'standings',
    action: 'zkp'
  })
  
  // Courier contracts
  .addPermissionScope(...PermissionPatterns.crud('contracts', 'Courier Contracts'))
  .addPermissionScope({
    id: 'contracts:accept',
    name: 'Accept Contracts',
    description: 'Accept courier contracts as a service provider',
    resource: 'contracts',
    action: 'accept'
  })
  .addPermissionScope({
    id: 'contracts:complete',
    name: 'Complete Contracts',
    description: 'Mark contracts as completed',
    resource: 'contracts',
    action: 'complete'
  })
  
  // POD (Proof of Delivery) system
  .addPermissionScope({
    id: 'pod:create',
    name: 'Create POD',
    description: 'Create proof of delivery records',
    resource: 'pod',
    action: 'create'
  })
  .addPermissionScope({
    id: 'pod:verify',
    name: 'Verify POD',
    description: 'Verify proof of delivery authenticity',
    resource: 'pod',
    action: 'verify'
  })
  
  // Set default permissions for public access
  .addDefaultPermission('tribe:member', 'allow') // Basic tribal membership view
  .addDefaultPermission('fleet:read', 'allow')   // Public fleet information
  .addDefaultPermission('transport:read', 'allow') // Public transport schedules
  .addDefaultPermission('standings:read', 'allow') // Public standings (non-ZKP)
  .addDefaultPermission('contracts:read', 'allow') // Public contract listings
  
  .build();

// Initialize the SSO client
initializeVulturSSO({
  identApiUrl: process.env.NEXT_PUBLIC_VULTUR_IDENT_API || 'http://localhost:8000',
  applicationName: 'vultur-tribal-ecosystem',
  permissionConfig,
  enableCache: true,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
});

export { permissionConfig };
