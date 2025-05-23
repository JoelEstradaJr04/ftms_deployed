// app/api/expenses/[id]/route.ts

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/auditLogger'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { id } = params; // Removed await

  const expense = await prisma.expenseRecord.findUnique({
    where: { expense_id: id },
  });

  if (!expense || expense.isDeleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(expense);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const data = await req.json();

  // Validate required fields if needed
  if (!data.category) {
    return NextResponse.json(
      { error: 'Category is required' },
      { status: 400 }
    );
  }

  try {
    const previousExpense = await prisma.expenseRecord.findUnique({
      where: { expense_id: id }
    });

    if (!previousExpense || previousExpense.isDeleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updatedExpense = await prisma.expenseRecord.update({
      where: { expense_id: id },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });

    try {
      await logAudit({
        action: 'UPDATE',
        table_affected: 'ExpenseRecord',
        record_id: id,
        performed_by: data.recorded_by ?? 'unknown',
        details: `Updated fields: ${JSON.stringify({
          category: [previousExpense.category, updatedExpense.category],
          amount: [previousExpense.total_amount, updatedExpense.total_amount]
        })}`,
      });
    } catch (auditError) {
      console.error('Audit logging failed:', auditError);
    }

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('Update failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE endpoint improved version
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  
  // Get the record before deletion for audit details
  const expenseToDelete = await prisma.expenseRecord.findUnique({
    where: { expense_id: id }
  });

  if (!expenseToDelete || expenseToDelete.isDeleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.expenseRecord.update({
    where: { expense_id: id },
    data: { isDeleted: true, updated_at: new Date() },
  });

  await logAudit({
    action: 'DELETE',
    table_affected: 'ExpenseRecord',
    record_id: id,
    performed_by: req.headers.get('user-id') ?? 'system', // Example of getting user from headers
    details: `Soft-deleted expense record. Details: ${JSON.stringify({
      category: expenseToDelete.category,
      amount: expenseToDelete.total_amount,
      date: expenseToDelete.date
    })}`,
  });

  return NextResponse.json({ success: true });
}
