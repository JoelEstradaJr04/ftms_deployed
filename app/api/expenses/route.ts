// app/api/expenses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateId } from '@/lib/idGenerator'
import { logAudit } from '@/lib/auditLogger'
import { fetchEmployeesForReimbursement } from '@/lib/supabase/employees'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      category,
      category_id,
      assignment_id,
      receipt_id,
      total_amount,
      expense_date,
      created_by,
      payment_method,
      payment_method_id,
      reimbursements
    } = body;

    const result = await prisma.$transaction(async (tx) => {
      // Validate required fields
      if (!total_amount || !expense_date || !created_by) {
        throw new Error('Missing required fields: total_amount, expense_date, or created_by');
      }

      // Handle category - convert name to ID if needed
      let finalCategoryId = category_id;
      if (!finalCategoryId && category) {
        const categoryRecord = await tx.globalCategory.findFirst({ 
          where: { name: category, is_deleted: false } 
        });
        if (!categoryRecord) {
          throw new Error(`Category '${category}' not found`);
        }
        finalCategoryId = categoryRecord.category_id;
      }
      if (!finalCategoryId) {
        throw new Error('Missing category_id or valid category name');
      }

      // Handle payment method - convert name to ID if needed
      let finalPaymentMethodId = payment_method_id;
      if (!finalPaymentMethodId && payment_method) {
        const paymentMethodRecord = await tx.globalPaymentMethod.findFirst({ 
          where: { name: payment_method, is_deleted: false } 
        });
        if (!paymentMethodRecord) {
          throw new Error(`Payment method '${payment_method}' not found`);
        }
        finalPaymentMethodId = paymentMethodRecord.id;
      }
      if (!finalPaymentMethodId) {
        throw new Error('Missing payment_method_id or valid payment_method name');
      }

      // Get category, payment method, and source
      const categoryRecord = await tx.globalCategory.findUnique({ where: { category_id: finalCategoryId } });
      const paymentMethodRecord = await tx.globalPaymentMethod.findUnique({ where: { id: finalPaymentMethodId } });
      const source = assignment_id ? await tx.globalSource.findFirst({ where: { name: 'operations' } }) : 
                    receipt_id ? await tx.globalSource.findFirst({ where: { name: 'receipt' } }) : null;

      if (!categoryRecord || !paymentMethodRecord) {
        throw new Error('Invalid category or payment method');
      }

      // Create expense record
      const expense = await tx.expenseRecord.create({
        data: {
          expense_id: await generateId('EXP'),
          category_id: categoryRecord.category_id,
          assignment_id: assignment_id || null,
          receipt_id: receipt_id || null,
          total_amount,
          expense_date: new Date(expense_date),
          created_by,
          payment_method_id: paymentMethodRecord.id,
          is_deleted: false,
        }
      });

      // Auto-create reimbursement if needed
      if (paymentMethodRecord.name === 'REIMBURSEMENT') {
        const pendingStatus = await tx.globalReimbursementStatus.findFirst({ where: { name: 'PENDING' } });
        if (!pendingStatus) throw new Error('PENDING reimbursement status not found');
        
        // Operations-sourced: assignment_id present
        if (assignment_id && (body.driver_reimbursement || body.conductor_reimbursement)) {
          // Create driver reimbursement if amount provided
          if (body.driver_reimbursement && body.driver_reimbursement > 0) {
            await tx.reimbursement.create({
              data: {
                expense_id: expense.expense_id,
                employee_id: body.driver_name || 'UNKNOWN',
                employee_name: body.driver_name || 'Unknown Driver',
                job_title: 'Driver',
                amount: body.driver_reimbursement,
                status_id: pendingStatus.id,
                created_by,
                is_deleted: false,
              }
            });
          }
          
          // Create conductor reimbursement if amount provided
          if (body.conductor_reimbursement && body.conductor_reimbursement > 0) {
            await tx.reimbursement.create({
              data: {
                expense_id: expense.expense_id,
                employee_id: body.conductor_name || 'UNKNOWN',
                employee_name: body.conductor_name || 'Unknown Conductor',
                job_title: 'Conductor',
                amount: body.conductor_reimbursement,
                status_id: pendingStatus.id,
                created_by,
                is_deleted: false,
              }
            });
          }
        }
        // Receipt-sourced: assignment_id not present
        else if ((!source || source.name !== 'operations') && total_amount) {
          if (Array.isArray(reimbursements) && reimbursements.length > 0) {
            // Fetch all employees from HR API
            const allEmployees = await fetchEmployeesForReimbursement();
            
            for (const entry of reimbursements) {
              if (!entry.employee_id || !entry.amount) {
                throw new Error('Missing employee_id or amount in reimbursement entry');
              }
              // Find employee from HR API data
              const employee = allEmployees.find(emp => emp.employee_id === entry.employee_id);
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
            const allEmployees = await fetchEmployeesForReimbursement();
            const employee = allEmployees.find(emp => emp.employee_id === body.employee_id);
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
        details: `Created expense record with amount ₱${total_amount}${receipt_id ? ' with receipt' : ''}${assignment_id ? ' from assignment' : ''}${paymentMethodRecord.name === 'REIMBURSEMENT' ? ' (REIMBURSEMENT)' : ''}`
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