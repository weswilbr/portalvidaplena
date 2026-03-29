require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient();
console.log("Available keys:", Object.keys(client).filter(k => !k.startsWith('_')).join(', '));
if (client.user) {
  console.log("User table IS available in the compiled Prisma Client.");
} else {
  console.log("User table is NOT available.");
}
