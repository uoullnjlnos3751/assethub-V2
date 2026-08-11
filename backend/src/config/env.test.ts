import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isDevAuthBypass, isDevAuthBypassEnabled, validateProductionEnv } from './env';

describe('env config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('does not allow dev auth bypass in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_DEV_AUTH_BYPASS = 'true';
    expect(isDevAuthBypassEnabled()).toBe(false);
    expect(isDevAuthBypass('test.user', 'password')).toBe(false);
  });

  it('allows dev auth bypass only when explicitly enabled in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.ALLOW_DEV_AUTH_BYPASS = 'true';
    expect(isDevAuthBypass('test.user', 'password')).toBe(true);
    expect(isDevAuthBypass('normal.user', 'realpassword')).toBe(false);
  });

  it('rejects weak JWT secret in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'assethub-jwt-secret-change-in-production';
    process.env.DATABASE_URL = 'postgresql://assethub:strong-secret-password@localhost:5432/assethub';
    expect(() => validateProductionEnv()).toThrow(/JWT_SECRET/);
  });

  it('rejects default database password in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'abcdefghijklmnopqrstuvwxyz0123456789abcdef';
    process.env.DATABASE_URL = 'postgresql://assethub:assethub123@localhost:5432/assethub';
    expect(() => validateProductionEnv()).toThrow(/DATABASE_URL/);
  });
});
