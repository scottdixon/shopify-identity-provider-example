import express from 'express';
import Provider from 'oidc-provider';
import dotenv from 'dotenv';
import { loadKeys } from './utils/keys.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configuration for the OIDC provider
const configuration = {
  clients: [{
    client_id: process.env.CLIENT_ID || 'default_client_id',
    client_secret: process.env.CLIENT_SECRET || 'default_client_secret',
    grant_types: ['authorization_code'],
    redirect_uris: ['https://shopify.com/authentication/4892131384/login/external/callback'],
    post_logout_redirect_uris: [
      'https://test-shop-987.myshopify.com/customer_authentication/logout/callback',
      'https://shopify.com/4892131384/account/logout_callback'
    ],
    token_endpoint_auth_method: 'client_secret_basic',
    response_types: ['code'],
    scope: 'openid email customer-account-api:full',
    application_type: 'web',
    id_token_signed_response_alg: 'RS256',
    require_auth_time: false,
    default_max_age: 86400
  }],
  scopes: ['openid', 'email', 'customer-account-api:full'],
  claims: {
    openid: ['sub'],
    email: ['email', 'email_verified'],
    profile: ['name', 'preferred_username']
  },
  features: {
    devInteractions: { enabled: true },
    clientCredentials: { enabled: false },
    introspection: { enabled: false },
    revocation: { enabled: false },
    registration: { enabled: false },
    userinfo: { enabled: true }
  },
  conformIdTokenClaims: false,
  rotateRefreshToken: false,
  pkce: {
    methods: ['S256'],
    required: (ctx, client) => {
      // Only require PKCE for public clients (those without a client secret)
      return !client.clientSecret;
    }
  },
  cookies: {
    keys: [process.env.COOKIE_SECRET || 'default_cookie_secret'],
    long: { signed: true, secure: true },
    short: { signed: true, secure: true }
  },
  ttl: {
    AccessToken: 1 * 60 * 60,
    IdToken: 1 * 60 * 60,
    AuthorizationCode: 10 * 60,
  },
  formats: {
    AccessToken: 'jwt',
    IdToken: 'jwt',
  },
  jwks: await loadKeys(),
  findAccount: async (ctx, id) => {
    console.log('findAccount!!!!!!!!!')
    console.log('Context:', JSON.stringify({
      params: ctx.oidc?.params,
      prompt: ctx.oidc?.prompt,
      result: ctx.oidc?.result,
      session: ctx.oidc?.session
    }, null, 2));
    console.log('Account ID:', id);

    // Get login details from the interaction result
    const result = ctx.oidc?.result;
    if (result?.login) {
      console.log('\n=== Login Credentials ===');
      const email = result.login.email || result.login.accountId;
      const password = result.login.password;

      console.log('Email/Account:', email);
      console.log('Password:', password);
      console.log('Full Login Context:', {
        login: result.login,
        params: ctx.oidc?.params,
        account: ctx.oidc?.account,
        session: ctx.oidc?.session
      });
    }

    // If the account ID doesn't exist or isn't valid, return undefined
    if (!id || id === 'undefined' || id === 'null') {
      return undefined;
    }

    // Return the account if found
    return {
      accountId: id,
      async claims(use, scope) {
        const email = ctx.oidc?.result?.login?.email || id;
        const sub = `user:${Buffer.from(email).toString('base64')}`;

        const claims = {
          sub: sub,
          email: email,
          email_verified: true,
          name: 'Test User',
          preferred_username: 'testuser',
          updated_at: Math.floor(Date.now() / 1000),
        };

        if (scope.includes('email')) {
          claims.email = email;
          claims.email_verified = true;
        }

        return claims;
      },
    };
  },
  // Add more specific error handling
  async renderError(ctx, out, error) {
    console.error('OIDC Error:', error);
    console.error('Error details:', out);
    throw error;
  }
};

let server;

(async () => {
  // Support for proxy forwarding (needed for ngrok)
  app.set('trust proxy', true);

  // Debug logging middleware
  app.use((req, res, next) => {
    console.log('\n=== Incoming Request ===');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Query:', req.query);
    console.log('Headers:', req.headers);
    if (req.body) {
      console.log('Body:', req.body);
    }

    // Capture the original end to add response logging
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
      console.log('\n=== Outgoing Response ===');
      console.log('Status:', res.statusCode);
      console.log('Headers:', res.getHeaders());
      if (chunk) {
        console.log('Body:', chunk.toString());
      }
      originalEnd.call(this, chunk, encoding);
    };

    next();
  });

  // Middleware to determine the actual host
  app.use((req, res, next) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    req.issuer = `${protocol}://${host}`;
    next();
  });

  const provider = new Provider(`https://${process.env.NGROK_HOST || 'localhost:3000'}`, configuration);

  // Enable proxy support for the provider
  provider.proxy = true;

  // Add authorization logging
  provider.on('authorization.success', (ctx) => {
    console.log('\n=== Authorization Success ===');
    console.log('Client:', ctx.oidc.client.clientId);
    console.log('Scopes:', ctx.oidc.params.scope);
    console.log('Code:', ctx.oidc.params.code);
    console.log('Redirect URI:', ctx.oidc.params.redirect_uri);
    console.log('State:', ctx.oidc.params.state);
    console.log('Full Context:', {
      client: {
        id: ctx.oidc.client.clientId,
        redirectUris: ctx.oidc.client.redirectUris,
        grantTypes: ctx.oidc.client.grantTypes
      },
      params: ctx.oidc.params,
      account: ctx.oidc.account,
      session: ctx.oidc.session
    });
  });

  provider.on('authorization.error', (ctx, err) => {
    console.log('\n=== Authorization Error ===');
    console.error('Error:', err);
    console.log('Client:', ctx.oidc.client?.clientId);
    console.log('Error Details:', {
      name: err.name,
      message: err.message,
      error: err.error,
      error_description: err.error_description,
      status: err.status
    });
    console.log('Request Params:', ctx.oidc.params);
  });

  // Add interaction event logging
  provider.on('interaction.started', (ctx) => {
    console.log('\n=== Interaction Started ===');
    console.log('Client:', ctx.oidc.client?.clientId);
    console.log('Interaction Details:', ctx.oidc.interaction);
    console.log('Prompt:', ctx.oidc.prompt);
    console.log('Params:', ctx.oidc.params);
    console.log('Session:', ctx.oidc.session);
  });

  provider.on('interaction.ended', (ctx) => {
    console.log('\n=== Interaction Ended ===');
    console.log('Client:', ctx.oidc.client?.clientId);
    console.log('Result:', ctx.oidc.result);
    console.log('Account:', ctx.oidc.account);
    console.log('Session:', ctx.oidc.session);
    // Log the raw request to see what's being submitted
    console.log('Request Body:', ctx.request.body);
  });

  // Add grant event logging
  provider.on('grant.success', (ctx) => {
    console.log('\n=== Grant Success ===');
    console.log('Client:', ctx.oidc.client.clientId);
    console.log('Grant Type:', ctx.oidc.params.grant_type);
    console.log('Scopes:', ctx.oidc.params.scope);
    console.log('Account:', ctx.oidc.account);
    console.log('Full Grant Details:', {
      params: ctx.oidc.params,
      grant: ctx.oidc.grant
    });
  });

  // Add body parsers first
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Add CORS support
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://shopify.com');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Add token endpoint logging before mounting the provider
  app.use('/token', (req, res, next) => {
    console.log('\n=== Token Endpoint Request ===');
    console.log('Method:', req.method);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', req.body);
    console.log('Query:', req.query);
    console.log('URL:', req.originalUrl);
    next();
  });

  // Add provider event logging
  provider.on('grant.error', (ctx, err) => {
    console.log('\n=== Grant Error ===');
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    console.log('Client:', ctx.oidc.client?.clientId);
    console.log('Grant Type:', ctx.oidc.grant?.grantType);
    console.log('Body:', ctx.request.body);
  });

  provider.on('server_error', (ctx, err) => {
    console.log('\n=== Server Error ===');
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    console.log('URL:', ctx.url);
    console.log('Method:', ctx.method);
    console.log('Body:', ctx.request.body);
  });

  // Add before mounting the provider
  app.post('/interaction/:uid', express.urlencoded({ extended: true }), async (req, res, next) => {
    console.log('\n=== Raw Interaction Form Data ===');
    console.log('Form Data:', req.body);
    console.log('Form Fields:', Object.keys(req.body));

    // Check if this is a login submission
    if (req.body.login && req.body.password) {
      console.log('\n=== Login Attempt ===');
      console.log('Login:', req.body.login);
      console.log('Password:', req.body.password);
    }

    next();
  });

  // Mount the OIDC provider
  app.use('/', provider.callback());

  // Add error handling middleware
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
      error: err.error || 'server_error',
      error_description: err.error_description || err.message
    });
  });

  server = app.listen(port, () => {
    console.log(`OIDC Provider listening on port ${port}`);
    console.log(`Local Well-known URL: http://localhost:${port}/.well-known/openid-configuration`);
    console.log('To make this accessible remotely, run: ngrok http 3000');
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
