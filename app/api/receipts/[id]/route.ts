// app/api/receipts/[id]/route.ts
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

type AuditValues = {
  [key: string]: Prisma.JsonValue;
}

// GET /api/receipts/[id]
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.pathname.split('/').pop();

    const receipt = await prisma.receipt.findUnique({
      where: {
        receipt_id: id,
        is_deleted: false,
      },
      include: {
        items: { include: { item: true } },
        ocr_fields: true,
        keywords: true,
      },
    });

    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    return NextResponse.json(receipt);
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 });
  }
}

// PATCH /api/receipts/[id]
// PATCH /api/receipts/[id]
// PATCH /api/receipts/[id]
export async function PATCH(req: NextRequest) {
  try {
    const id = req.nextUrl.pathname.split('/').pop()!;
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

    const clientIp = await getClientIp(req);

    let summaryCategory = manualCategory;
    if (!manualCategory && items && items.length > 0) {
      const uniqueCategories = Array.from(new Set(items.map((item: ReceiptItem) => {
        return item.category === 'Other' && item.other_category ? item.other_category : item.category;
      }).filter(Boolean)));

      if (uniqueCategories.length === 0) summaryCategory = 'Fuel';
      else if (uniqueCategories.length === 1) summaryCategory = uniqueCategories[0];
      else summaryCategory = 'Multiple_Categories';
    }

    const result = await prisma.$transaction(async (tx) => {
      // Include the item relationship to get item_name, unit, and category
      const existingReceipt = await tx.receipt.findUnique({
        where: { receipt_id: id },
        include: { 
          items: {
            include: {
              item: true
            }
          }
        },
      });

      if (!existingReceipt) throw new Error('Receipt not found');

      const updatedReceipt = await tx.receipt.update({
        where: { receipt_id: id },
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

      if (items && items.length > 0) {
        await tx.receiptItem.deleteMany({ where: { receipt_id: id } });

        await Promise.all(items.map(async (item: ReceiptItem) => {
          const masterItem = await tx.item.upsert({
            where: { item_name: item.item_name },
            create: {
              item_id: await generateId('ITM'),
              item_name: item.item_name,
              unit: item.unit.toString(),
              category: item.category,
              other_unit: item.unit === ItemUnit.Other ? item.other_unit : null,
              other_category: item.category === ExpenseCategory.Other ? item.other_category : null,
              created_at: new Date(),
              is_deleted: false
            },
            update: {
              unit: item.unit.toString(),
              category: item.category,
              other_unit: item.unit === ItemUnit.Other ? item.other_unit : null,
              other_category: item.category === ExpenseCategory.Other ? item.other_category : null,
              updated_at: new Date()
            }
          });

          const receipt_item_id = await generateId('RCI');
          await tx.receiptItem.create({
            data: {
              receipt_item_id,
              receipt_id: id,
              item_id: masterItem.item_id,
              quantity: new Prisma.Decimal(item.quantity),
              unit_price: new Prisma.Decimal(item.unit_price),
              total_price: new Prisma.Decimal(item.total_price),
              created_by: 'ftms_user',
              created_at: new Date(),
              is_deleted: false
            }
          });

        await tx.itemTransaction.create({
          data: {
            transaction_id: await generateId('ITX'),
            item_id: masterItem.item_id,
            receipt_id: id,
            quantity: new Prisma.Decimal(item.quantity),
            unit_price: new Prisma.Decimal(item.unit_price),
            transaction_date: new Date(transaction_date),
            created_by: 'ftms_user',
            created_at: new Date(),
            transaction_type: "IN" // <-- Add this line, or use logic to determine the correct type
          }
        });
        }));
      }

      const updateAuditDetails = {
        previous_values: JSON.parse(JSON.stringify({
          ...existingReceipt,
          items: existingReceipt.items.map((receiptItem) => ({
            receipt_item_id: receiptItem.receipt_item_id,
            item_name: receiptItem.item.item_name,
            unit: receiptItem.item.unit,
            quantity: receiptItem.quantity.toString(),
            unit_price: receiptItem.unit_price.toString(),
            total_price: receiptItem.total_price.toString(),
            category: receiptItem.item.category,
            created_at: receiptItem.created_at,
            updated_at: receiptItem.updated_at,
            created_by: receiptItem.created_by,
            updated_by: receiptItem.updated_by,
            is_deleted: receiptItem.is_deleted,
            ocr_confidence: receiptItem.ocr_confidence
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
          record_id: id,
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
    return NextResponse.json({ error: 'Failed to update receipt' }, { status: 500 });
  }
}