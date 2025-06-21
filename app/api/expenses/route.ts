// app/api/expenses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateId } from '@/lib/idGenerator'
import { logAudit } from '@/lib/auditLogger'
// import { createClient } from '@supabase/supabase-js'

// // Initialize Supabase client
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// const supabase = createClient(supabaseUrl, supabaseKey)

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
      driver_reimbursement,
      conductor_reimbursement,
      reimbursements, // array for receipt-sourced
      category: legacy_category,
      payment_method: legacy_payment_method,
      source: legacy_source
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
    if (!final_source_id && legacy_source) {
      const src = await prisma.globalSource.findFirst({ where: { name: legacy_source } });
      if (src) final_source_id = src.source_id;
    }

    if (!final_category_id || !final_payment_method_id) {
      return NextResponse.json({ error: 'category_id and payment_method_id are required.' }, { status: 400 });
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

    const result = await prisma.$transaction(async (tx) => {
      // Create expense
      const expense = await tx.expenseRecord.create({
        data: {
          expense_id: await generateId('EXP'),
          category_id: final_category_id,
          source_id: final_source_id,
          payment_method_id: final_payment_method_id,
          assignment_id,
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
        // Operations-sourced: assignment_id present
        if (assignment_id) {
          // Fetch assignment for names and employee IDs
          const assignment = await tx.assignmentCache.findUnique({ where: { assignment_id } });
          if (assignment) {
            const { driver_id, conductor_id, trip_fuel_expense } = assignment;
            // Find employee IDs for driver and conductor
            const driver = await tx.employeeCache.findFirst({ where: { employee_id: driver_id } });
            const conductor = await tx.employeeCache.findFirst({ where: { employee_id: conductor_id } });
            if (!driver || !conductor) {
              throw new Error('Missing employee IDs for driver or conductor');
            }
            // Determine reimbursement amounts
            let driverAmount = Number(driver_reimbursement);
            let conductorAmount = Number(conductor_reimbursement);
            if (!driverAmount && !conductorAmount) {
              // If not provided, split total_amount equally
              driverAmount = conductorAmount = Number(total_amount) / 2;
            } else if (!driverAmount) {
              driverAmount = Number(total_amount) - Number(conductorAmount);
            } else if (!conductorAmount) {
              conductorAmount = Number(total_amount) - Number(driverAmount);
            }
            await tx.reimbursement.createMany({
              data: [
                {
                  expense_id: expense.expense_id,
                  employee_id: driver.employee_id,
                  employee_name: driver.name,
                  job_title: driver.job_title || 'Driver',
                  amount: driverAmount,
                  status_id: pendingStatus.id,
                  created_by,
                  is_deleted: false,
                },
                {
                  expense_id: expense.expense_id,
                  employee_id: conductor.employee_id,
                  employee_name: conductor.name,
                  job_title: conductor.job_title || 'Conductor',
                  amount: conductorAmount,
                  status_id: pendingStatus.id,
                  created_by,
                  is_deleted: false,
                },
              ]
            });
          }
        }
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

      // If there's an assignment, update its is_expense_recorded flag
      if (assignment_id) {
        await tx.assignmentCache.update({
          where: { assignment_id },
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

      return expense;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

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
          items: {
            include: {
              item: true
            }
          }
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  // Fetch all reimbursements for all expenses
  const expenseIds = expenses.map(exp => exp.expense_id);
  const allReimbursements = await prisma.reimbursement.findMany({
    where: { expense_id: { in: expenseIds } }
  });

  // Attach reimbursement details and global names for frontend
  const expensesWithDetails = expenses.map(exp => ({
    ...exp,
    category_name: exp.category?.name || null,
    payment_method_name: exp.payment_method?.name || null,
    source_name: exp.source?.name || null,
    reimbursements: allReimbursements.filter((r: { expense_id: string }) => r.expense_id === exp.expense_id)
  }));
  return NextResponse.json(expensesWithDetails);
}