module.exports = {
  redisHost: process.env.REDIS_HOST || '127.0.0.1',
  redisPort: process.env.REDIS_PORT || 6379,
  pgUser: process.env.PGUSER || 'postgres',
  pgHost: process.env.PGHOST || '127.0.0.1',
  pgDatabase: process.env.PGDATABASE || 'postgres',
  pgPassword: process.env.PGPASSWORD || 'postgres_password',
  pgPort: process.env.PGPORT || 5432,
};
