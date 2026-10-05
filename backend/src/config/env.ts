/** Fail fast on missing / weak configuration. Used by ConfigModule.forRoot({ validate }). */
export function validateEnv(config: Record<string, unknown>) {
  const errors: string[] = [];
  const need = (k: string) => {
    if (config[k] === undefined || config[k] === '') errors.push(`${k} is required`);
  };
  ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'].forEach(need);
  const secret = String(config.JWT_SECRET ?? '');
  if (secret && secret.length < 32) errors.push('JWT_SECRET must be at least 32 characters');
  if (errors.length) throw new Error(`Invalid environment configuration:\n - ${errors.join('\n - ')}`);
  return config;
}
