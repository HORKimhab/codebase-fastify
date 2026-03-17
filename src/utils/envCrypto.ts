import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'dotenv';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const VALUE_ENCRYPTED_PREFIX = 'envval::v1:';
const FILE_ENCRYPTED_PREFIX = 'envfile::v1:';
const SECRET_KEY_PATTERN = /(^|_)(SECRET|TOKEN|PASSWORD|PASS|PRIVATE_KEY|ACCESS_KEY|API_KEY|CLIENT_SECRET|APP_KEY|KEY)(_|$)/i;

type LoadRuntimeEnvOptions = {
  cwd?: string;
  override?: boolean;
};

type EnvValueEncryptionSummary = {
  content: string;
  detectedKeys: string[];
  encryptedKeys: string[];
  skippedKeys: string[];
};

type EnvValueEncryptionOptions = {
  mode?: 'auto' | 'all' | 'only';
  onlyKeys?: Iterable<string>;
};

type EnvValueDecryptionSummary = {
  content: string;
  detectedKeys: string[];
  decryptedKeys: string[];
  skippedKeys: string[];
};

function deriveKey(encryptionKey: string, envName: string): Buffer {
  const normalizedKey = encryptionKey.trim();

  if (!normalizedKey) {
    throw new Error(`${envName} is required`);
  }

  return createHash('sha256').update(normalizedKey).digest();
}

function encryptPayload(value: string, encryptionKey: string, prefix: string, envName: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, deriveKey(encryptionKey, envName), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${prefix}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptPayload(value: string, encryptionKey: string, prefix: string, envName: string, target: string): string {
  if (!value.startsWith(prefix)) {
    throw new Error(`${target} is missing the expected prefix`);
  }

  const payload = value.slice(prefix.length);
  const [iv, authTag, encrypted] = payload.split(':');

  if (!iv || !authTag || !encrypted) {
    throw new Error(`${target} is malformed`);
  }

  const decipher = createDecipheriv(ALGORITHM, deriveKey(encryptionKey, envName), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

/**
 * Returns true when an env value was encrypted with the value-level prefix.
 */
export function isEncryptedEnvValue(value: string): boolean {
  return value.startsWith(VALUE_ENCRYPTED_PREFIX);
}

/**
 * Returns true when a full env file payload was encrypted with the file-level prefix.
 */
export function isEncryptedEnvFile(value: string): boolean {
  return value.startsWith(FILE_ENCRYPTED_PREFIX);
}

/**
 * Encrypts a single env value using ENV_VALUE_ENCRYPTION_KEY-compatible format.
 */
export function encryptEnvValue(value: string, encryptionKey: string): string {
  return encryptPayload(value, encryptionKey, VALUE_ENCRYPTED_PREFIX, 'ENV_VALUE_ENCRYPTION_KEY');
}

/**
 * Decrypts a single env value that was encrypted by encryptEnvValue.
 */
export function decryptEnvValue(value: string, encryptionKey: string): string {
  return decryptPayload(
    value,
    encryptionKey,
    VALUE_ENCRYPTED_PREFIX,
    'ENV_VALUE_ENCRYPTION_KEY',
    'Encrypted env value'
  );
}

/**
 * Encrypts the full .env file content for writing to .env.enc.
 */
export function encryptEnvFileContent(content: string, encryptionKey: string): string {
  return encryptPayload(content, encryptionKey, FILE_ENCRYPTED_PREFIX, 'ENV_ENCRYPTION_KEY');
}

/**
 * Decrypts the full .env.enc payload back to plaintext .env content.
 */
export function decryptEnvFileContent(value: string, encryptionKey: string): string {
  return decryptPayload(value, encryptionKey, FILE_ENCRYPTED_PREFIX, 'ENV_ENCRYPTION_KEY', 'Encrypted env file');
}

/**
 * Returns true when an env key name looks like a secret that should be encrypted.
 */
export function isSecretEnvKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

/**
 * Discovers secret-like env keys from raw .env content.
 */
export function detectEncryptableEnvKeys(content: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();

    if (!key || seen.has(key) || !isSecretEnvKey(key)) {
      continue;
    }

    seen.add(key);
    keys.push(key);
  }

  return keys;
}

/**
 * Discovers every env key from raw .env content, excluding comments and invalid lines.
 */
export function detectAllEnvKeys(content: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    keys.push(key);
  }

  return keys;
}

/**
 * Discovers encrypted env keys from raw .env content.
 */
export function detectEncryptedEnvKeys(content: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!key || seen.has(key) || !isEncryptedEnvValue(value)) {
      continue;
    }

    seen.add(key);
    keys.push(key);
  }

  return keys;
}

/**
 * Rewrites env values inside .env content according to the selected mode.
 * Comments and unrelated lines are preserved, and the result includes a summary of detected, encrypted, and skipped keys.
 */
export function encryptEnvValuesInContent(
  content: string,
  encryptionKey: string,
  options: EnvValueEncryptionOptions = {}
): EnvValueEncryptionSummary {
  const mode = options.mode ?? 'auto';
  const detectedKeys =
    mode === 'all'
      ? detectAllEnvKeys(content)
      : mode === 'only'
        ? Array.from(new Set(Array.from(options.onlyKeys ?? [], (key) => key.trim()).filter(Boolean)))
        : detectEncryptableEnvKeys(content);
  const targetKeys = new Set(detectedKeys);
  const encryptedKeys: string[] = [];
  const skippedKeys: string[] = [];

  const lines = content.split(/\r?\n/);
  const nextContent = lines
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        return line;
      }

      const separatorIndex = line.indexOf('=');

      if (separatorIndex < 0) {
        return line;
      }

      const key = line.slice(0, separatorIndex).trim();

      if (!targetKeys.has(key)) {
        return line;
      }

      const originalValue = line.slice(separatorIndex + 1).trim();

      if (!originalValue || isEncryptedEnvValue(originalValue)) {
        if (!skippedKeys.includes(key)) {
          skippedKeys.push(key);
        }

        return line;
      }

      const normalizedValue = parse(`${key}=${originalValue}`)[key];

      if (normalizedValue === undefined) {
        if (!skippedKeys.includes(key)) {
          skippedKeys.push(key);
        }

        return line;
      }

      encryptedKeys.push(key);
      return `${key}=${encryptEnvValue(normalizedValue, encryptionKey)}`;
    })
    .join('\n');

  return {
    content: nextContent,
    detectedKeys,
    encryptedKeys,
    skippedKeys
  };
}

/**
 * Rewrites encrypted env values inside .env content according to the selected mode.
 * Comments and unrelated lines are preserved, and the result includes a summary of detected, decrypted, and skipped keys.
 */
export function decryptEnvValuesInContent(
  content: string,
  encryptionKey: string,
  options: EnvValueEncryptionOptions = {}
): EnvValueDecryptionSummary {
  const mode = options.mode ?? 'auto';
  const detectedKeys =
    mode === 'all'
      ? detectEncryptedEnvKeys(content)
      : mode === 'only'
        ? Array.from(new Set(Array.from(options.onlyKeys ?? [], (key) => key.trim()).filter(Boolean)))
        : detectEncryptedEnvKeys(content);
  const targetKeys = new Set(detectedKeys);
  const decryptedKeys: string[] = [];
  const skippedKeys: string[] = [];

  const lines = content.split(/\r?\n/);
  const nextContent = lines
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        return line;
      }

      const separatorIndex = line.indexOf('=');

      if (separatorIndex < 0) {
        return line;
      }

      const key = line.slice(0, separatorIndex).trim();

      if (!targetKeys.has(key)) {
        return line;
      }

      const originalValue = line.slice(separatorIndex + 1).trim();

      if (!originalValue || !isEncryptedEnvValue(originalValue)) {
        if (!skippedKeys.includes(key)) {
          skippedKeys.push(key);
        }

        return line;
      }

      decryptedKeys.push(key);
      return `${key}=${decryptEnvValue(originalValue, encryptionKey)}`;
    })
    .join('\n');

  return {
    content: nextContent,
    detectedKeys,
    decryptedKeys,
    skippedKeys
  };
}

/**
 * Decrypts any value-level encrypted entries from a parsed env object.
 */
export function decryptParsedEnvValues(
  values: Record<string, string>,
  encryptionKey: string | undefined
): Record<string, string> {
  const nextValues: Record<string, string> = {};

  for (const [key, value] of Object.entries(values)) {
    if (isEncryptedEnvValue(value)) {
      nextValues[key] = decryptEnvValue(value, encryptionKey ?? '');
      continue;
    }

    nextValues[key] = value;
  }

  return nextValues;
}

function applyEnv(values: Record<string, string>, override: boolean): void {
  for (const [key, value] of Object.entries(values)) {
    if (!override && process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = value;
  }
}

/**
 * Loads runtime configuration from `.env.enc` when present, otherwise `.env`.
 * After file decryption, any value-level encrypted entries are decrypted before
 * being assigned into process.env.
 */
export function loadRuntimeEnv(options: LoadRuntimeEnvOptions = {}): void {
  const cwd = options.cwd ?? process.cwd();
  const override = options.override ?? false;
  const encryptedPath = join(cwd, '.env.enc');
  const plainPath = join(cwd, '.env');

  let sourceContent: string | undefined;

  if (existsSync(encryptedPath)) {
    const encryptedContent = readFileSync(encryptedPath, 'utf8').trim();
    sourceContent = decryptEnvFileContent(encryptedContent, process.env.ENV_ENCRYPTION_KEY ?? '');
  } else if (existsSync(plainPath)) {
    sourceContent = readFileSync(plainPath, 'utf8');
  }

  if (!sourceContent) {
    return;
  }

  const parsedValues = parse(sourceContent);
  const decryptedValues = decryptParsedEnvValues(parsedValues, process.env.ENV_VALUE_ENCRYPTION_KEY);

  applyEnv(decryptedValues, override);
}

export { FILE_ENCRYPTED_PREFIX, VALUE_ENCRYPTED_PREFIX };
