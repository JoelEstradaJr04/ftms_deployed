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
    receipt_data
  } = data

  try {
    let finalAmount = total_amount
    let receiptId = null

    if (receipt_data) {
      const receipt = await prisma.receipt.create({
        data: {
          supplier: receipt_data.supplier,
          receipt_date: new Date(receipt_data.date),
          vat_reg_tin: receipt_data.vat_reg_tin,
          terms: receipt_data.terms,
          status: receipt_data.status,
          total_amount: receipt_data.total_amount,
          vat_amount: receipt_data.vat_amount,
          total_amount_due: receipt_data.total_amount_due,
          created_by: recorded_by,
          items: {
            create: receipt_data.items.map((item: any) => ({
              item_name: item.name,
              unit: item.unit,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              total_price: item.quantity * item.unitPrice,
              created_by: recorded_by
            }))
          }
        }
      })
      
      receiptId = receipt.receipt_id
      finalAmount = receipt.total_amount

      for (const item of receipt_data.items) {
        const masterItem = await prisma.item.upsert({
          where: { item_name: item.name },
          create: {
            item_name: item.name,
            unit: item.unit,
            created_at: new Date()
          },
          update: {
            updated_at: new Date()
          }
        })

        await prisma.itemTransaction.create({
          data: {
            item_id: masterItem.item_id,
            receipt_id: receipt.receipt_id,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            created_by: recorded_by,
            transaction_date: new Date(receipt_data.date)
          }
        })
      }
    }

    const newExpense = await prisma.expenseRecord.create({
      data: {
        expense_id: await generateId('EXP'),
        assignment_id: assignment_id ?? null,
        category,
        department_from,
        total_amount: finalAmount,
        date: new Date(date),
        receipt_id: receiptId,
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
      details: `Created expense record with amount ₱${finalAmount}${receiptId ? ' with receipt' : ''}`
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