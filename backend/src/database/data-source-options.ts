import * as path from 'path';
import { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

/** Single source of truth for the app, the seed script and the TypeORM CLI. */
export function buildDataSourceOptions(env: NodeJS.ProcessEnv = process.env): DataSourceOptions {
  return {
    type: 'mysql',
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 3306),
    username: env.DB_USER,
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME,
    charset: 'utf8mb4',
    timezone: 'Z',
    entities: [path.join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: env.DB_SYNC === 'true',
    migrationsRun: env.DB_MIGRATIONS_RUN === 'true',
    logging: env.DB_LOGGING === 'true',
  };
}
