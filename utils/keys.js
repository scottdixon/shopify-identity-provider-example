import fs from 'fs';
import path from 'path';
import { createPublicKey, createPrivateKey } from 'crypto';
import jose from 'node-jose';

export async function loadKeys() {
  try {
    // Try to load keys from environment variables first
    if (process.env.PRIVATE_KEY && process.env.PUBLIC_KEY) {
      const privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');
      const publicKey = process.env.PUBLIC_KEY.replace(/\\n/g, '\n');
      return await createJWKS(privateKey, publicKey);
    }

    // Fall back to file system if env vars not available
    const keysDir = path.join(process.cwd(), '.keys');
    const privateKeyPath = path.join(keysDir, 'private.pem');
    const publicKeyPath = path.join(keysDir, 'public.pem');

    if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
      throw new Error('Keys not found. Please run generate-keys.js first');
    }

    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

    return await createJWKS(privateKey, publicKey);
  } catch (error) {
    console.error('Error loading keys:', error);
    throw error;
  }
}

async function createJWKS(privateKey, publicKey) {
  // Create a keystore
  const keystore = jose.JWK.createKeyStore();

  // Import the private key
  const key = await keystore.add(createPrivateKey(privateKey), 'pem');

  // Create the JWKS structure
  return {
    keys: [{
      ...key.toJSON(true), // Include private key
      alg: 'RS256',
      kid: '1',
      use: 'sig'
    }]
  };
}
