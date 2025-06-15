
// app/api/receipts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, Prisma, ExpenseCategory, PaymentStatus } from '@prisma/client'
import { generateId } from '@/lib/idGenerator'
import { prisma } from '@/lib/prisma'
import { getClientIp } from '@/lib/auditLogger'

interface ReceiptItem {
  item_name: string;
  unit: string;
  other_unit?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category: ExpenseCategory;
  other_category?: string;
  ocr_confidence?: number;
}

const prismaClient = new PrismaClient()

// GET /api/receipts
// List all active receipts with pagination and filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const supplier = searchParams.get('supplier');
    const category = searchParams.get('category') as ExpenseCategory | undefined;
    const status = searchParams.get('status') as PaymentStatus | undefined;
    const isExpenseRecorded = searchParams.get('isExpenseRecorded');

    const skip = (page - 1) * limit;

    // Build the where clause
    const where: Prisma.ReceiptWhereInput = {
      is_deleted: false,
      record_status: 'Active'
    };

    if (startDate && endDate) {
      where.transaction_date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (supplier) {
      where.supplier = {
        contains: supplier,
        mode: 'insensitive'
      };
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.payment_status = status;
    }

    if (isExpenseRecorded !== null) {
      where.is_expense_recorded = isExpenseRecorded === 'true';
    }

    // Get total count
    const total = await prisma.receipt.count({ where });

    // Get receipts
    const receipts = await prisma.receipt.findMany({
      where,
      include: {
        items: {
          include: {
            item: true
          }
        },
        expense: true
      },
      orderBy: {
        transaction_date: 'desc'
      },
      skip,
      take: limit
    });

    return NextResponse.json({
      receipts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipts' },
      { status: 500 }
    );
  }
}

// POST /api/receipts
// Create a new receipt with items
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
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
      source,
      items,
    } = body

    const receipt_id = await generateId('RCP')
    const clientIp = await getClientIp(req)

    const result = await prismaClient.$transaction(async (tx) => {
      const receipt = await tx.receipt.create({
        data: {
          receipt_id,
          supplier,
          transaction_date: new Date(transaction_date),
          vat_reg_tin,
          terms,
          date_paid: date_paid ? new Date(date_paid) : null,
          payment_status,
          record_status: 'Active',
          total_amount,
          vat_amount,
          total_amount_due,
          category: manualCategory || 'Other',
          other_category: manualCategory === 'Other' ? other_category : null,
          remarks,
          source: source || 'Manual_Entry',
          created_by: 'ftms_user'
        },
      })

      if (items && items.length > 0) {
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
              } as Prisma.ItemUncheckedCreateInput,
              update: {
                // Only update if the item was previously deleted
                is_deleted: false,
                updated_at: new Date()
              }
            });

            // Create receipt item
            const receipt_item_id = await generateId('RCI');
            await tx.receiptItem.create({
              data: {
                receipt_item_id,
                receipt_id: receipt.receipt_id,
                item_id: masterItem.item_id,
                quantity: new Prisma.Decimal(item.quantity),
                unit_price: new Prisma.Decimal(item.unit_price),
                total_price: new Prisma.Decimal(item.total_price),
                created_by: 'ftms_user',
                created_at: new Date(),
                is_deleted: false
              } as unknown as Prisma.ReceiptItemUncheckedCreateInput
            });

            // Create item transaction record
            await tx.itemTransaction.create({
              data: {
                transaction_id: await generateId('ITX'),
                item_id: masterItem.item_id,
                receipt_id: receipt.receipt_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                transaction_date: new Date(transaction_date),
                created_by: 'ftms_user'
              }
            });
          })
        )
      }

      // Create audit log with IP address
      await tx.auditLog.create({
        data: {
          log_id: await generateId('LOG'),
          action: 'ADD',
          table_affected: 'Receipt',
          record_id: receipt.receipt_id,
          performed_by: 'ftms_user',
          ip_address: clientIp,
          details: {
            new_values: {
              ...receipt,
              storage_size_bytes: receipt.storage_size_bytes?.toString() || null,
              total_amount: receipt.total_amount.toString(),
              total_amount_due: receipt.total_amount_due.toString(),
              vat_amount: receipt.vat_amount?.toString() || null,
            }
          },
        },
      })

      return receipt
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error creating receipt:', error)
    return NextResponse.json(
      { error: 'Failed to create receipt' },
      { status: 500 }
    )
  }
}