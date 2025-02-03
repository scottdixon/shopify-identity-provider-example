import { generateKeyPair } from 'crypto';
import fs from 'fs';

// Generate RSA key pair
generateKeyPair('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
}, (err, publicKey, privateKey) => {
  if (err) {
    console.error('Error generating keys:', err);
    return;
  }

  // Save keys to files
  fs.writeFileSync('.keys/private.pem', privateKey);
  fs.writeFileSync('.keys/public.pem', publicKey);

  console.log('Keys generated successfully!');
  console.log('Please add these files to your .gitignore');
});
