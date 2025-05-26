// ftms/lib/auditLogger.ts
import { prisma } from './prisma'
import { generateId } from './idGenerator'

type AuditLogData = {
  action: string;
  table_affected: 'ExpenseRecord' | 'RevenueRecord' | 'Receipt';
  record_id: string;
  performed_by: string;
  details: string;
};

export async function logAudit({
  action,
  table_affected,
  record_id,
  performed_by,
  details,
}: AuditLogData) {
  try {
    await prisma.auditLog.create({
      data: {
        log_id: await generateId('LOG'),
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
