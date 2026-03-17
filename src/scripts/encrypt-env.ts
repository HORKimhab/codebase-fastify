import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encryptEnvFileContent } from '../utils/envCrypto';

const cwd = process.cwd();
const envPath = join(cwd, '.env');
const encryptedPath = join(cwd, '.env.enc');
const encryptionKey = process.env.ENV_ENCRYPTION_KEY?.trim();

if (!encryptionKey) {
  console.error('ENV_ENCRYPTION_KEY must be set in the shell before encrypting .env');
  process.exit(1);
}

try {
  const envContent = readFileSync(envPath, 'utf8');
  const encrypted = encryptEnvFileContent(envContent, encryptionKey);
  writeFileSync(encryptedPath, encrypted, 'utf8');
  console.log(`Encrypted ${envPath} -> ${encryptedPath}`);
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`Failed to encrypt .env: ${message}`);
  process.exit(1);
}
