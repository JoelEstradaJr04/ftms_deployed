//  app/api/receipts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, Prisma, ExpenseCategory, ItemUnit } from '@prisma/client'
import { generateId } from '@/lib/idGenerator'
import { getClientIp } from '@/lib/auditLogger'

const prisma = new PrismaClient()

interface ReceiptItem {
  receipt_item_id?: string;
  item_name: string;
  unit: ItemUnit;
  quantity: number;
  unit_price: number;
  total_price: number;
  category: ExpenseCategory;
  other_unit?: string;
  other_category?: string;
}

interface DbReceiptItem {
  receipt_item_id: string;
  item_name: string;
  unit: string;
  quantity: Prisma.Decimal;
  unit_price: Prisma.Decimal;
  total_price: Prisma.Decimal;
  created_at: Date;
  updated_at: Date | null;
  created_by: string;
  updated_by: string | null;
  is_deleted: boolean;
  ocr_confidence: number | null;
  category: string;
}

type AuditValues = {
  [key: string]: Prisma.JsonValue;
}

// GET /api/receipts/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: {
        receipt_id: params.id,
        is_deleted: false,
      },
      include: {
        items: {
          include: {
            item: true
          }
        },
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
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const {
      supplier,
      transaction_date,
      vat_reg_tin,
      terms,
      date_paid,
      payment_status,
      total_amount,
      vat_amount,
      total_amount_due,
      category: manualCategory,
      other_category,
      remarks,
      items
    } = body;

    const { id: receipt_id } = await params;
    const clientIp = await getClientIp(req);

    // Compute summary category from items if not manually provided
    let summaryCategory = manualCategory;
    if (!manualCategory && items && items.length > 0) {
      // Get unique categories
      const uniqueCategories = Array.from(new Set(items.map((item: ReceiptItem) => {
        return item.category === 'Other' && item.other_category
          ? item.other_category
          : item.category;
      }).filter(Boolean)));

      if (uniqueCategories.length === 0) {
        summaryCategory = 'Fuel';
      } else if (uniqueCategories.length === 1) {
        summaryCategory = uniqueCategories[0];
      } else {
        summaryCategory = 'Multiple_Categories';
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get existing receipt for audit
      const existingReceipt = await tx.receipt.findUnique({
        where: { receipt_id },
        include: { items: true },
      });

      if (!existingReceipt) {
        throw new Error('Receipt not found');
      }

      // Update receipt
      const updatedReceipt = await tx.receipt.update({
        where: { receipt_id },
        data: {
          supplier,
          transaction_date: transaction_date ? new Date(transaction_date) : undefined,
          vat_reg_tin,
          terms,
          date_paid: date_paid ? new Date(date_paid) : null,
          payment_status,
          total_amount,
          vat_amount,
          total_amount_due,
          category: summaryCategory,
          other_category: summaryCategory === 'Other' ? other_category : null,
          remarks,
          updated_at: new Date(),
          updated_by: 'ftms_user'
        },
      });

      // Handle items
      if (items && items.length > 0) {
        // Delete existing items
        await tx.receiptItem.deleteMany({
          where: { receipt_id },
        });

        // Create new items
        await Promise.all(
          items.map(async (item: ReceiptItem) => {
            // First ensure the master item exists
            const masterItem = await tx.item.upsert({
              where: { item_name: item.item_name },
              create: {
                item_id: await generateId('ITM'),
                item_name: item.item_name,
                unit: item.unit,
                category: item.category,
                other_unit: item.unit === 'Other' ? item.other_unit : null,
                other_category: item.category === 'Other' ? item.other_category : null,
                created_at: new Date(),
                is_deleted: false
              },
              update: {
                unit: item.unit,
                category: item.category,
                other_unit: item.unit === 'Other' ? item.other_unit : null,
                other_category: item.category === 'Other' ? item.other_category : null,
                updated_at: new Date()
              }
            });

            // Create new receipt item
            const receipt_item_id = await generateId('RCI');
            await tx.receiptItem.create({
              data: {
                receipt_item_id,
                receipt_id,
                item_id: masterItem.item_id,
                quantity: new Prisma.Decimal(item.quantity),
                unit_price: new Prisma.Decimal(item.unit_price),
                total_price: new Prisma.Decimal(item.total_price),
                created_by: 'ftms_user',
                created_at: new Date(),
                is_deleted: false
              }
            });

            // Create item transaction record
            await tx.itemTransaction.create({
              data: {
                transaction_id: await generateId('ITX'),
                item_id: masterItem.item_id,
                receipt_id,
                quantity: new Prisma.Decimal(item.quantity),
                unit_price: new Prisma.Decimal(item.unit_price),
                transaction_date: new Date(transaction_date),
                created_by: 'ftms_user',
                created_at: new Date()
              }
            });
          })
        );
      }

      // Create audit log for update with IP address
      const updateAuditDetails = {
        previous_values: JSON.parse(JSON.stringify({
          ...existingReceipt,
          items: existingReceipt.items.map((item: DbReceiptItem) => ({
            ...item,
            total_price: item.total_price.toString(),
            quantity: item.quantity.toString(),
            unit_price: item.unit_price.toString()
          }))
        })),
        new_values: JSON.parse(JSON.stringify({
          ...updatedReceipt,
          items: items.map((item: ReceiptItem) => ({
            ...item,
            total_price: item.total_price.toString(),
            quantity: item.quantity.toString(),
            unit_price: item.unit_price.toString()
          }))
        }))
      } satisfies AuditValues;

      await tx.auditLog.create({
        data: {
          log_id: await generateId('LOG'),
          action: 'UPDATE',
          table_affected: 'Receipt',
          record_id: receipt_id,
          performed_by: 'ftms_user',
          ip_address: clientIp,
          details: updateAuditDetails,
        },
      });

      return updatedReceipt;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating receipt:', error);
    return NextResponse.json(
      { error: 'Failed to update receipt' },
      { status: 500 }
    );
  }
}

// DELETE /api/receipts/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    let reason = '';
    try {
      const body = await req.json();
      reason = body.reason || '';
    } catch {
      // If no body is provided, continue with empty reason
      console.log('No deletion reason provided');
    }

    const { id: receipt_id } = await params;
    const clientIp = await getClientIp(req);

    // Replace the existing transaction with this new one
    const result = await prisma.$transaction(async (tx) => {
      // Get the receipt first to check if it exists and get its details
      const receipt = await tx.receipt.findUnique({
        where: { receipt_id },
        include: {
          items: true,
          expense: true
        }
      });

      if (!receipt) {
        throw new Error('Receipt not found');
      }

      // Soft delete the receipt
      const updatedReceipt = await tx.receipt.update({
        where: { receipt_id },
        data: {
          is_deleted: true,
          deletion_reason: reason,
          deleted_by: 'ftms_user',
          deleted_at: new Date(),
          record_status: 'Inactive'
        }
      });

      // Create audit log with IP address
      await tx.auditLog.create({
        data: {
          log_id: await generateId('LOG'),
          action: 'DELETE',
          table_affected: 'Receipt',
          record_id: receipt_id,
          performed_by: 'ftms_user',
          ip_address: clientIp,
          details: {
            old_values: {
              ...receipt,
              storage_size_bytes: receipt.storage_size_bytes?.toString() || null,
              total_amount: receipt.total_amount.toString(),
              total_amount_due: receipt.total_amount_due.toString(),
              vat_amount: receipt.vat_amount?.toString() || null,
            },
            deletion_reason: reason
          },
        },
      });

      return updatedReceipt;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting receipt:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete receipt' },
      { status: 500 }
    );
  }
}