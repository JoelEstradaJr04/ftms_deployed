// app/api/receipts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, Prisma } from '@prisma/client'
import { generateId } from '@/lib/idGenerator'
import { getClientIp } from '@/lib/auditLogger'

const prisma = new PrismaClient()

interface ReceiptItemPayload {
  item_name: string;
  unit_id: string;
  category_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  other_unit?: string;
  receipt_item_id?: string; // Optional for new items
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
        items: { 
          where: {
            is_deleted: false
          },
          include: { item: true } 
        },
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
export async function PATCH(req: NextRequest) {
  try {
    const id = req.nextUrl.pathname.split('/').pop()!;
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
      items,
      deleted_items,
      updated_by
    } = body;

    const clientIp = await getClientIp(req);

    const [category, paymentStatus, terms] = await Promise.all([
      prisma.globalCategory.findUnique({ where: { category_id } }),
      prisma.globalPaymentStatus.findUnique({ where: { id: payment_status_id } }),
      prisma.globalTerms.findUnique({ where: { id: terms_id } })
    ]);
    if (!category || !paymentStatus || !terms) {
      return NextResponse.json({ error: 'Invalid global ID(s) provided.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
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

      // Preserve time when updating transaction_date
      const updatedTransactionDate = (() => {
        if (!transaction_date) return existingReceipt.transaction_date;
        
        const inputDate = new Date(transaction_date);
        
        // Check if the time is midnight (indicating only date was provided)
        if (inputDate.getHours() === 0 && inputDate.getMinutes() === 0 && inputDate.getSeconds() === 0) {
          // Keep existing time if available, otherwise use current time
          const existingTime = existingReceipt.transaction_date;
          inputDate.setHours(existingTime.getHours(), existingTime.getMinutes(), existingTime.getSeconds(), existingTime.getMilliseconds());
        }
        
        return inputDate;
      })();

      const updatedReceipt = await tx.receipt.update({
        where: { receipt_id: id },
        data: {
          supplier,
          transaction_date: updatedTransactionDate,
          vat_reg_tin,
          terms_id,
          date_paid: date_paid ? new Date(date_paid) : null,
          payment_status_id,
          total_amount,
          vat_amount,
          total_amount_due,
          category_id,
          remarks,
          updated_at: new Date(),
          updated_by: updated_by || 'ftms_user'
        },
      });

    if (items && items.length > 0) {
      // Soft delete items that are marked for deletion
      if (deleted_items && deleted_items.length > 0) {
        console.log('Backend received deleted_items:', deleted_items);
        console.log('Backend received items:', items);
        
        // Filter out any temporary IDs that might have slipped through
        const validDeletedItems = deleted_items.filter((id: string) => !id.startsWith('temp-'));
        
        if (validDeletedItems.length > 0) {
          const updateResult = await tx.receiptItem.updateMany({
            where: {
              receipt_item_id: { in: validDeletedItems },
              receipt_id: id
            },
            data: {
              is_deleted: true,
              updated_at: new Date(),
              updated_by: updated_by || 'ftms_user'
            }
          });
          
          console.log('Updated receipt items for soft delete:', updateResult);

          // Also soft delete associated item transactions
          const deletedReceiptItems = await tx.receiptItem.findMany({
            where: { receipt_item_id: { in: validDeletedItems } },
            select: { item_id: true }
          });
          
          if (deletedReceiptItems.length > 0) {
            const itemIds = deletedReceiptItems.map(item => item.item_id);
            const transactionUpdateResult = await tx.itemTransaction.updateMany({
              where: {
                receipt_id: id,
                item_id: { in: itemIds }
              },
              data: {
                is_deleted: true,
                updated_at: new Date()
              }
            });
            
            console.log('Updated item transactions for soft delete:', transactionUpdateResult);
          }
        } else {
          console.log('No valid deleted_items after filtering out temporary IDs');
        }
      } else {
        console.log('No deleted_items received or empty array');
      }

      // Process items (create new ones or update existing ones)
      await Promise.all(items.map(async (item: ReceiptItemPayload) => {
        console.log('Processing item:', item);
        console.log('Item receipt_item_id:', item.receipt_item_id);
        console.log('Is existing item?', item.receipt_item_id && !item.receipt_item_id.startsWith('temp-'));
        
        // Validate unit and category exist
        const [unitExists, catExists] = await Promise.all([
          tx.globalItemUnit.findUnique({ where: { id: item.unit_id } }),
          tx.globalCategory.findUnique({ where: { category_id: item.category_id } }),
        ]);
        if (!unitExists || !catExists) {
          throw new Error('Invalid unit/category ID');
        }

        // Create or update master item
        const masterItem = await tx.item.upsert({
          where: { item_name: item.item_name },
          create: {
            item_id: await generateId('ITM'),
            item_name: item.item_name,
            unit_id: item.unit_id,
            category_id: item.category_id,
            created_at: new Date(),
            is_deleted: false
          },
          update: {
            unit_id: item.unit_id,
            category_id: item.category_id,
            updated_at: new Date(),
            is_deleted: false
          }
        });

        // Check if this is an existing item (has receipt_item_id) or a new item
        if (item.receipt_item_id && !item.receipt_item_id.startsWith('temp-')) {
          console.log('Updating existing item with receipt_item_id:', item.receipt_item_id);
          // Update existing item
          await tx.receiptItem.update({
            where: { receipt_item_id: item.receipt_item_id },
            data: {
              item_id: masterItem.item_id,
              quantity: new Prisma.Decimal(item.quantity),
              unit_price: new Prisma.Decimal(item.unit_price),
              total_price: new Prisma.Decimal(item.total_price),
              updated_at: new Date(),
              updated_by: updated_by || 'ftms_user',
              is_deleted: false
            }
          });
        } else {
          console.log('Creating new item');
          // Create new receipt item
          await tx.receiptItem.create({
            data: {
              receipt_item_id: await generateId('RCI'),
              receipt_id: id,
              item_id: masterItem.item_id,
              quantity: new Prisma.Decimal(item.quantity),
              unit_price: new Prisma.Decimal(item.unit_price),
              total_price: new Prisma.Decimal(item.total_price),
              created_by: updated_by || 'ftms_user',
              created_at: new Date(),
              is_deleted: false
            }
          });

          // Create new item transaction for new items only
          await tx.itemTransaction.create({
            data: {
              transaction_id: await generateId('ITX'),
              item_id: masterItem.item_id,
              receipt_id: id,
              quantity: new Prisma.Decimal(item.quantity),
              unit_price: new Prisma.Decimal(item.unit_price),
              transaction_date: updatedTransactionDate,
              created_by: updated_by || 'ftms_user',
              created_at: new Date(),
              is_deleted: false
            }
          });
        }
      }));
    }

    const newItems = await tx.receiptItem.findMany({
      where: { receipt_id: id },
      include: { item: true }
    });

    const auditDetails = {
      previous_values: {
        ...existingReceipt,
        items: existingReceipt.items.map(i => ({...i, ...i.item}))
      },
      new_values: {
        ...updatedReceipt,
        items: newItems.map(i => ({...i, ...i.item}))
      }
    }

    await tx.auditLog.create({
      data: {
        log_id: await generateId('LOG'),
        action: 'UPDATE',
        table_affected: 'Receipt',
        record_id: id,
        performed_by: updated_by || 'ftms_user',
        ip_address: clientIp,
        details: JSON.parse(JSON.stringify(auditDetails, (key, value) =>
          typeof value === 'bigint' ? value.toString() :
          value instanceof Prisma.Decimal ? value.toNumber() :
          value
        )),
      },
    });

    return updatedReceipt;
  });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating receipt:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to update receipt: ' + errorMessage }, { status: 500 });
  }
}

// ...existing code...

// DELETE /api/receipts/[id]
// DELETE /api/receipts/[id]
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.pathname.split('/').pop()!;
    const body = await req.json();
    const { reason } = body;

    const clientIp = await getClientIp(req);

    await prisma.$transaction(async (tx) => {
      // Check if receipt exists
      const existingReceipt = await tx.receipt.findUnique({
        where: { receipt_id: id, is_deleted: false },
        include: {
          items: true,
          expense: true
        }
      });

      if (!existingReceipt) {
        throw new Error('Receipt not found or already deleted');
      }

      // Soft delete the receipt
      await tx.receipt.update({
        where: { receipt_id: id },
        data: {
          is_deleted: true,
          deleted_at: new Date(),
          deleted_by: 'ftms_user',
          deletion_reason: reason || null,
          updated_at: new Date(),
          updated_by: 'ftms_user'
        },
      });

      // Soft delete associated receipt items
      await tx.receiptItem.updateMany({
        where: { receipt_id: id },
        data: {
          is_deleted: true,
          updated_at: new Date(),
          updated_by: 'ftms_user'
        }
      });

      // Soft delete associated item transactions
      await tx.itemTransaction.updateMany({
        where: { receipt_id: id },
        data: {
          is_deleted: true,
          updated_at: new Date()
        }
      });

      // If there's an associated expense record, soft delete it too
      if (existingReceipt.expense) {
        await tx.expenseRecord.update({
          where: { expense_id: existingReceipt.expense.expense_id },
          data: {
            is_deleted: true,
            updated_at: new Date()
          }
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          log_id: await generateId('LOG'),
          action: 'DELETE',
          table_affected: 'Receipt',
          record_id: id,
          performed_by: 'ftms_user',
          ip_address: clientIp,
          details: JSON.parse(JSON.stringify({
            deleted_receipt: {
              ...existingReceipt,
              deletion_reason: reason
            }
          }, (key, value) =>
            typeof value === 'bigint' ? value.toString() :
            value instanceof Prisma.Decimal ? value.toNumber() :
            value
          )),
        },
      });
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Receipt deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to delete receipt: ' + errorMessage }, 
      { status: 500 }
    );
  }
}