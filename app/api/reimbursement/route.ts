import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/auditLogger';

// GET: List all reimbursements (for finance dashboard)
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl || req.url;
    const searchParams = (typeof url === 'string' ? new URL(url, 'http://localhost') : url).searchParams;
    const status = searchParams.get('status');
    const where: any = { is_deleted: false };
    if (status) where.status = status;
    const reimbursements = await prisma.reimbursement.findMany({
      where,
      include: {
        status: true,
        expense: {
          select: {
            category: true,
            expense_date: true,
            total_amount: true,
            payment_method: true,
          }
        }
      },
      orderBy: { requested_date: 'asc' }
    });
    const mapped = reimbursements.map(r => ({
      ...r,
      status_name: r.status?.name || null,
    }));
    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching reimbursements:', error);
    return NextResponse.json({ error: 'Failed to fetch reimbursements' }, { status: 500 });
  }
}

// PATCH: Approve, pay, reject, or cancel a reimbursement
export async function PATCH(req: NextRequest) {
  try {
    const { reimbursement_id, action, performed_by, payment_reference, payment_method, rejection_reason } = await req.json();
    const reimbursement = await prisma.reimbursement.findUnique({ where: { reimbursement_id } });
    if (!reimbursement) {
      return NextResponse.json({ error: 'Reimbursement not found' }, { status: 404 });
    }
    const currentStatus = reimbursement.status_id
      ? (await prisma.globalReimbursementStatus.findUnique({ where: { id: reimbursement.status_id } }))?.name
      : null;
    const updateData: Record<string, any> = { updated_at: new Date(), updated_by: performed_by };
    let auditAction = '';
    let auditDetails = '';

    async function getStatusId(name: string) {
      const status = await prisma.globalReimbursementStatus.findFirst({ where: { name } });
      if (!status) throw new Error(`Status ${name} not found`);
      return status.id;
    }

    if (action === 'APPROVE') {
      if (currentStatus !== 'PENDING') {
        return NextResponse.json({ error: 'Can only approve from PENDING status' }, { status: 400 });
      }
      updateData.status_id = await getStatusId('APPROVED');
      updateData.approved_by = performed_by;
      updateData.approved_date = new Date();
      auditAction = 'APPROVE';
      auditDetails = 'Reimbursement approved.';
    } else if (action === 'PAY') {
      if (currentStatus !== 'APPROVED') {
        return NextResponse.json({ error: 'Can only pay from APPROVED status' }, { status: 400 });
      }
      updateData.status_id = await getStatusId('PAID');
      updateData.paid_by = performed_by;
      updateData.paid_date = new Date();
      updateData.payment_reference = payment_reference;
      updateData.payment_method = payment_method;
      auditAction = 'PAY';
      auditDetails = `Reimbursement paid. Reference: ${payment_reference}`;
    } else if (action === 'REJECT') {
      if (currentStatus !== 'PENDING') {
        return NextResponse.json({ error: 'Can only reject from PENDING status' }, { status: 400 });
      }
      if (!rejection_reason) {
        return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 });
      }
      updateData.status_id = await getStatusId('REJECTED');
      updateData.rejection_reason = rejection_reason;
      updateData.approved_by = performed_by;
      updateData.approved_date = new Date();
      auditAction = 'REJECT';
      auditDetails = `Reimbursement rejected. Reason: ${rejection_reason}`;
    } else if (action === 'CANCEL') {
      if (currentStatus !== 'PENDING') {
        return NextResponse.json({ error: 'Can only cancel from PENDING status' }, { status: 400 });
      }
      updateData.status_id = await getStatusId('CANCELLED');
      updateData.cancelled_by = performed_by;
      updateData.cancelled_date = new Date();
      auditAction = 'CANCEL';
      auditDetails = 'Reimbursement cancelled.';
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updated = await prisma.reimbursement.update({
      where: { reimbursement_id },
      data: updateData,
      include: { status: true }
    });

    await logAudit({
      action: auditAction,
      table_affected: 'ExpenseRecord',
      record_id: reimbursement_id,
      performed_by,
      details: auditDetails
    });

    return NextResponse.json({
      ...updated,
      status_name: updated.status?.name || null,
    });
  } catch (error) {
    console.error('Error updating reimbursement:', error);
    return NextResponse.json({ error: 'Failed to update reimbursement' }, { status: 500 });
  }
} 