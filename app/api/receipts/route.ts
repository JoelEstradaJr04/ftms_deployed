// app/api/receipts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { generateId } from '@/lib/idGenerator'
import { prisma } from '@/lib/prisma'
import { getClientIp, logAudit } from '@/lib/auditLogger'

// GET /api/receipts
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

    const receipts = await prisma.receipt.findMany(findManyOptions);

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
      };
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
    return NextResponse.json({ error: 'Failed to fetch receipts' }, { status: 500 });
  }
}

// POST /api/receipts
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

    const transactionDate = (() => {
      if (!transaction_date) return new Date();
      const inputDate = new Date(transaction_date);
      if (
        inputDate.getHours() === 0 &&
        inputDate.getMinutes() === 0 &&
        inputDate.getSeconds() === 0
      ) {
        const now = new Date();
        inputDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      }
      return inputDate;
    })();

    // Step 1: Create Receipt
    const receipt = await prisma.receipt.create({
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
      },
    });

    // Step 2: Create Receipt Items and Transactions
    if (items && items.length > 0) {
      const itemMap: Record<string, string> = {};
      const receiptItemsData: Prisma.ReceiptItemCreateManyInput[] = [];
      const itemTransactionsData: Prisma.ItemTransactionCreateManyInput[] = [];

      for (const item of items) {
        const [unitExists, catExists] = await Promise.all([
          prisma.globalItemUnit.findUnique({ where: { id: item.unit_id } }),
          prisma.globalCategory.findUnique({ where: { category_id: item.category_id } }),
        ]);
        if (!unitExists || !catExists) {
          return NextResponse.json({ error: 'Invalid unit/category ID' }, { status: 400 });
        }

        if (!itemMap[item.item_name]) {
          const generatedItemId = await generateId('ITM');
          const existing = await prisma.item.findUnique({ where: { item_name: item.item_name } });

          const finalItemId = existing ? existing.item_id : generatedItemId;

          if (!existing) {
            await prisma.item.create({
              data: {
                item_id: finalItemId,
                item_name: item.item_name,
                unit: { connect: { id: item.unit_id } },
                category: { connect: { category_id: item.category_id } },
                created_at: new Date(),
                is_deleted: false
              }
            });
          } else {
            await prisma.item.update({
              where: { item_name: item.item_name },
              data: {
                is_deleted: false,
                updated_at: new Date()
              }
            });
          }

          itemMap[item.item_name] = finalItemId;
        }

        const receipt_item_id = await generateId('RCI');
        const transaction_id = await generateId('ITX');

        receiptItemsData.push({
          receipt_item_id,
          receipt_id,
          item_id: itemMap[item.item_name],
          quantity: new Prisma.Decimal(item.quantity),
          unit_price: new Prisma.Decimal(item.unit_price),
          total_price: new Prisma.Decimal(item.total_price),
          created_by: created_by || 'ftms_user',
          created_at: new Date(),
          is_deleted: false
        });

        itemTransactionsData.push({
          transaction_id,
          item_id: itemMap[item.item_name],
          receipt_id,
          quantity: new Prisma.Decimal(item.quantity),
          unit_price: new Prisma.Decimal(item.unit_price),
          transaction_date: transactionDate,
          created_by: created_by || 'ftms_user',
          created_at: new Date(),
        });
      }

      // Parallel insert of items and transactions
      await Promise.all([
        prisma.receiptItem.createMany({ data: receiptItemsData }),
        prisma.itemTransaction.createMany({ data: itemTransactionsData }),
      ]);
    }

    // Step 3: Audit log
    await logAudit({
      action: 'ADD',
      table_affected: 'Receipt',
      record_id: receipt_id,
      performed_by: created_by || 'ftms_user',
      ip_address: clientIp,
      details: JSON.stringify({
        new_values: {
          ...receipt,
          total_amount: receipt.total_amount?.toString() || null,
        }
      }),
    });

    return NextResponse.json(receipt);
  } catch (error) {
    console.error('Error creating receipt:', error);
    return NextResponse.json({ error: 'Failed to create receipt' }, { status: 500 });
  }
}
