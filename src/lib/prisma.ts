import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  const url = process.env.DATABASE_URL
  // If it's a prisma+postgres URL, we should use it as accelerateUrl for Prisma 7
  if (url?.startsWith('prisma+postgres://')) {
    return new PrismaClient({ accelerateUrl: url })
  }
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
