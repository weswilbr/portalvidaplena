import { PrismaClient } from '@prisma/client' // Re-generating client...
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const prismaClientSingleton = () => {
  const url = process.env.DATABASE_URL
  
  if (!url) {
    // Fallback for build time if the variable is not available during collation
    return new PrismaClient({ accelerateUrl: "prisma://null" })
  }

  // If it's a prisma+postgres URL, we should use it as accelerateUrl for Prisma 7
  if (url.startsWith('prisma+postgres://')) {
    return new PrismaClient({ accelerateUrl: url })
  }

  // Use PrismaPg adapter for standard Postgres connections in Prisma 7
  const pool = new pg.Pool({ connectionString: url })
  const adapter = new PrismaPg(pool as any)
  return new PrismaClient({ adapter })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

// Limpando o cache global para forçar recarregamento dos novos modelos (User, etc)
if (typeof globalThis !== 'undefined') {
  (globalThis as any).prisma = undefined;
}

const prisma = prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') (globalThis as any).prisma = prisma
