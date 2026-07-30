const WEAK_JWT_SECRETS = new Set([
  'assethub-jwt-secret-change-in-production',
  'CHANGE-THIS-TO-A-VERY-LONG-RANDOM-STRING-IN-PRODUCTION',
  'GENERATE_A_VERY_LONG_RANDOM_STRING_HERE_MIN_32_CHARS',
]);

const WEAK_DB_PASSWORD_PATTERNS = ['assethub123', 'CHANGE_THIS_PASSWORD'];

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDevAuthBypassEnabled(): boolean {
  return !isProduction() && process.env.ALLOW_DEV_AUTH_BYPASS === 'true';
}

export function isDevAuthBypass(username: string, password: string): boolean {
  if (!isDevAuthBypassEnabled()) return false;
  return password === 'password' || username.toLowerCase().includes('test');
}

function isWeakJwtSecret(secret: string | undefined): boolean {
  if (!secret) return true;
  if (secret.length < 32) return true;
  return WEAK_JWT_SECRETS.has(secret);
}

function hasWeakDbCredentials(): boolean {
  const dbUrl = process.env.DATABASE_URL || '';
  return WEAK_DB_PASSWORD_PATTERNS.some((pattern) => dbUrl.includes(pattern));
}

export function validateProductionEnv(): void {
  if (!isProduction()) return;

  if (isWeakJwtSecret(process.env.JWT_SECRET)) {
    throw new Error(
      'JWT_SECRET must be set to a strong random string (minimum 32 characters) in production'
    );
  }

  if (hasWeakDbCredentials()) {
    throw new Error(
      'DATABASE_URL must use a strong password in production (default passwords are not allowed)'
    );
  }

  if (process.env.ALLOW_DEV_AUTH_BYPASS === 'true') {
    throw new Error('ALLOW_DEV_AUTH_BYPASS must not be enabled in production');
  }
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (isProduction()) {
    if (isWeakJwtSecret(secret)) {
      throw new Error(
        'JWT_SECRET must be set to a strong random string (minimum 32 characters) in production'
      );
    }
    return secret!;
  }

  return secret || 'assethub-jwt-secret-change-in-production';
}
