// app/api/expenses/[id]/route.ts

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
//import type { NextRequest } from 'next/server'
import { logAudit } from '@/lib/auditLogger'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  const expense = await prisma.expenseRecord.findUnique({
    where: { expense_id: id },
    include: {
      receipt: {
        include: {
          items: true
        }
      }
    }
  });

  if (!expense || expense.is_deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(expense);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();
    const { total_amount, expense_date, other_source, other_category } = data;

    // Get the original record for comparison
    const originalRecord = await prisma.expenseRecord.findUnique({
      where: { expense_id: id },
      include: {
        receipt: true
      }
    });

    if (!originalRecord) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    // Calculate deviation percentage
    let deviationPercentage = 0;
    if (originalRecord.receipt) {
      deviationPercentage = Math.abs((Number(total_amount) - Number(originalRecord.receipt.total_amount_due)) / Number(originalRecord.receipt.total_amount_due) * 100);
    }

    // Update the record
    const updatedExpense = await prisma.expenseRecord.update({
      where: { expense_id: id },
      data: {
        total_amount,
        expense_date: new Date(expense_date),
        updated_at: new Date(),
        other_source: originalRecord.category === 'Other' ? other_source : null,
        other_category: originalRecord.category === 'Other' ? other_category : null
      },
      include: {
        receipt: {
          include: {
            items: true
          }
        }
      }
    });

    // Prepare audit details
    let auditDetails = `Updated expense record. `;
    if (Number(total_amount) !== Number(originalRecord.total_amount)) {
      auditDetails += `Amount changed from ₱${originalRecord.total_amount} to ₱${total_amount}. `;
      if (deviationPercentage > 0) {
        auditDetails += `Deviation from original amount: ${deviationPercentage.toFixed(2)}%. `;
      }
    }
    if (new Date(expense_date).getTime() !== new Date(originalRecord.expense_date).getTime()) {
      auditDetails += `Date changed from ${originalRecord.expense_date} to ${expense_date}. `;
    }
    if (originalRecord.category === 'Other') {
      if (other_source !== originalRecord.other_source) {
        auditDetails += `Source changed from "${originalRecord.other_source}" to "${other_source}". `;
      }
      if (other_category !== originalRecord.other_category) {
        auditDetails += `Category changed from "${originalRecord.other_category}" to "${other_category}". `;
      }
    }

    await logAudit({
      action: 'UPDATE',
      table_affected: 'ExpenseRecord',
      record_id: id,
      performed_by: 'ftms_user',
      details: auditDetails,
    });

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('Update failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get the record before deletion for audit details
    const expenseToDelete = await prisma.expenseRecord.findUnique({
      where: { expense_id: id }
    });

    if (!expenseToDelete || expenseToDelete.is_deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Reset is_expense_recorded flags
    if (expenseToDelete.assignment_id) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/op_bus_assignments?assignment_id=eq.${expenseToDelete.assignment_id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ is_expense_recorded: false })
        });
      } catch (error) {
        console.error('Failed to update Supabase assignment:', error);
      }
    }

    if (expenseToDelete.receipt_id) {
      await prisma.receipt.update({
        where: { receipt_id: expenseToDelete.receipt_id },
        data: { is_expense_recorded: false }
      });
    }

    await prisma.expenseRecord.update({
      where: { expense_id: id },
      data: { 
        is_deleted: true,
        updated_at: new Date()
      }
    });

    await logAudit({
      action: 'DELETE',
      table_affected: 'ExpenseRecord',
      record_id: id,
      performed_by: 'ftms_user',
      details: `Soft-deleted expense record. Details: ${JSON.stringify({
        category: expenseToDelete.category,
        amount: expenseToDelete.total_amount,
        date: expenseToDelete.expense_date
      })}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete expense:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    );
  }
}
