# OpenID Connect Identity Provider Example

This is a secure OpenID Connect Identity Provider implementation using Node.js, Express, and the `oidc-provider` library. It's configured to work with Shopify's Customer Account API.

## Security Features

- Secure key management with support for both file-based and environment variable-based keys
- PKCE (Proof Key for Code Exchange) support for enhanced security
- Secure cookie handling
- JWT-based tokens
- Configurable token lifetimes
- Comprehensive logging for debugging and audit trails

## Prerequisites

- Node.js 16.x or higher
- npm 7.x or higher
- For production: A domain with SSL support
- For development: ngrok (for HTTPS tunneling)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Generate secure keys:
```bash
node generate-keys.js
```

3. Create your environment file:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```
PORT=3000
NGROK_HOST=your-ngrok-subdomain.ngrok.io
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
COOKIE_SECRET=your_secure_cookie_secret
```

## Key Management

The application supports two methods for managing JWT signing keys:

### 1. File-based Keys (Development)
- Keys are automatically generated in the `.keys` directory
- Private and public keys are stored as `.pem` files
- The `.keys` directory is git-ignored for security

### 2. Environment Variables (Production)
- Set `PRIVATE_KEY` and `PUBLIC_KEY` in your environment
- Keys should be in PEM format with newlines replaced by \n
- Recommended for cloud deployments

## Running the Application

### Development
```bash
node app.js
```

## Endpoints

- `/.well-known/openid-configuration` - OpenID Connect configuration
- `/auth` - Authorization endpoint
- `/token` - Token endpoint
- `/userinfo` - UserInfo endpoint

## Logging

The application includes comprehensive logging for:
- Authorization attempts
- Token generation
- User interactions
- Server errors

## Disclaimer

This software is provided "as is", without warranty of any kind, express or implied. This is an example implementation and should not be used in production without thorough security review and testing. The authors and contributors are not responsible for any damages or liabilities that may arise from using this software. Before deploying in a production environment:

- Conduct thorough security audits
- Perform penetration testing
- Review and update all security configurations
- Ensure compliance with your organization's security requirements
- Consider consulting with security professionals

Use of this software implies acceptance of all risks associated with its implementation.
