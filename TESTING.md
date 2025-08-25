# Testing Guide

This document describes the comprehensive test suite for `@vultur-evefrontier/vultur-sso-client`.

## Test Framework

- **Vitest**: Modern test runner with native TypeScript support
- **JSdom**: Browser environment simulation for React components
- **MSW (Mock Service Worker)**: API mocking for HTTP requests
- **React Testing Library**: React component testing utilities

## Coverage Goals

- **Branches**: 80%+
- **Functions**: 80%+
- **Lines**: 80%+
- **Statements**: 80%+

## Test Structure

```
src/__tests__/
├── setup.ts                 # Test environment setup
├── mocks/
│   └── server.ts            # MSW mock server configuration
├── config.test.ts           # Configuration and builder tests
├── server.test.ts           # Server-side utilities tests
├── endpoint.test.ts         # Next.js endpoint handler tests
├── hooks.test.tsx           # React hooks tests
├── types.test.ts            # TypeScript type tests
└── index.test.ts            # Package exports integration tests
```

## Running Tests

### Development

```bash
# Run tests in watch mode
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests once
pnpm test:run

# Run tests with coverage
pnpm test:coverage
```

### CI/CD

Tests run automatically on:
- Pull requests
- Pushes to main branch
- Release tags

## Test Categories

### 1. Configuration Tests (`config.test.ts`)

Tests for the configuration system and permission builders:

- ✅ `initializeVulturSSO()` validation
- ✅ Global configuration management
- ✅ `VulturPermissionConfigBuilder` functionality
- ✅ Permission patterns (CRUD, tribal)
- ✅ Error handling for invalid configurations

**Key Test Cases:**
- Required field validation
- Default value setting
- Permission scope creation
- Default permission assignment
- Builder pattern validation

### 2. Server-Side Tests (`server.test.ts`)

Tests for server-side JWT validation and API utilities:

- ✅ `VulturIdentServerClient` class
- ✅ JWT token validation
- ✅ User role fetching
- ✅ Permission checking
- ✅ Higher-order function wrappers (`withAuth`, `withPermission`)
- ✅ Middleware creation

**Key Test Cases:**
- Valid/invalid token handling
- Authentication errors (401, 403, 404)
- Network error handling
- Permission resolution
- Request format compatibility (App Router, Pages Router)

### 3. Endpoint Tests (`endpoint.test.ts`)

Tests for Next.js route handlers:

- ✅ App Router handlers (`createVulturPermissionsHandler`)
- ✅ Pages Router handlers (`createVulturPermissionsApiHandler`)
- ✅ Static configuration handlers
- ✅ HTTP headers and caching
- ✅ Error responses

**Key Test Cases:**
- Successful configuration serving
- Proper HTTP headers (CORS, caching)
- Error handling and 500 responses
- Method validation (GET only)
- Static vs dynamic configuration

### 4. React Hook Tests (`hooks.test.tsx`)

Tests for client-side React hooks:

- ✅ `useVulturPermissions()` hook
- ✅ `usePermissionCheck()` utilities
- ✅ `useVulturAuth()` authentication status
- ✅ React Query integration
- ✅ Error boundary behavior

**Key Test Cases:**
- Successful data fetching
- Authentication state management
- Permission checking functions
- Loading states and error handling
- Query caching behavior
- Hook options and configuration

### 5. Type Tests (`types.test.ts`)

Tests for TypeScript type definitions:

- ✅ All exported type interfaces
- ✅ Type compatibility and inference
- ✅ Required vs optional fields
- ✅ Union type validation

**Key Test Cases:**
- Complete type structure validation
- Optional field handling
- Type compatibility between interfaces
- Compile-time type checking

### 6. Integration Tests (`index.test.ts`)

Tests for package exports and integration:

- ✅ All public API exports
- ✅ End-to-end configuration flow
- ✅ Cross-module integration
- ✅ Permission pattern integration

## Mock Data

### Mock Server (MSW)

The test suite uses MSW to mock the vultur-ident-api:

```typescript
// Mock users
mockUserInfo: Regular user with Fleet Member role
mockAdminUser: Admin user with all permissions
mockUserRoles: Array of user roles

// Mock endpoints
GET /me - Current user info
GET /users/:address/roles - User roles
GET /users/:address - User info (admin only)
GET /users/:address/permissions/:app/:scope - Permission check
```

### Test Tokens

- `valid-token`: Returns `mockUserInfo`
- `admin-token`: Returns `mockAdminUser` 
- `invalid-token`: Returns 401 Unauthorized
- `expired-token`: Returns 401 Unauthorized

## Testing Patterns

### 1. Configuration Testing

```typescript
it('should initialize configuration with required fields', () => {
  const config = { /* valid config */ }
  expect(() => initializeVulturSSO(config)).not.toThrow()
})
```

### 2. Server-Side Testing

```typescript
it('should validate valid token', async () => {
  const client = new VulturIdentServerClient({ identApiUrl: TEST_API_URL })
  const user = await client.validateToken('valid-token')
  expect(user).toEqual(mockUserInfo)
})
```

### 3. React Hook Testing

```typescript
it('should fetch user permissions successfully', async () => {
  mockLocalStorage.getItem.mockReturnValue('valid-token')
  
  const { result } = renderHook(() => useVulturPermissions(), {
    wrapper: createWrapper(),
  })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data?.user).toEqual(mockUserInfo)
})
```

### 4. Endpoint Testing

```typescript
it('should return permission configuration', async () => {
  const handler = createVulturPermissionsHandler()
  const request = new MockNextRequest(/* ... */)
  
  const response = await handler(request)
  
  expect(response.init?.status).toBe(200)
  const config = JSON.parse(response.body)
  expect(config).toEqual(mockPermissionConfig)
})
```

## Error Testing

All modules include comprehensive error testing:

- **Authentication Errors**: 401, 403 responses
- **Network Errors**: Connection failures, timeouts
- **Configuration Errors**: Invalid setup, missing fields
- **Type Errors**: Compile-time validation
- **Runtime Errors**: Unexpected exceptions

## Continuous Integration

### GitHub Actions

Tests run on Node.js 18 and 20 with:

1. **Type checking**: `pnpm run build`
2. **Unit tests**: `pnpm run test:run`
3. **Coverage**: `pnpm run test:coverage`
4. **Coverage upload**: Codecov integration

### Coverage Reporting

- Coverage reports uploaded to Codecov
- Thresholds enforced in CI
- HTML reports generated locally

### Quality Gates

- All tests must pass
- Coverage thresholds must be met
- Type checking must pass
- No linting errors

## Local Development

### Setup

```bash
# Install dependencies
pnpm install

# Run tests in watch mode
pnpm test

# View test UI
pnpm test:ui
```

### Debugging

- Use `console.log` in tests (will be shown in output)
- Use `vi.only()` to run single tests
- Use `--reporter=verbose` for detailed output
- Check coverage reports in `coverage/` directory

### Adding Tests

1. Create test file with `.test.ts` or `.test.tsx` extension
2. Import required utilities from vitest
3. Mock external dependencies (MSW for HTTP, vi.mock for modules)
4. Write descriptive test names and assertions
5. Test both happy path and error cases

## Best Practices

1. **Isolation**: Each test is independent
2. **Mocking**: Mock external dependencies consistently
3. **Assertions**: Use specific, meaningful assertions
4. **Coverage**: Aim for high coverage, but focus on critical paths
5. **Performance**: Keep tests fast and reliable
6. **Documentation**: Clear test descriptions and comments

This comprehensive test suite ensures the reliability and maintainability of the vultur-sso-client package across all its functionality.
