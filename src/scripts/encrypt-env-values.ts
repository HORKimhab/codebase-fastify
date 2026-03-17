import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encryptEnvValuesInContent } from '../utils/envCrypto';

const cwd = process.cwd();
const envPath = join(cwd, '.env');
const encryptionKey = process.env.ENV_VALUE_ENCRYPTION_KEY?.trim();
const args = process.argv.slice(2);

const allMode = args.includes('--all');
const onlyArg = args.find((arg) => arg.startsWith('--only='));
const onlyKeys = onlyArg
  ? onlyArg
      .slice('--only='.length)
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean)
  : [];

if (!encryptionKey) {
  console.error('ENV_VALUE_ENCRYPTION_KEY must be set in the shell before encrypting env values');
  process.exit(1);
}

if (allMode && onlyArg) {
  console.error('Use either --all or --only=KEY1,KEY2, not both');
  process.exit(1);
}

try {
  const envContent = readFileSync(envPath, 'utf8');
  const result = encryptEnvValuesInContent(envContent, encryptionKey, {
    mode: allMode ? 'all' : onlyArg ? 'only' : 'auto',
    onlyKeys
  });

  if (result.detectedKeys.length === 0) {
    console.log(`No matching env keys found in ${envPath}`);
    process.exit(0);
  }

  writeFileSync(envPath, result.content, 'utf8');

  console.log(`Mode: ${allMode ? 'all' : onlyArg ? 'only' : 'auto'}`);
  console.log(`Detected keys: ${result.detectedKeys.join(', ')}`);
  console.log(`Encrypted keys: ${result.encryptedKeys.length ? result.encryptedKeys.join(', ') : '(none)'}`);
  console.log(`Skipped keys: ${result.skippedKeys.length ? result.skippedKeys.join(', ') : '(none)'}`);
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`Failed to encrypt env values: ${message}`);
  process.exit(1);
}
