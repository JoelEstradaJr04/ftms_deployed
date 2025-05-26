// app/api/expenses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateId } from '@/lib/idGenerator'
import { logAudit } from '@/lib/auditLogger'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const {
      assignment_id,
      receipt_id,
      category,
      total_amount,
      expense_date,
      created_by,
      other_source,
      other_category
    } = data

    let finalAmount = Number(total_amount)

    // If linked to a receipt, validate and get total_amount_due
    if (receipt_id) {
      const receipt = await prisma.receipt.findUnique({
        where: { receipt_id }
      })
      if (!receipt) {
        return NextResponse.json(
          { error: 'Receipt not found' },
          { status: 404 }
        )
      }
      if (receipt.is_expense_recorded) {
        return NextResponse.json(
          { error: 'Receipt is already linked to an expense' },
          { status: 400 }
        )
      }
      finalAmount = Number(receipt.total_amount_due)

      // Update is_expense_recorded flag
      await prisma.receipt.update({
        where: { receipt_id },
        data: { is_expense_recorded: true }
      })
    }

    // If linked to an assignment, update Supabase
    if (assignment_id) {
      const { error: supabaseError } = await supabase
        .from('assignments')
        .update({ is_expense_recorded: true })
        .eq('assignment_id', assignment_id)

      if (supabaseError) {
        console.error('Supabase update failed:', supabaseError)
        return NextResponse.json(
          { error: 'Failed to update assignment status in Supabase' },
          { status: 500 }
        )
      }
    }

    const newExpense = await prisma.expenseRecord.create({
      data: {
        expense_id: await generateId('EXP'),
        assignment_id: assignment_id ?? null,
        receipt_id: receipt_id ?? null,
        category,
        total_amount: finalAmount,
        expense_date: new Date(expense_date),
        created_by,
        created_at: new Date(),
        updated_at: null,
        is_deleted: false,
        other_source: other_source,
        other_category: category === 'Other' ? other_category : null
      },
      include: {
        receipt: {
          include: {
            items: true
          }
        }
      }
    })

    await logAudit({
      action: 'CREATE',
      table_affected: 'ExpenseRecord',
      record_id: newExpense.expense_id,
      performed_by: created_by,
      details: `Created expense record with amount ₱${finalAmount}${receipt_id ? ' with receipt' : ''}${assignment_id ? ' from assignment' : ''}`
    })

    return NextResponse.json(newExpense)
  } catch (error) {
    console.error('Failed to create expense:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    )
  }
}

export async function GET() {
  const expenses = await prisma.expenseRecord.findMany({ 
    where: { is_deleted: false },
    include: {
      receipt: {
        include: {
          items: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  })

  // Convert Decimal fields to numbers before sending response
  const formattedExpenses = expenses.map(expense => ({
    ...expense,
    total_amount: Number(expense.total_amount)
  }))

  return NextResponse.json(formattedExpenses)
}