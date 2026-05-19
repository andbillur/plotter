import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function seed() {
  await client.connect();

  const role = await client.query(`SELECT id FROM roles WHERE name = 'super_admin'`);
  if (role.rows.length === 0) {
    throw new Error('super_admin roli topilmadi — avval migrate qiling');
  }

  const existing = await client.query(`SELECT id FROM users WHERE username = 'admin'`);
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await client.query(
      `INSERT INTO users (full_name, username, password_hash, role_id)
       VALUES ($1, $2, $3, $4)`,
      ['Super Administrator', 'admin', hash, role.rows[0].id]
    );
    console.log('admin yaratildi — login: admin / admin123');
  } else {
    console.log('admin allaqachon mavjud');
  }

  await client.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
