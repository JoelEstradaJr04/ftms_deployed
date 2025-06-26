// app/api/expenses/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { logAudit } from '@/lib/auditLogger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const expense = await prisma.expenseRecord.findUnique({
    where: { expense_id: id },
    include: {
      category: true,
      payment_method: true,
      source: true,
      receipt: {
        include: {
          payment_status: true,
          terms: true,
          category: true,
          source: true,
          items: {
            where: {
              is_deleted: false
            },
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
      },
      reimbursements: {
        where: {
          is_deleted: false
        },
        include: {
          status: true
        }
      }
    }
  });

  if (!expense || expense.is_deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Transform the data to match frontend expectations
  const transformedExpense = {
    ...expense,
    total_amount: Number(expense.total_amount),
    category_name: expense.category?.name || null,
    payment_method_name: expense.payment_method?.name || null,
    source_name: expense.source?.name || null,
    // Transform receipt data if present
    receipt: expense.receipt ? {
      ...expense.receipt,
      total_amount: Number(expense.receipt.total_amount),
      vat_amount: expense.receipt.vat_amount ? Number(expense.receipt.vat_amount) : null,
      total_amount_due: Number(expense.receipt.total_amount_due),
      items: expense.receipt.items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price)
      }))
    } : null,
    // Transform reimbursements data
    reimbursements: expense.reimbursements.map(reimb => ({
      ...reimb,
      amount: Number(reimb.amount)
    }))
  };

  return NextResponse.json(transformedExpense);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { payment_method, reimbursable_amount, employee_id } = data;

    // Get the original record for comparison
    const originalRecord = await prisma.expenseRecord.findUnique({
      where: { expense_id: id },
      include: {
        receipt: {
          include: {
            items: {
              include: {
                item: true
              }
            }
          }
        },
        reimbursements: true,
      }
    });

    if (!originalRecord) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    // Fetch required global IDs
    const cashMethod = await prisma.globalPaymentMethod.findFirst({ where: { name: 'CASH' } });
    const reimbMethod = await prisma.globalPaymentMethod.findFirst({ where: { name: 'REIMBURSEMENT' } });
    const pendingStatus = await prisma.globalReimbursementStatus.findFirst({ where: { name: 'PENDING' } });

    if (!cashMethod || !reimbMethod || !pendingStatus) {
      return NextResponse.json({ error: 'Required global values not found' }, { status: 500 });
    }

    // Operations-sourced: assignment_id present
    if (originalRecord.assignment_id) {
      if (payment_method === 'REIMBURSEMENT') {
        if (!reimbursable_amount || !employee_id) {
          return NextResponse.json({ error: 'reimbursable_amount and employee_id are required for reimbursement.' }, { status: 400 });
        }
        // Fetch employee_name
        const employee = await prisma.employeeCache.findUnique({ where: { employee_id } });
        if (!employee) {
          return NextResponse.json({ error: 'Invalid employee_id' }, { status: 400 });
        }
        // Remove any existing reimbursements for this expense (enforce only one per expense for operations)
        await prisma.reimbursement.deleteMany({ where: { expense_id: id } });
        // Create reimbursement record
        await prisma.reimbursement.create({
          data: {
            expense_id: id,
            employee_id,
            employee_name: employee.name,
            job_title: employee.job_title,
            amount: reimbursable_amount,
            status_id: pendingStatus.id,
            created_by: originalRecord.created_by,
            is_deleted: false,
          }
        });
        // Update expense record
        const updatedExpense = await prisma.expenseRecord.update({
          where: { expense_id: id },
          data: {
            payment_method_id: reimbMethod.id,
            updated_at: new Date(),
          },
          include: {
            payment_method: true,
            reimbursements: true,
            receipt: {
              include: {
                items: {
                  include: {
                    item: true
                  }
                }
              }
            }
          }
        });
        await logAudit({
          action: 'UPDATE',
          table_affected: 'ExpenseRecord',
          record_id: id,
          performed_by: 'ftms_user',
          details: `Set as REIMBURSEMENT for employee ${employee.name} (₱${reimbursable_amount})`,
        });
        // Attach payment_method_name for frontend
        return NextResponse.json({
          ...updatedExpense,
          payment_method_name: updatedExpense.payment_method?.name || null,
        });
      } else if (payment_method === 'CASH') {
        // Remove reimbursement record(s)
        await prisma.reimbursement.deleteMany({ where: { expense_id: id } });
        // Update expense record
        const updatedExpense = await prisma.expenseRecord.update({
          where: { expense_id: id },
          data: {
            payment_method_id: cashMethod.id,
            updated_at: new Date(),
          },
          include: {
            payment_method: true,
            reimbursements: true,
            receipt: {
              include: {
                items: {
                  include: {
                    item: true
                  }
                }
              }
            }
          }
        });
        await logAudit({
          action: 'UPDATE',
          table_affected: 'ExpenseRecord',
          record_id: id,
          performed_by: 'ftms_user',
          details: `Set as CASH, removed reimbursement`,
        });
        // Attach payment_method_name for frontend
        return NextResponse.json({
          ...updatedExpense,
          payment_method_name: updatedExpense.payment_method?.name || null,
        });
      }
    }
    // Receipt-sourced: receipt_id present (and not assignment_id)
    else if (originalRecord.receipt_id) {
      if (payment_method === 'REIMBURSEMENT') {
        if (!reimbursable_amount || !employee_id) {
          return NextResponse.json({ error: 'reimbursable_amount and employee_id are required for reimbursement.' }, { status: 400 });
        }
        // Fetch employee_name
        const employee = await prisma.employeeCache.findUnique({ where: { employee_id } });
        if (!employee) {
          return NextResponse.json({ error: 'Invalid employee_id' }, { status: 400 });
        }
        // Upsert reimbursement record
        await prisma.reimbursement.upsert({
          where: {
            expense_id_employee_id: {
              expense_id: id,
              employee_id: employee_id,
            },
          },
          update: {
            amount: reimbursable_amount,
            employee_name: employee.name,
            status_id: pendingStatus.id,
            is_deleted: false,
          },
          create: {
            expense_id: id,
            employee_id: employee.employee_id,
            employee_name: employee.name,
            amount: reimbursable_amount,
            status_id: pendingStatus.id,
            created_by: originalRecord.created_by,
            is_deleted: false,
          }
        });
        // Update expense record
        const updatedExpense = await prisma.expenseRecord.update({
          where: { expense_id: id },
          data: {
            payment_method_id: reimbMethod.id,
            updated_at: new Date(),
          },
          include: {
            receipt: {
              include: {
                items: {
                  include: {
                    item: true
                  }
                }
              }
            },
            reimbursements: true,
          }
        });
        await logAudit({
          action: 'UPDATE',
          table_affected: 'ExpenseRecord',
          record_id: id,
          performed_by: 'ftms_user',
          details: `Set as REIMBURSEMENT for employee ${employee.name} (₱${reimbursable_amount}) [RECEIPT]`,
        });
        return NextResponse.json(updatedExpense);
      } else if (payment_method === 'CASH') {
        // Remove reimbursement record(s)
        await prisma.reimbursement.deleteMany({ where: { expense_id: id } });
        // Update expense record
        const updatedExpense = await prisma.expenseRecord.update({
          where: { expense_id: id },
          data: {
            payment_method_id: cashMethod.id,
            updated_at: new Date(),
          },
          include: {
            receipt: {
              include: {
                items: {
                  include: {
                    item: true
                  }
                }
              }
            },
            reimbursements: true,
          }
        });
        await logAudit({
          action: 'UPDATE',
          table_affected: 'ExpenseRecord',
          record_id: id,
          performed_by: 'ftms_user',
          details: `Set as CASH, removed reimbursement [RECEIPT]`,
        });
        return NextResponse.json(updatedExpense);
      }
    }
    // ...existing logic for other sources...
    return NextResponse.json(originalRecord);
  } catch (error) {
    console.error('Update failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get the record before deletion for audit details
    const expenseToDelete = await prisma.expenseRecord.findUnique({
      where: { expense_id: id },
      include: { category: true } // Include category for logging
    });

    if (!expenseToDelete || expenseToDelete.is_deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Reset is_expense_recorded flags
    if (expenseToDelete.assignment_id) {
      try {
        // Update Supabase
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/op_bus_assignments?assignment_id=eq.${expenseToDelete.assignment_id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ is_expense_recorded: false })
        });

        // Update AssignmentCache
        await prisma.assignmentCache.update({
          where: { assignment_id: expenseToDelete.assignment_id },
          data: { 
            is_expense_recorded: false,
            last_updated: new Date()
          }
        });
      } catch (error) {
        console.error('Failed to update assignment status:', error);
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
        category: expenseToDelete.category.name, // Use included category name
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