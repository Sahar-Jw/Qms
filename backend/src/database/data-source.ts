import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source-options';

/** Used by the TypeORM CLI (migrations): npm run migration:generate -- src/database/migrations/Init */
export default new DataSource({ ...buildDataSourceOptions(), synchronize: false });
