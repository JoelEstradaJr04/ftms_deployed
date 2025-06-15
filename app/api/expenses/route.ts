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
    const { category, assignment_id, receipt_id, total_amount, expense_date, created_by, other_source, other_category } = body;

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the expense record
      const expense = await tx.expenseRecord.create({
        data: {
          expense_id: await generateId('EXP'),
          category,
          assignment_id,
          receipt_id,
          total_amount,
          expense_date: new Date(expense_date),
          created_by,
          created_at: new Date(),
          updated_at: null,
          is_deleted: false,
          other_source,
          other_category,
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
          }
        }
      });

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
        details: `Created expense record with amount ₱${total_amount}${receipt_id ? ' with receipt' : ''}${assignment_id ? ' from assignment' : ''}`
      });

      return expense;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
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
  
  return NextResponse.json(expenses);
}