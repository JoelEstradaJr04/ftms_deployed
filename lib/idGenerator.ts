// lib/idGenerator.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function generateId(prefix: string) {
  return await prisma.$transaction(async (tx) => {
    const sequence = await tx.sequence.upsert({
      where: { name: prefix },
      update: { value: { increment: 1 } },
      create: { name: prefix, value: 1 },
    })
    
    const randomPart = Math.random().toString(36).slice(2, 8) // 6-char random
    return `${prefix.toUpperCase()}-${randomPart}-${String(sequence.value).padStart(6, '0')}`
  })
}