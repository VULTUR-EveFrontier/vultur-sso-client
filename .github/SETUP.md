# Repository Setup Guide

This guide explains how to set up the repository for automated publishing to NPM.

## Prerequisites

1. **NPM Account**: You need an NPM account with publish permissions
2. **GitHub Repository**: Repository should be public or you need a paid GitHub plan
3. **Access Rights**: You need admin access to the GitHub repository

## Setup Steps

### 1. Create NPM Access Token

1. Go to [npmjs.com](https://www.npmjs.com) and log in
2. Click on your profile picture → "Access Tokens"
3. Click "Generate New Token" → "Classic Token"
4. Select "Automation" (for CI/CD) and copy the token

### 2. Add NPM Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `NPM_TOKEN`
5. Value: Paste your NPM access token
6. Click "Add secret"

### 3. Verify Repository Settings

Make sure your repository has the correct settings in `package.json`:

```json
{
  "name": "@vultur-evefrontier/vultur-sso-client",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_ORG/vultur-sso-client.git"
  }
}
```

Update the repository URL to match your actual GitHub repository.

### 4. NPM Organization Setup (Optional)

If publishing to an NPM organization (recommended for scoped packages):

1. Create or join the `@vultur-evefrontier` organization on NPM
2. Make sure your NPM token has access to publish to the organization
3. The package name in `package.json` should match: `@vultur-evefrontier/vultur-sso-client`

## Publishing Workflows

### Automatic Publishing

The repository includes two publishing workflows:

#### 1. Continuous Publishing (`publish.yml`)

**Triggers:**
- Push to `main`/`master` branch (dev builds)
- Push tags starting with `v` (release builds)
- Pull requests (testing only)

**What it does:**
- Runs tests and builds
- For tags: Publishes to NPM with `latest` tag
- For main branch: Publishes dev version with `dev` tag
- Creates GitHub releases for tagged versions

#### 2. Manual Release (`release.yml`)

**Triggers:**
- Manual workflow dispatch from GitHub Actions tab

**What it does:**
- Allows you to choose version bump type (patch/minor/major/prerelease)
- Updates package.json version
- Creates git tag
- Triggers the publish workflow

### Manual Publishing

You can also publish manually:

```bash
# Build the package
pnpm run build

# Publish to NPM
pnpm publish --access public

# Or for pre-release
pnpm publish --access public --tag beta
```

## Version Management

### Automatic Versioning

For development builds, versions are automatically generated:
- Format: `1.0.0-dev.20240101120000.abc1234`
- Includes timestamp and commit hash
- Published with `dev` tag

### Manual Versioning

Use the manual release workflow:

1. Go to Actions tab in GitHub
2. Select "Release" workflow
3. Click "Run workflow"
4. Choose version bump type:
   - **patch**: 1.0.0 → 1.0.1 (bug fixes)
   - **minor**: 1.0.0 → 1.1.0 (new features)
   - **major**: 1.0.0 → 2.0.0 (breaking changes)
   - **prerelease**: 1.0.0 → 1.0.1-alpha.0 (pre-releases)

### Git Tags

Create release tags manually:

```bash
# Create and push a new version tag
git tag v1.0.0
git push origin v1.0.0
```

This will trigger the publish workflow automatically.

## Package Installation

After publishing, users can install the package:

```bash
# Latest stable version
pnpm add @vultur-evefrontier/vultur-sso-client

# Development version
pnpm add @vultur-evefrontier/vultur-sso-client@dev

# Specific version
pnpm add @vultur-evefrontier/vultur-sso-client@1.0.0
```

## Troubleshooting

### Publishing Fails

1. **Check NPM token**: Make sure `NPM_TOKEN` secret is correctly set
2. **Check permissions**: NPM token needs publish access to the package/organization
3. **Check package name**: Make sure the package name is available on NPM
4. **Check version**: Can't publish the same version twice

### Build Fails

1. **Check TypeScript**: Run `pnpm run build` locally
2. **Check dependencies**: Make sure all peer dependencies are correctly specified
3. **Check Node version**: Workflow uses Node 18 and 20

### Authentication Issues

```bash
# Check if you're logged in to NPM
npm whoami

# Login to NPM
npm login

# Check package access
npm access list packages @vultur-evefrontier
```

## Monitoring

### NPM Package

Monitor your package at:
- https://www.npmjs.com/package/@vultur-evefrontier/vultur-sso-client

### GitHub Actions

Monitor builds and deployments:
- Go to Actions tab in your repository
- Check workflow runs for any failures

### Download Stats

Track package usage:
- NPM provides download statistics
- Use tools like [npm-stat](https://npm-stat.com/) for detailed analytics

## Security

### Token Security

- Never commit NPM tokens to your repository
- Use GitHub secrets for all sensitive information
- Rotate tokens periodically
- Use automation tokens for CI/CD (not personal tokens)

### Package Security

- Regularly run `pnpm audit` to check for vulnerabilities
- The workflow includes automatic security scanning
- Monitor for security alerts in GitHub

## Advanced Configuration

### Custom NPM Registry

To publish to a private registry, update the workflow:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
    registry-url: 'https://your-private-registry.com'
```

### Different Branch Strategy

To publish from different branches, update the workflow triggers:

```yaml
on:
  push:
    branches:
      - main
      - develop
      - release/*
```

### Custom Version Format

Modify the version generation logic in `publish.yml` to use custom formats.

This setup provides a robust, automated publishing pipeline for your NPM package!
