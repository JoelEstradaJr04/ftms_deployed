// lib/idGenerator.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TABLE_PREFIXES = {
  ASG: 'AssignmentCache',
  LOG: 'AuditLog', 
  EXP: 'ExpenseRecord',
  ITM: 'Item',
  ITX: 'ItemTransaction',
  RCP: 'Receipt',
  RCI: 'ReceiptItem',
  REV: 'RevenueRecord',
  RAL: 'ReceiptAuditLog',
  REX: 'ReceiptExport',
  RSC: 'ReceiptStorageConfig',
  CAT: 'GlobalCategory',
  SRC: 'GlobalSource',
  PAY: 'GlobalPaymentStatus',
  TERM: 'GlobalTerms',
  UNIT: 'GlobalItemUnit',
  PMT: 'GlobalPaymentMethod',
  RST: 'GlobalReimbursementStatus'
} as const

type TablePrefix = keyof typeof TABLE_PREFIXES

export async function generateId(prefix: TablePrefix) {
  const tableName = TABLE_PREFIXES[prefix]
  if (!tableName) throw new Error(`Invalid table prefix: ${prefix}`)
  
  return await prisma.$transaction(async (tx) => {
    // Generate sequence for table: ${tableName}
    const sequence = await tx.sequence.upsert({
      where: { name: prefix },
      update: { value: { increment: 1 } },
      create: { name: prefix, value: 1 },
    })
    
    return `FTMS-${prefix}-${String(sequence.value).padStart(8, '0')}`
  })
}

export async function generateExportId() {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  
  return await prisma.$transaction(async (tx) => {
    const dailyKey = `XPT-${dateStr}`
    const sequence = await tx.sequence.upsert({
      where: { name: dailyKey },
      update: { value: { increment: 1 } },
      create: { name: dailyKey, value: 1 },
    })
    
    return `FTMS-XPT-${dateStr}-${String(sequence.value).padStart(4, '0')}`
  })
}