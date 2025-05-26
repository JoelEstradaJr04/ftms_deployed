import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/auditLogger'
import { generateId } from '@/lib/idGenerator'
import { ReceiptStatus } from '@prisma/client'

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const {
      supplier,
      transaction_date,
      vat_reg_tin,
      terms,
      status,
      total_amount,
      vat_amount,
      total_amount_due,
      created_by,
      items // Array of items from the form
    } = data

    // Create the receipt first
    const receipt = await prisma.receipt.create({
      data: {
        receipt_id: await generateId('RCP'),
        supplier,
        transaction_date: new Date(transaction_date),
        vat_reg_tin,
        terms,
        status: status as ReceiptStatus,
        total_amount,
        vat_amount,
        total_amount_due,
        created_by,
        items: {
          create: items.map((item: { name: string; unit: string; quantity: number; unitPrice: number }) => ({
            receipt_item_id: generateId('RCI'),
            item_name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.quantity * item.unitPrice,
            created_by
          }))
        }
      },
      include: {
        items: true
      }
    })

    // For each item, create or update the master Item record and create ItemTransaction
    for (const item of items) {
      // Find or create Item in master list
      const masterItem = await prisma.item.upsert({
        where: { item_name: item.name },
        create: {
          item_id: await generateId('ITM'),
          item_name: item.name,
          unit: item.unit,
          created_at: new Date()
        },
        update: {
          updated_at: new Date()
        }
      })

      // Create ItemTransaction
      await prisma.itemTransaction.create({
        data: {
          transaction_id: await generateId('ITX'),
          item_id: masterItem.item_id,
          receipt_id: receipt.receipt_id,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          created_by,
          transaction_date: new Date(transaction_date)
        }
      })
    }

    await logAudit({
      action: 'CREATE',
      table_affected: 'Receipt',
      record_id: receipt.receipt_id,
      performed_by: created_by,
      details: `Created receipt with ${items.length} items, total amount: ${total_amount}`
    })

    return NextResponse.json(receipt)
  } catch (error) {
    console.error('Failed to create receipt:', error)
    return NextResponse.json(
      { error: 'Failed to create receipt' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const receipts = await prisma.receipt.findMany({
    where: { is_deleted: false },
    include: {
      items: true
    },
    orderBy: { created_at: 'desc' }
  })
  return NextResponse.json(receipts)
} 