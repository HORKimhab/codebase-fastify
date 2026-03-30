import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  detectAllEnvKeys,
  detectEncryptedEnvKeys,
  detectEncryptableEnvKeys,
  FILE_ENCRYPTED_PREFIX,
  VALUE_ENCRYPTED_PREFIX,
  decryptEnvFileContent,
  decryptEnvValue,
  decryptEnvValuesInContent,
  encryptEnvFileContent,
  encryptEnvValue,
  encryptEnvValuesInContent,
  loadRuntimeEnv
} from '../src/utils/envCrypto';
import { buildTelegramChannelHint } from '../src/utils/telegramHint';

const ORIGINAL_ENV = { ...process.env };
const tempDirs: string[] = [];

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };

  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();

    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'env-crypto-test-'));
  tempDirs.push(dir);
  return dir;
}

test('encryptEnvValue creates a value-level encrypted payload that decrypts correctly', () => {
  const encrypted = encryptEnvValue('super-secret', 'value-key');

  assert.match(encrypted, new RegExp(`^${VALUE_ENCRYPTED_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.equal(decryptEnvValue(encrypted, 'value-key'), 'super-secret');
});

test('encryptEnvFileContent creates a file-level encrypted payload that decrypts correctly', () => {
  const envContent = 'MAIL_PASS=abc123\nAPP_PORT=3000\n';
  const encrypted = encryptEnvFileContent(envContent, 'file-key');

  assert.match(encrypted, new RegExp(`^${FILE_ENCRYPTED_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.equal(decryptEnvFileContent(encrypted, 'file-key'), envContent);
});

test('detectEncryptableEnvKeys finds secret-like keys from .env content', () => {
  const content = [
    'MAIL_USER=test@example.com',
    'MAIL_PASS=plain-password',
    'AWS_SECRET_ACCESS_KEY=abc',
    'APP_PORT=3000',
    'JWT_TOKEN=jwt'
  ].join('\n');

  assert.deepEqual(detectEncryptableEnvKeys(content), ['MAIL_PASS', 'AWS_SECRET_ACCESS_KEY', 'JWT_TOKEN']);
});

test('detectAllEnvKeys finds every valid env key from .env content', () => {
  const content = ['MAIL_USER=test@example.com', 'MAIL_PASS=plain-password', 'APP_PORT=3000'].join('\n');

  assert.deepEqual(detectAllEnvKeys(content), ['MAIL_USER', 'MAIL_PASS', 'APP_PORT']);
});

test('detectEncryptedEnvKeys finds encrypted env keys from .env content', () => {
  const content = [
    'MAIL_USER=test@example.com',
    `MAIL_PASS=${encryptEnvValue('plain-password', 'value-key')}`,
    'APP_PORT=3000'
  ].join('\n');

  assert.deepEqual(detectEncryptedEnvKeys(content), ['MAIL_PASS']);
});

test('encryptEnvValuesInContent auto mode encrypts detected secret-like keys and reports skipped keys', () => {
  const content = [
    'MAIL_USER=test@example.com',
    'MAIL_PASS=plain-password',
    'EMPTY_SECRET=',
    `JWT_TOKEN=${encryptEnvValue('already', 'value-key')}`,
    'APP_PORT=3000'
  ].join('\n');
  const result = encryptEnvValuesInContent(content, 'value-key');

  assert.match(result.content, /MAIL_PASS=envval::v1:/);
  assert.match(result.content, /MAIL_USER=test@example.com/);
  assert.match(result.content, /APP_PORT=3000/);
  assert.deepEqual(result.detectedKeys, ['MAIL_PASS', 'EMPTY_SECRET', 'JWT_TOKEN']);
  assert.deepEqual(result.encryptedKeys, ['MAIL_PASS']);
  assert.deepEqual(result.skippedKeys, ['EMPTY_SECRET', 'JWT_TOKEN']);
});

test('encryptEnvValuesInContent all mode encrypts every valid env value', () => {
  const content = ['MAIL_USER=test@example.com', 'MAIL_PASS=plain-password', 'APP_PORT=3000'].join('\n');
  const result = encryptEnvValuesInContent(content, 'value-key', { mode: 'all' });

  assert.match(result.content, /MAIL_USER=envval::v1:/);
  assert.match(result.content, /MAIL_PASS=envval::v1:/);
  assert.match(result.content, /APP_PORT=envval::v1:/);
  assert.deepEqual(result.detectedKeys, ['MAIL_USER', 'MAIL_PASS', 'APP_PORT']);
  assert.deepEqual(result.encryptedKeys, ['MAIL_USER', 'MAIL_PASS', 'APP_PORT']);
  assert.deepEqual(result.skippedKeys, []);
});

test('encryptEnvValuesInContent only mode encrypts only the provided keys', () => {
  const content = ['MAIL_USER=test@example.com', 'MAIL_PASS=plain-password', 'APP_PORT=3000'].join('\n');
  const result = encryptEnvValuesInContent(content, 'value-key', {
    mode: 'only',
    onlyKeys: ['APP_PORT', 'MAIL_PASS']
  });

  assert.match(result.content, /MAIL_PASS=envval::v1:/);
  assert.match(result.content, /APP_PORT=envval::v1:/);
  assert.match(result.content, /MAIL_USER=test@example.com/);
  assert.deepEqual(result.detectedKeys, ['APP_PORT', 'MAIL_PASS']);
  assert.deepEqual(result.encryptedKeys, ['MAIL_PASS', 'APP_PORT']);
  assert.deepEqual(result.skippedKeys, []);
});

test('decryptEnvValuesInContent auto mode decrypts encrypted env values', () => {
  const content = [
    'MAIL_USER=test@example.com',
    `MAIL_PASS=${encryptEnvValue('plain-password', 'value-key')}`,
    'APP_PORT=3000'
  ].join('\n');
  const result = decryptEnvValuesInContent(content, 'value-key');

  assert.match(result.content, /MAIL_PASS=plain-password/);
  assert.deepEqual(result.detectedKeys, ['MAIL_PASS']);
  assert.deepEqual(result.decryptedKeys, ['MAIL_PASS']);
  assert.deepEqual(result.skippedKeys, []);
});

test('decryptEnvValuesInContent only mode decrypts only the provided keys', () => {
  const content = [
    `MAIL_USER=${encryptEnvValue('test@example.com', 'value-key')}`,
    `MAIL_PASS=${encryptEnvValue('plain-password', 'value-key')}`,
    'APP_PORT=3000'
  ].join('\n');
  const result = decryptEnvValuesInContent(content, 'value-key', {
    mode: 'only',
    onlyKeys: ['MAIL_PASS']
  });

  assert.match(result.content, /MAIL_PASS=plain-password/);
  assert.match(result.content, /MAIL_USER=envval::v1:/);
  assert.deepEqual(result.detectedKeys, ['MAIL_PASS']);
  assert.deepEqual(result.decryptedKeys, ['MAIL_PASS']);
  assert.deepEqual(result.skippedKeys, []);
});

test('loadRuntimeEnv decrypts .env.enc and then decrypts encrypted values inside it', () => {
  const dir = createTempDir();
  process.env.ENV_ENCRYPTION_KEY = 'file-key';
  process.env.ENV_VALUE_ENCRYPTION_KEY = 'value-key';

  const envContent = [
    'MAIL_USER=test@example.com',
    `MAIL_PASS=${encryptEnvValue('smtp-app-password', process.env.ENV_VALUE_ENCRYPTION_KEY)}`,
    'APP_PORT=3100'
  ].join('\n');

  writeFileSync(join(dir, '.env.enc'), encryptEnvFileContent(envContent, process.env.ENV_ENCRYPTION_KEY), 'utf8');

  loadRuntimeEnv({ cwd: dir, override: true });

  assert.equal(process.env.MAIL_USER, 'test@example.com');
  assert.equal(process.env.MAIL_PASS, 'smtp-app-password');
  assert.equal(process.env.APP_PORT, '3100');
});

test('loadRuntimeEnv falls back to .env and still decrypts value-level encrypted entries', () => {
  const dir = createTempDir();
  process.env.ENV_VALUE_ENCRYPTION_KEY = 'value-key';

  const content = [
    'MAIL_USER=test@example.com',
    `MAIL_PASS=${encryptEnvValue('smtp-app-password', process.env.ENV_VALUE_ENCRYPTION_KEY)}`,
    'APP_PORT=3001'
  ].join('\n');

  writeFileSync(join(dir, '.env'), content, 'utf8');

  loadRuntimeEnv({ cwd: dir, override: true });

  assert.equal(process.env.MAIL_PASS, 'smtp-app-password');
  assert.equal(process.env.APP_PORT, '3001');
});

test('loadRuntimeEnv respects existing process env values unless override is true', () => {
  const dir = createTempDir();
  process.env.APP_PORT = '9999';
  writeFileSync(join(dir, '.env'), 'APP_PORT=3001\n', 'utf8');

  loadRuntimeEnv({ cwd: dir });
  assert.equal(process.env.APP_PORT, '9999');

  loadRuntimeEnv({ cwd: dir, override: true });
  assert.equal(process.env.APP_PORT, '3001');
});

test('loadRuntimeEnv throws when file decryption key is missing for .env.enc', () => {
  const dir = createTempDir();
  writeFileSync(join(dir, '.env.enc'), encryptEnvFileContent('MAIL_PASS=test\n', 'file-key'), 'utf8');

  assert.throws(() => loadRuntimeEnv({ cwd: dir, override: true }), /ENV_ENCRYPTION_KEY is required/);
});

test('loadRuntimeEnv throws when value decryption key is missing for encrypted env values', () => {
  const dir = createTempDir();
  writeFileSync(join(dir, '.env'), `MAIL_PASS=${encryptEnvValue('smtp-app-password', 'value-key')}\n`, 'utf8');

  assert.throws(() => loadRuntimeEnv({ cwd: dir, override: true }), /ENV_VALUE_ENCRYPTION_KEY is required/);
});

test('decryptEnvFileContent rejects malformed encrypted payloads', () => {
  assert.throws(() => decryptEnvFileContent(`${FILE_ENCRYPTED_PREFIX}broken-payload`, 'file-key'), /malformed/);
});

test('buildTelegramChannelHint returns a safe notification hint without exposing keys', () => {
  const hint = buildTelegramChannelHint('-1001234567890', 'env value encryption', 'vault path: secret/prod/value-key');

  assert.match(hint ?? '', /Telegram hint: notify channel -1001234567890/);
  assert.match(hint ?? '', /Safe key reference: vault path: secret\/prod\/value-key/);
  assert.match(hint ?? '', /Never send ENV_ENCRYPTION_KEY, ENV_VALUE_ENCRYPTION_KEY, or secret values to Telegram/);
});
