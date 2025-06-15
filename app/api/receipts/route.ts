import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, Prisma } from '@prisma/client'
import { generateId } from '@/lib/idGenerator'

interface ReceiptItem {
  item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  ocr_confidence?: number;
  category: 'Fuel' | 'Vehicle_Parts' | 'Tools' | 'Equipment' | 'Supplies' | 'Other';
  other_category?: string;
  other_unit?: string;
}

// interface OCRField {
//   field_name: string;
//   field_value: string;
//   confidence: number;
//   bounding_box?: string;
// }

// interface Keyword {
//   keyword: string;
//   confidence?: number;
// }

const prisma = new PrismaClient()

// GET /api/receipts
// List all active receipts with pagination and filters
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const category = searchParams.get('category') as 'Fuel' | 'Vehicle_Parts' | 'Tools' | 'Equipment' | 'Supplies' | 'Other' | undefined
    const source = searchParams.get('source') as 'Manual_Entry' | 'OCR_Camera' | 'OCR_File' | undefined
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'transaction_date'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build filter conditions
    const where = {
      is_deleted: false,
      ...(startDate && endDate && {
        transaction_date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
      ...(category && { category }),
      ...(source && { source }),
      ...(search && {
        OR: [
          { supplier: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { remarks: { contains: search, mode: Prisma.QueryMode.insensitive } },
          {
            keywords: {
              some: {
                keyword: { contains: search, mode: Prisma.QueryMode.insensitive },
              },
            },
          },
        ],
      }),
    }

    // Get total count for pagination
    const total = await prisma.receipt.count({ where })

    // Get receipts with relations
    const receipts = await prisma.receipt.findMany({
      where,
      include: {
        items: true
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      receipts,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: page,
        limit,
      },
    })
  } catch (error) {
    console.error('Error fetching receipts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch receipts' },
      { status: 500 }
    )
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

    const result = await prisma.$transaction(async (tx) => {
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
            const masterItem = await tx.item.upsert({
              where: { item_name: item.item_name },
              create: {
                item_id: await generateId('ITM'),
                item_name: item.item_name,
                unit: item.unit,
              },
              update: {}
            });

            const receipt_item_id = await generateId('RCI');
            await tx.receiptItem.create({
              data: {
                receipt_item_id,
                receipt_id: receipt.receipt_id,
                item_name: item.item_name,
                unit: item.unit,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                category: item.category,
                created_by: 'ftms_user',
                other_unit: item.unit === 'Other' ? item.other_unit : null,
                other_category: item.category === 'Other' ? item.other_category : null,
                created_at: new Date(),
                is_deleted: false
              } as unknown as Prisma.ReceiptItemUncheckedCreateInput
            });

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

      // Create audit log (keep existing audit log creation)
      await tx.auditLog.create({
        data: {
          log_id: await generateId('LOG'),
          action: 'ADD',
          table_affected: 'Receipt',
          record_id: receipt.receipt_id,
          performed_by: 'ftms_user',
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