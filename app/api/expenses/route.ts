// app/api/expenses/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAssignmentById } from '@/lib/supabase/assignments'
import { generateId } from '@/lib/idGenerator'
import type { NextRequest } from 'next/server'
import { logAudit } from '@/lib/auditLogger'

export async function POST(req: NextRequest) {
  const data = await req.json()
  const {
    assignment_id,
    category,
    department_from,
    total_amount,
    date,
    recorded_by,
  } = data

  try {
    let finalAmount = total_amount

    if (assignment_id) {
      const duplicate = await prisma.expenseRecord.findFirst({
        where: {
          assignment_id,
          date: new Date(date),
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'Expense record for this assignment and date already exists.' },
          { status: 409 }
        )
      }

      const assignmentData = await getAssignmentById(assignment_id)
      if (!assignmentData || assignmentData.trip_fuel_expense == null) {
        return NextResponse.json(
          { error: 'Assignment not found or missing trip_fuel_expense in Supabase' },
          { status: 404 }
        )
      }

      finalAmount = assignmentData.trip_fuel_expense
    }

    const newExpense = await prisma.expenseRecord.create({
      data: {
        expense_id: await generateId('exp'),
        assignment_id: assignment_id ?? null,
        category,
        department_from,
        total_amount: finalAmount,
        date: new Date(date),
        recorded_by,
        created_at: new Date(),
        updated_at: null,
        isDeleted: false,
      },
    })

    await logAudit({
      action: 'CREATE',
      table_affected: 'ExpenseRecord',
      record_id: newExpense.expense_id,
      performed_by: recorded_by,
      details: `Created expense record with amount ₱${finalAmount}`,
    })

    return NextResponse.json(newExpense)
  } catch (error) {
    console.error('Failed to create expense:', error)
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Internal Server Error', details: error.message },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Internal Server Error', details: 'An unknown error occurred' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const expenses = await prisma.expenseRecord.findMany({ 
    where: { isDeleted: false },
    orderBy: { created_at: 'desc' }
  })
  return NextResponse.json(expenses)
}