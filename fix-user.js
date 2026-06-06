require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  const result = await prisma.user.upsert({
    where: { email: 'weswil@hotmail.com' },
    update: { password: 'Wwadmin123@', role: 'ADMIN' },
    create: { email: 'weswil@hotmail.com', name: 'Weslley William', password: 'Wwadmin123@', role: 'ADMIN' }
  });
  console.log('OK:', result.email, result.role);
  await prisma.$disconnect();
  await pool.end();
}
main().catch(e => console.error(e));