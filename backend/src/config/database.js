import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

export const db = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};

export default pool;
