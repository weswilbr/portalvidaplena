const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const videoMessages = await prisma.message.findMany({
    where: {
      mediaType: 'video'
    },
    take: 5,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      lead: true
    }
  });

  console.log(JSON.stringify(videoMessages, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
