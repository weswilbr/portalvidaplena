/**
 * Script de limpeza de leads duplicados causados pelo problema de LID do Baileys.
 * 
 * Detecta leads com número LID (14+ dígitos), tenta achar o lead real correspondente
 * pelo mesmo nome, migra as mensagens e remove o lead LID duplicado.
 * 
 * Uso: node --env-file=.env cleanup-lid-leads.js
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DRY_RUN = process.argv.includes('--dry-run'); // Simulação sem deletar

async function main() {
  console.log('🔍 Buscando leads com número LID (14+ dígitos)...');
  if (DRY_RUN) console.log('⚠️  MODO DRY-RUN: Nenhuma alteração será feita.\n');

  // Busca todos os leads com mensagens para comparar
  const allLeads = await prisma.lead.findMany({
    include: {
      messages: true,
    },
    orderBy: { createdAt: 'asc' }
  });

  // LID = número com 14 ou mais dígitos
  const lidLeads = allLeads.filter(l =>
    l.phone && l.phone.replace(/\D/g, '').length > 13
  );

  if (lidLeads.length === 0) {
    console.log('✅ Nenhum lead com LID encontrado. Banco já está limpo!');
    await prisma.$disconnect();
    return;
  }

  console.log(`📋 Encontrados ${lidLeads.length} lead(s) com LID:\n`);

  for (const lidLead of lidLeads) {
    console.log(`\n────────────────────────────────────`);
    console.log(`🆔 Lead LID: "${lidLead.name}" | Phone: ${lidLead.phone}`);
    console.log(`   Mensagens: ${lidLead.messages.length} | Criado: ${lidLead.createdAt.toLocaleString('pt-BR')}`);

    // Tenta encontrar lead real com mesmo nome e número normal
    const realLead = allLeads.find(l =>
      l.id !== lidLead.id &&
      l.phone &&
      l.phone.replace(/\D/g, '').length <= 13 &&
      l.name.toLowerCase().trim() === lidLead.name.toLowerCase().trim()
    );

    if (realLead) {
      console.log(`✅ Lead real encontrado: "${realLead.name}" | Phone: ${realLead.phone}`);
      console.log(`   → Migrando ${lidLead.messages.length} mensagem(ns) para o lead real...`);

      if (!DRY_RUN) {
        // Migra todas as mensagens do LID para o lead real
        if (lidLead.messages.length > 0) {
          await prisma.message.updateMany({
            where: { leadId: lidLead.id },
            data: { leadId: realLead.id }
          });
          console.log(`   ✅ ${lidLead.messages.length} mensagem(ns) migrada(s).`);
        }

        // Se lead LID tinha assignedTo, preserva no lead real caso esteja vazio
        if (lidLead.assignedToId && !realLead.assignedToId) {
          await prisma.lead.update({
            where: { id: realLead.id },
            data: { assignedToId: lidLead.assignedToId }
          });
          console.log(`   ✅ Atribuição preservada.`);
        }

        // Deleta o lead LID
        await prisma.lead.delete({ where: { id: lidLead.id } });
        console.log(`   🗑️  Lead LID removido.`);
      } else {
        console.log(`   [DRY-RUN] Migraria ${lidLead.messages.length} msgs e deletaria o lead LID.`);
      }

    } else {
      console.log(`⚠️  Sem lead real correspondente encontrado pelo nome.`);
      console.log(`   → Lead LID mantido. Verifique manualmente se deve ser mantido ou removido.`);
      
      // Lista as mensagens do lead sem par
      if (lidLead.messages.length > 0) {
        console.log(`   Últimas mensagens:`);
        lidLead.messages.slice(-3).forEach(m => {
          console.log(`   - "${m.content.substring(0, 60)}" (${m.createdAt.toLocaleString('pt-BR')})`);
        });
      }
    }
  }

  console.log('\n════════════════════════════════════');
  console.log('✅ Limpeza concluída!');
  if (DRY_RUN) {
    console.log('\n💡 Para aplicar as mudanças, rode sem --dry-run:');
    console.log('   node --env-file=.env cleanup-lid-leads.js');
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Erro:', err);
  await prisma.$disconnect();
  process.exit(1);
});
