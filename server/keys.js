module.exports = {
  redisHost: process.env.REDIS_HOST,
  redisPort: process.env.REDIS_PORT,
  pgUser: process.env.PGUSER || 'postgres',
  pgHost: process.env.PGHOST || '127.0.0.1',
  pgDatabase: process.env.PGDATABASE || 'postgres',
  pgPassword: process.env.PGPASSWORD || 'postgres_password',
  pgPort: process.env.PGPORT || 5432,
};
