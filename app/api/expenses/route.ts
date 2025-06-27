// app/api/expenses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateId } from '@/lib/idGenerator'
import { logAudit } from '@/lib/auditLogger'
import { getAssignmentById } from '@/lib/operations/assignments'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      category_id, // global
      source_id,   // global
      payment_method_id, // global
      assignment_id,
      receipt_id,
      total_amount,
      expense_date,
      created_by,
      reimbursements, // array for receipt-sourced
      category: legacy_category,
      payment_method: legacy_payment_method,
      source: source_type // field for source type (receipt, operations, etc.)
    } = body;

    // Accept legacy fields for transition
    let final_category_id = category_id;
    let final_payment_method_id = payment_method_id;
    let final_source_id = source_id;

    // If missing, look up by legacy field
    if (!final_category_id && legacy_category) {
      const cat = await prisma.globalCategory.findFirst({ where: { name: legacy_category } });
      if (cat) final_category_id = cat.category_id;
    }
    if (!final_payment_method_id && legacy_payment_method) {
      const pm = await prisma.globalPaymentMethod.findFirst({ where: { name: legacy_payment_method } });
      if (pm) final_payment_method_id = pm.id;
    }

    // Handle source_type field to determine source_id
    if (!final_source_id && source_type) {
      let sourceName = '';
      if (source_type === 'receipt') {
        sourceName = 'Receipt';
      } else if (source_type === 'operations') {
        sourceName = 'Operations';
      } else if (source_type === 'other') {
        sourceName = 'Other';
      }
      
      if (sourceName) {
        const src = await prisma.globalSource.findFirst({ where: { name: sourceName } });
        if (src) final_source_id = src.source_id;
      }
    }

    if (!final_category_id || !final_payment_method_id) {
      return NextResponse.json({ error: 'category_id and payment_method_id are required.' }, { status: 400 });
    }

    // Fetch assignment data if assignment_id is provided
    let assignmentData = null;
    if (assignment_id) {
      assignmentData = await getAssignmentById(assignment_id);
      if (!assignmentData) {
        return NextResponse.json(
          { error: 'Assignment not found in Operations API' },
          { status: 404 }
        );
      }
    }

    // Validate required global IDs
    const [category, paymentMethod, source] = await Promise.all([
      prisma.globalCategory.findUnique({ where: { category_id: final_category_id } }),
      prisma.globalPaymentMethod.findUnique({ where: { id: final_payment_method_id } }),
      final_source_id ? prisma.globalSource.findUnique({ where: { source_id: final_source_id } }) : Promise.resolve(null)
    ]);
    if (!category || !paymentMethod) {
      return NextResponse.json({ error: 'Invalid global ID(s) provided.' }, { status: 400 });
    }

    // --- ANTI-DUPLICATE LOGIC (assignment-based) ---
    if (assignment_id) {
      // Check for duplicate expense record for the same assignment and expense_date
      const duplicate = await prisma.expenseRecord.findFirst({
        where: {
          assignment_id,
          expense_date: new Date(expense_date),
          category_id: final_category_id,
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'Expense record for this assignment and date already exists.' },
          { status: 409 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create expense
      const expense = await tx.expenseRecord.create({
        data: {
          expense_id: await generateId('EXP'),
          category_id: final_category_id,
          source_id: final_source_id,
          payment_method_id: final_payment_method_id,
          assignment_id,
          bus_trip_id: assignmentData?.bus_trip_id ?? null,
          receipt_id,
          total_amount,
          expense_date: new Date(expense_date),
          created_by,
          created_at: new Date(),
          updated_at: null,
          is_deleted: false,
        },
        include: {
          receipt: {
            include: {
              items: { include: { item: true } }
            }
          }
        }
      });

      // Auto-create reimbursement if needed
      if (paymentMethod.name === 'REIMBURSEMENT') {
        const pendingStatus = await tx.globalReimbursementStatus.findFirst({ where: { name: 'PENDING' } });
        if (!pendingStatus) throw new Error('PENDING reimbursement status not found');
        // Receipt-sourced: assignment_id not present
        if ((!source || source.name !== 'operations') && total_amount) {
          if (Array.isArray(reimbursements) && reimbursements.length > 0) {
            for (const entry of reimbursements) {
              if (!entry.employee_id || !entry.amount) {
                throw new Error('Missing employee_id or amount in reimbursement entry');
              }
              // Find employee name and job title
              const employee = await tx.employeeCache.findUnique({ where: { employee_id: entry.employee_id } });
              if (!employee) {
                throw new Error('Invalid employee_id for reimbursement');
              }
              await tx.reimbursement.create({
                data: {
                  expense_id: expense.expense_id,
                  employee_id: employee.employee_id,
                  employee_name: employee.name,
                  job_title: employee.job_title,
                  amount: entry.amount,
                  status_id: pendingStatus.id,
                  created_by,
                  is_deleted: false,
                }
              });
            }
          } else if (body.employee_id) {
            // Fallback: single employee_id for backward compatibility
            const employee = await tx.employeeCache.findUnique({ where: { employee_id: body.employee_id } });
            if (!employee) {
              throw new Error('Invalid employee_id for reimbursement');
            }
            await tx.reimbursement.create({
              data: {
                expense_id: expense.expense_id,
                employee_id: employee.employee_id,
                employee_name: employee.name,
                job_title: employee.job_title,
                amount: total_amount,
                status_id: pendingStatus.id,
                created_by,
                is_deleted: false,
              }
            });
          } else {
            // No reimbursement data provided, skip reimbursement creation
          }
        }
      }

      // If there's a receipt, update its is_expense_recorded flag
      if (receipt_id) {
        await tx.receipt.update({
          where: { receipt_id },
          data: { is_expense_recorded: true }
        });
      }

      await logAudit({
        action: 'CREATE',
        table_affected: 'ExpenseRecord',
        record_id: expense.expense_id,
        performed_by: created_by,
        details: `Created expense record with amount ₱${total_amount}${receipt_id ? ' with receipt' : ''}${assignment_id ? ' from assignment' : ''}${paymentMethod.name === 'REIMBURSEMENT' ? ' (REIMBURSEMENT)' : ''}`
      });

      // Fetch the complete expense record with all relationships for the response
      const completeExpense = await tx.expenseRecord.findUnique({
        where: { expense_id: expense.expense_id },
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

      // Fix: Add null check for completeExpense
      if (!completeExpense) {
        throw new Error('Failed to retrieve created expense record');
      }

      // Transform the data to match frontend expectations
      const expenseWithDetails = {
        ...completeExpense,
        total_amount: Number(completeExpense.total_amount),
        category_name: completeExpense.category?.name || null,
        payment_method_name: completeExpense.payment_method?.name || null,
        source_name: completeExpense.source?.name || null,
        // Transform receipt data if present
        receipt: completeExpense.receipt ? {
          ...completeExpense.receipt,
          total_amount: Number(completeExpense.receipt.total_amount),
          vat_amount: completeExpense.receipt.vat_amount ? Number(completeExpense.receipt.vat_amount) : null,
          total_amount_due: Number(completeExpense.receipt.total_amount_due),
          items: completeExpense.receipt.items.map(item => ({
            ...item,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            total_price: Number(item.total_price)
          }))
        } : null,
        // Transform reimbursements data
        reimbursements: completeExpense.reimbursements.map(reimb => ({
          ...reimb,
          amount: Number(reimb.amount)
        }))
      };

      return expenseWithDetails;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

// GET function remains the same...
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const dateFilter = searchParams.get('dateFilter');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  let dateCondition = {};

  if (dateFilter) {
    const now = new Date();
    switch (dateFilter) {
      case 'Day':
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        dateCondition = {
          expense_date: {
            gte: startOfDay,
            lt: endOfDay
          }
        };
        break;
      case 'Month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        dateCondition = {
          expense_date: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        };
        break;
      case 'Year':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        dateCondition = {
          expense_date: {
            gte: startOfYear,
            lte: endOfYear
          }
        };
        break;
    }
  } else if (dateFrom && dateTo) {
    dateCondition = {
      expense_date: {
        gte: new Date(dateFrom),
        lte: new Date(dateTo)
      }
    };
  }

  const expenses = await prisma.expenseRecord.findMany({ 
    where: { 
      is_deleted: false,
      ...dateCondition
    },
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
    },
    orderBy: { created_at: 'desc' }
  });

  // Transform the data to match frontend expectations
  const expensesWithDetails = expenses.map(exp => ({
    ...exp,
    total_amount: Number(exp.total_amount),
    category_name: exp.category?.name || null,
    payment_method_name: exp.payment_method?.name || null,
    source_name: exp.source?.name || null,
    // Transform receipt data if present
    receipt: exp.receipt ? {
      ...exp.receipt,
      total_amount: Number(exp.receipt.total_amount),
      vat_amount: exp.receipt.vat_amount ? Number(exp.receipt.vat_amount) : null,
      total_amount_due: Number(exp.receipt.total_amount_due),
      items: exp.receipt.items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price)
      }))
    } : null,
    // Transform reimbursements data
    reimbursements: exp.reimbursements.map(reimb => ({
      ...reimb,
      amount: Number(reimb.amount)
    }))
  }));

  return NextResponse.json(expensesWithDetails);
}