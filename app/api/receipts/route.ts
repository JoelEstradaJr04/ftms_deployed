// app/api/receipts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { generateId } from '@/lib/idGenerator'
import { prisma } from '@/lib/prisma'
import { getClientIp, logAudit } from '@/lib/auditLogger'

// GET /api/receipts
// List all active receipts with pagination and filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const fetchAll = searchParams.get('fetchAll') === 'true';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const supplier = searchParams.get('supplier');
    const category = searchParams.get('category') as string | undefined;
    const status = searchParams.get('status') as string | undefined;
    const isExpenseRecorded = searchParams.get('isExpenseRecorded');

    const skip = (page - 1) * limit;

    // Build the where clause
    const where: Prisma.ReceiptWhereInput = {
      is_deleted: false,
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
      where.category = { name: category };
    }

    if (status) {
      where.payment_status = { name: status };
    }

    if (isExpenseRecorded !== null) {
      where.is_expense_recorded = isExpenseRecorded === 'true';
    }

    // Get total count
    const total = await prisma.receipt.count({ where });

    const findManyOptions: Prisma.ReceiptFindManyArgs = {
      where,
      include: {
        category: true,
        payment_status: true,
        source: true,
        terms: true,
        items: {
          include: {
            item: {
              include: {
                unit: true,
                category: true,
              },
            },
          },
        },
        expense: true
      },
      orderBy: {
        transaction_date: 'desc'
      }
    };

    if (!fetchAll) {
      findManyOptions.skip = skip;
      findManyOptions.take = limit;
    }

    // Get receipts
    const receipts = await prisma.receipt.findMany(findManyOptions);

    // Attach global names for frontend
    const receiptsWithNames = receipts.map(r => {
      const receiptWithIncludes = r as typeof r & {
        category: { category_id: string; name: string | null } | null;
        payment_status: { name: string | null } | null;
        source: { name: string | null } | null;
        terms: { name: string | null } | null;
      };
      return {
        ...receiptWithIncludes,
        category_name: receiptWithIncludes.category?.name || null,
        category_id: receiptWithIncludes.category?.category_id || null,
        payment_status_name: receiptWithIncludes.payment_status?.name || null,
        source_name: receiptWithIncludes.source?.name || null,
        terms_name: receiptWithIncludes.terms?.name || null,
      }
    });

    return NextResponse.json({
      receipts: receiptsWithNames,
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
    const body = await req.json();
    const {
      supplier,
      transaction_date,
      vat_reg_tin,
      terms_id,
      date_paid,
      payment_status_id,
      total_amount,
      vat_amount,
      total_amount_due,
      category_id,
      remarks,
      source_id,
      items,
      created_by
    } = body;

    // Validate all required global IDs
    const [category, paymentStatus, terms] = await Promise.all([
      prisma.globalCategory.findUnique({ where: { category_id } }),
      prisma.globalPaymentStatus.findUnique({ where: { id: payment_status_id } }),
      prisma.globalTerms.findUnique({ where: { id: terms_id } })
    ]);
    if (!category || !paymentStatus || !terms) {
      return NextResponse.json({ error: 'Invalid global ID(s) provided.' }, { status: 400 });
    }

    const receipt_id = await generateId('RCP');
    const clientIp = await getClientIp(req);

    // const activeStatus = await prisma.globalRecordStatus.findFirst({ where: { name: 'Active' } });
    // if (!activeStatus) {
    //   return NextResponse.json({ error: 'Active record status not found.' }, { status: 500 });
    // }

    const result = await prisma.$transaction(async (tx) => {
      const transactionDate = (() => {
        if (!transaction_date) return new Date();
        
        const inputDate = new Date(transaction_date);
        
        // Check if the time is midnight (indicating only date was provided)
        if (inputDate.getHours() === 0 && inputDate.getMinutes() === 0 && inputDate.getSeconds() === 0) {
          // Use current time with the provided date
          const now = new Date();
          inputDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        }
        
        return inputDate;
      })();

  const receipt = await tx.receipt.create({
    data: {
      receipt_id,
      supplier,
      transaction_date: transactionDate,
      vat_reg_tin,
      terms: { connect: { id: terms_id } },
      date_paid: date_paid ? new Date(date_paid) : null,
      payment_status: { connect: { id: payment_status_id } },
      total_amount,
      vat_amount,
      total_amount_due,
      category: { connect: { category_id } },
      remarks,
      source: source_id ? { connect: { source_id } } : undefined,
      created_by: created_by || 'ftms_user',
      // is_inventory_processed: false // TODO: Uncomment after regenerating Prisma client
        },
      });

      // Items
    if (items && items.length > 0) {
      await Promise.all(
        items.map(async (item: { item_name: string; unit_id: string; category_id: string; quantity: number; unit_price: number; total_price: number; }) => {
            const [itemUnit, itemCategory] = await Promise.all([
              tx.globalItemUnit.findUnique({ where: { id: item.unit_id } }),
              tx.globalCategory.findUnique({ where: { category_id: item.category_id } })
            ]);
            if (!itemUnit || !itemCategory) throw new Error('Invalid item unit/category ID');
            // Upsert master item
            const masterItem = await tx.item.upsert({
              where: { item_name: item.item_name },
              create: {
                item_id: await generateId('ITM'),
                item_name: item.item_name,
                unit: { connect: { id: item.unit_id } },
                category: { connect: { category_id: item.category_id } },
                created_at: new Date(),
                is_deleted: false
              },
              update: {
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
                created_by: created_by || 'ftms_user',
                created_at: new Date(),
                is_deleted: false
              }
            });
            // Create item transaction record
            await tx.itemTransaction.create({
              data: {
                transaction_id: await generateId('ITX'),
                item_id: masterItem.item_id,
                receipt_id: receipt.receipt_id,
                quantity: new Prisma.Decimal(item.quantity.toString()),
                unit_price: new Prisma.Decimal(item.unit_price.toString()),
                transaction_date: transactionDate, // Use the same date with time
                created_by: created_by || 'ftms_user'
              }
            });
          })
        );
      }

      // --- AUTO-CREATE EXPENSE RECORD FOR THIS RECEIPT ---
      // const cashPaymentMethod = await tx.globalPaymentMethod.findFirst({ where: { name: 'CASH' } });
      // if (!cashPaymentMethod) throw new Error('CASH payment method not found');
      // const expense = await tx.expenseRecord.create({
      //   data: {
      //     expense_id: await generateId('EXP'),
      //     category: { connect: { category_id: receipt.category_id } },
      //     source: receipt.source_id ? { connect: { source_id: receipt.source_id } } : undefined,
      //     payment_method: { connect: { id: cashPaymentMethod.id } },
      //     receipt: { connect: { receipt_id: receipt.receipt_id } },
      //     total_amount: receipt.total_amount,
      //     expense_date: receipt.transaction_date,
      //     created_by: 'ftms_user',
      //     created_at: new Date(),
      //     updated_at: null,
      //     is_deleted: false,
      //   },
      // });
      // // Mark receipt as expense recorded
      // await tx.receipt.update({
      //   where: { receipt_id: receipt.receipt_id },
      //   data: { is_expense_recorded: true },
      // });

      // Create an audit log entry
      await logAudit({
        action: 'ADD',
        table_affected: 'Receipt',
        record_id: receipt.receipt_id,
        performed_by: created_by || 'ftms_user',
        ip_address: clientIp,
        details: JSON.stringify({
          new_values: {
            ...receipt,
            total_amount: receipt.total_amount?.toString() || null,
          }
        }),
      });

      return receipt;
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating receipt:', error);
    return NextResponse.json({ error: 'Failed to create receipt' }, { status: 500 });
  }
}