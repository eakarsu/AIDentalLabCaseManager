import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

async function main() {
  if (!['1', 'true'].includes(String(process.env.ALLOW_SCHEMA_MIGRATION || '').toLowerCase())) {
    throw new Error('Refusing admin bootstrap without ALLOW_SCHEMA_MIGRATION=1');
  }
  const email = (process.env.PROVISION_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.PROVISION_ADMIN_PASSWORD || '';
  const name = (process.env.PROVISION_ADMIN_NAME || 'Runtime Administrator').trim();
  const tenantId = (process.env.TENANT_ID || process.env.GOVERNANCE_TENANT_ID || 'runtime-tenant').trim();
  if (!email || password.length < 12) throw new Error('Admin email and a 12+ character password are required');
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (email, password, name, role, tenant_id)
     VALUES ($1, $2, $3, 'admin', $4)
     ON CONFLICT (email) DO UPDATE SET
       password = EXCLUDED.password,
       name = EXCLUDED.name,
       role = 'admin',
       tenant_id = EXCLUDED.tenant_id`,
    [email, passwordHash, name, tenantId]
  );
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error.message);
    await pool.end().catch(() => {});
    process.exit(1);
  });
