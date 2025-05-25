import { PrismaClient } from '@prisma/client'
import { generateId } from '../lib/idGenerator'
import { logAudit } from '../lib/auditLogger'

const prisma = new PrismaClient()

function addDays(baseDate: Date, days: number): Date {
  const result = new Date(baseDate)
  result.setDate(baseDate.getDate() + days)
  return result
}

async function main() {
  const baseDateWithAssignment = new Date('2025-05-20T00:00:00.000Z')
  const baseDateWithoutAssignment = new Date('2025-06-01T00:00:00.000Z')

  // 15 revenue records with assignment_id
  for (let i = 1; i <= 15; i++) {
    const revenueId = await generateId('REV')
    const assignmentId = `ASGN-0000${i}`
    const category = i % 2 === 0 ? 'Boundary' : 'Percentage'
    const totalAmount = Math.floor(Math.random() * 1000) + 500
    const date = addDays(baseDateWithAssignment, i - 1)
    const createdBy = `USR-00${i}`

    await prisma.revenueRecord.create({
      data: {
        revenue_id: revenueId,
        assignment_id: assignmentId,
        category,
        total_amount: totalAmount,
        date,
        created_by: createdBy,
        created_at: new Date(),
        updated_at: null,
        isDeleted: false,
      },
    })

    await logAudit({
      action: 'CREATE',
      table_affected: 'RevenueRecord',
      record_id: revenueId,
      performed_by: createdBy,
      details: `Seeded revenue record with assignment_id ${assignmentId}`,
    })
  }

  // 15 revenue records without assignment_id
  for (let i = 1; i <= 15; i++) {
    const revenueId = await generateId('REV')
    const category = i % 2 === 0 ? 'Bus_Rental' : 'Other'
    const totalAmount = Math.floor(Math.random() * 1000) + 200
    const date = addDays(baseDateWithoutAssignment, i - 1)
    const createdBy = `USR-01${i}`

    await prisma.revenueRecord.create({
      data: {
        revenue_id: revenueId,
        assignment_id: null,
        category,
        total_amount: totalAmount,
        date,
        created_by: createdBy,
        created_at: new Date(),
        updated_at: null,
        isDeleted: false,
      },
    })

    await logAudit({
      action: 'CREATE',
      table_affected: 'RevenueRecord',
      record_id: revenueId,
      performed_by: createdBy,
      details: 'Seeded revenue record without assignment_id',
    })
  }

  console.log('✅ Seeded revenue records and logged audits.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
