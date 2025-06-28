import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/auditLogger';

// GET: List all reimbursements (for finance dashboard)
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl || req.url;
    const searchParams = (typeof url === 'string' ? new URL(url, 'http://localhost') : url).searchParams;
    const status = searchParams.get('status');
    const where: Record<string, unknown> = { is_deleted: false };
    if (status) where.status = status;
    const reimbursements = await prisma.reimbursement.findMany({
      where,
      include: {
        status: true,
        expense: {
          include: {
            category: true,
            payment_method: true,
            source: true,
            receipt: {
              include: {
                items: {
                  include: {
                    item: {
                      include: {
                        unit: true,
                        category: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { requested_date: 'asc' }
    });
  const mapped = reimbursements.map(r => ({
    ...r,
    // Keep the status as an object with name property for frontend compatibility
    status: {
      id: r.status?.id || '',
      name: r.status?.name || 'PENDING'
    },
    status_name: r.status?.name || null,
    // Map date fields to match frontend expectations
    submitted_date: r.requested_date,
    // Convert Decimal to number for frontend
    amount: r.amount ? parseFloat(r.amount.toString()) : null,
    total_amount: r.expense?.total_amount ? parseFloat(r.expense.total_amount.toString()) : 0,
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
    const { reimbursement_id, action, performed_by, payment_reference, payment_method, rejection_reason, remarks } = await req.json();
    
    console.log('PATCH /api/reimbursement called with:', {
      reimbursement_id,
      action,
      performed_by,
      payment_reference,
      payment_method,
      rejection_reason,
      remarks
    });

    if (!reimbursement_id) {
      return NextResponse.json({ error: 'reimbursement_id is required' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    if (!performed_by) {
      return NextResponse.json({ error: 'performed_by is required' }, { status: 400 });
    }

    const reimbursement = await prisma.reimbursement.findUnique({ 
      where: { reimbursement_id },
      include: { status: true }
    });
    
    if (!reimbursement) {
      return NextResponse.json({ error: 'Reimbursement not found' }, { status: 404 });
    }

    console.log('Found reimbursement:', {
      reimbursement_id: reimbursement.reimbursement_id,
      current_status: reimbursement.status?.name,
      status_id: reimbursement.status_id
    });

    const currentStatus = reimbursement.status?.name;
    const updateData: Record<string, unknown> = { updated_at: new Date(), updated_by: performed_by };
    let auditAction = '';
    let auditDetails = '';

    async function getStatusId(name: string) {
      const status = await prisma.globalReimbursementStatus.findFirst({ where: { name } });
      if (!status) {
        console.error(`Status '${name}' not found in database`);
        throw new Error(`Status '${name}' not found`);
      }
      return status.id;
    }

    if (action === 'APPROVE') {
      if (currentStatus !== 'PENDING') {
        console.log(`Cannot approve: current status is '${currentStatus}', expected 'PENDING'`);
        return NextResponse.json({ 
          error: `Can only approve from PENDING status. Current status: ${currentStatus}` 
        }, { status: 400 });
      }
      updateData.status_id = await getStatusId('APPROVED');
      updateData.approved_by = performed_by;
      updateData.approved_date = new Date();
      auditAction = 'APPROVE';
      auditDetails = 'Reimbursement approved.';
    } else if (action === 'PAY') {
      if (currentStatus !== 'APPROVED') {
        console.log(`Cannot pay: current status is '${currentStatus}', expected 'APPROVED'`);
        return NextResponse.json({ 
          error: `Can only pay from APPROVED status. Current status: ${currentStatus}` 
        }, { status: 400 });
      }
      updateData.status_id = await getStatusId('PAID');
      updateData.paid_by = performed_by;
      updateData.paid_date = new Date();
      updateData.payment_reference = payment_reference;
      updateData.payment_method = payment_method;
      // Add remarks to the update data
      if (remarks) {
        updateData.remarks = remarks;
      }
      auditAction = 'PAY';
      auditDetails = `Reimbursement paid. Reference: ${payment_reference}${remarks ? `. Remarks: ${remarks}` : ''}`;
    } else if (action === 'REJECT') {
      if (currentStatus !== 'PENDING') {
        console.log(`Cannot reject: current status is '${currentStatus}', expected 'PENDING'`);
        return NextResponse.json({ 
          error: `Can only reject from PENDING status. Current status: ${currentStatus}` 
        }, { status: 400 });
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
        console.log(`Cannot cancel: current status is '${currentStatus}', expected 'PENDING'`);
        return NextResponse.json({ 
          error: `Can only cancel from PENDING status. Current status: ${currentStatus}` 
        }, { status: 400 });
      }
      updateData.status_id = await getStatusId('CANCELLED');
      updateData.cancelled_by = performed_by;
      updateData.cancelled_date = new Date();
      auditAction = 'CANCEL';
      auditDetails = 'Reimbursement cancelled.';
    } else {
      console.log(`Invalid action: ${action}`);
      return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    console.log('Updating reimbursement with data:', updateData);

    const updated = await prisma.reimbursement.update({
      where: { reimbursement_id },
      data: updateData,
      include: { status: true }
    });

    console.log('Reimbursement updated successfully:', {
      reimbursement_id: updated.reimbursement_id,
      new_status: updated.status?.name
    });

    await logAudit({
      action: auditAction,
      table_affected: 'Reimbursement',
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to update reimbursement',
      details: errorMessage 
    }, { status: 500 });
  }
}