/** Fail fast on missing / weak configuration. Used by ConfigModule.forRoot({ validate }). */
export function validateEnv(config: Record<string, unknown>) {
  const errors: string[] = [];
  const need = (k: string) => {
    if (config[k] === undefined || config[k] === '') errors.push(`${k} is required`);
  };
  ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'].forEach(need);
  const secret = String(config.JWT_SECRET ?? '');
  if (secret && secret.length < 32) errors.push('JWT_SECRET must be at least 32 characters');
  const signing = String(config.AUDIT_SIGNING_KEY ?? '');
  if (signing && signing.length < 32) errors.push('AUDIT_SIGNING_KEY must be at least 32 characters (or leave it unset to turn signing off)');
  const retention = config.AUDIT_RETENTION_DAYS;
  if (retention !== undefined && retention !== '' && !(Number.isInteger(Number(retention)) && Number(retention) >= 30)) {
    errors.push('AUDIT_RETENTION_DAYS must be a whole number of days, 30 or more (or leave it unset to keep the log forever)');
  }
  if (errors.length) throw new Error(`Invalid environment configuration:\n - ${errors.join('\n - ')}`);
  return config;
}
