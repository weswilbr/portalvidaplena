require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is missing! Ensure .env is present.");
    return;
  }

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Seeding users into:", url.split('@')[1]);

  try {
    const admin = await prisma.user.upsert({
      where: { email: 'admin@vidaplena.app' },
      update: { password: 'admin123' },
      create: {
        email: 'admin@vidaplena.app',
        name: 'Administrador Ouro Elite',
        password: 'admin123',
        role: 'ADMIN',
      },
    });

    const seller = await prisma.user.upsert({
      where: { email: 'vendedor1@vidaplena.app' },
      update: { password: 'vendas123' },
      create: {
        email: 'vendedor1@vidaplena.app',
        name: 'Vendedor Suporte',
        password: 'vendas123',
        role: 'SELLER',
      },
    });

    console.log("Success Seed Finished.");
  } catch (err) {
    console.error("Error during seed:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
