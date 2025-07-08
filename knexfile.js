import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: join(__dirname, 'database.sqlite')
    },
    useNullAsDefault: true,
    migrations: {
      directory: join(__dirname, 'src', 'database', 'migrations')
    }
  },
  production: {
    client: 'mysql2',
    connection: process.env.DATABASE_URL || 'mysql://hitstv:password@localhost:3306/hitstv_bot?charset=utf8mb4&timezone=UTC',
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 900000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    },
    migrations: {
      directory: join(__dirname, 'src', 'database', 'migrations'),
      tableName: 'knex_migrations'
    }
  }
};

export default config;
