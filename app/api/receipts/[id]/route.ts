import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { generateId } from '@/lib/idGenerator'

const prisma = new PrismaClient()

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/receipts/[id]
// Get a specific receipt with all its details
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: {
        receipt_id: params.id,
        is_deleted: false,
      },
      include: {
        items: true,
        ocr_fields: true,
        keywords: true,
      },
    })

    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(receipt)
  } catch (error) {
    console.error('Error fetching receipt:', error)
    return NextResponse.json(
      { error: 'Failed to fetch receipt' },
      { status: 500 }
    )
  }
}

// PATCH /api/receipts/[id]
// Update a receipt and its items
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const body = await req.json()
    const {
      supplier,
      transaction_date,
      vat_reg_tin,
      terms,
      payment_status,
      total_amount,
      vat_amount,
      total_amount_due,
      category,
      remarks,
      items,
    } = body

    // Get existing receipt for audit
    const existingReceipt = await prisma.receipt.findUnique({
      where: { receipt_id: params.id },
      include: { items: true },
    })

    if (!existingReceipt || existingReceipt.is_deleted) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      )
    }

    // Update receipt and items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update receipt
      const updatedReceipt = await tx.receipt.update({
        where: { receipt_id: params.id },
        data: {
          supplier,
          transaction_date: transaction_date ? new Date(transaction_date) : undefined,
          vat_reg_tin,
          terms,
          payment_status,
          total_amount,
          vat_amount,
          total_amount_due,
          category,
          remarks,
          updated_at: new Date(),
          updated_by: 'ftms_user',
        },
      })

      // Update items if provided
      if (items) {
        // Delete existing items
        await tx.receiptItem.deleteMany({
          where: { receipt_id: params.id },
        })

        // Create new items
        await Promise.all(
          items.map(async (item: any) => {
            const receipt_item_id = await generateId('RCI')
            await tx.receiptItem.create({
              data: {
                receipt_item_id,
                receipt_id: params.id,
                item_name: item.item_name,
                unit: item.unit,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                created_by: 'ftms_user',
              },
            })

            // Update master item
            await tx.item.upsert({
              where: { item_name: item.item_name },
              create: {
                item_id: await generateId('ITM'),
                item_name: item.item_name,
                unit: item.unit,
                created_by: 'ftms_user',
              },
              update: {},
            })
          })
        )
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          log_id: await generateId('LOG'),
          action: 'EDIT',
          table_affected: 'Receipt',
          record_id: params.id,
          performed_by: 'ftms_user',
          details: {
            old_values: existingReceipt,
            new_values: updatedReceipt,
          },
        },
      })

      return updatedReceipt
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating receipt:', error)
    return NextResponse.json(
      { error: 'Failed to update receipt' },
      { status: 500 }
    )
  }
}

// DELETE /api/receipts/[id]
// Soft delete a receipt
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const body = await req.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json(
        { error: 'Deletion reason is required' },
        { status: 400 }
      )
    }

    // Get existing receipt for audit
    const existingReceipt = await prisma.receipt.findUnique({
      where: { receipt_id: params.id },
    })

    if (!existingReceipt || existingReceipt.is_deleted) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      )
    }

    // Soft delete receipt
    const result = await prisma.$transaction(async (tx) => {
      const deletedReceipt = await tx.receipt.update({
        where: { receipt_id: params.id },
        data: {
          is_deleted: true,
          deletion_reason: reason,
          deleted_by: 'ftms_user',
          deleted_at: new Date(),
        },
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          log_id: await generateId('LOG'),
          action: 'DELETE',
          table_affected: 'Receipt',
          record_id: params.id,
          performed_by: 'ftms_user',
          details: {
            old_values: existingReceipt,
            reason: reason,
          },
        },
      })

      return deletedReceipt
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error deleting receipt:', error)
    return NextResponse.json(
      { error: 'Failed to delete receipt' },
      { status: 500 }
    )
  }
} 