const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.botConfig.findFirst();
  console.log('--- BOT STATUS ---');
  console.log('Status:', config?.status || 'NOT FOUND');
  console.log('Is Round Robin:', config?.isRoundRobin);
  
  console.log('\n--- RECENT OUTGOING MESSAGES ERRORS ---');
  const failed = await prisma.outgoingMessage.findMany({
    where: { status: 'FAILED' },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  if (failed.length === 0) {
    console.log('No failed outgoing messages found.');
  } else {
    failed.forEach(m => {
      console.log(`To: ${m.to} | Error: ${m.errorMsg} | Media: ${m.mediaType}`);
    });
  }

  console.log('\n--- LAST 5 VIDEOS IN CRM ---');
  const videos = await prisma.message.findMany({
    where: { mediaType: 'video' },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { lead: true }
  });
  if (videos.length === 0) {
    console.log('No video messages found in history.');
  } else {
    videos.forEach(v => {
      console.log(`Lead: ${v.lead.name} | URL: ${v.mediaUrl?.substring(0, 50)}...`);
    });
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
