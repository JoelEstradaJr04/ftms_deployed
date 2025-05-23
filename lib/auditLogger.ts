// ftms/lib/auditLogger.ts
import { prisma } from './prisma'

interface AuditLogInput {
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  table_affected: 'ExpenseRecord' | 'RevenueRecord'
  record_id: string
  performed_by: string
  details: string
}

export async function logAudit({
  action,
  table_affected,
  record_id,
  performed_by,
  details,
}: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        table_affected,
        record_id,
        performed_by,
        details,
      },
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
    // Don't throw — logging shouldn't crash the main flow
  }
}
