// app/api/inventory/receipt-items.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const receiptId = searchParams.get('receipt_id'); // optional

  try {
    const receipts = await prisma.receipt.findMany({
      where: {
        is_deleted: false,
        ...(receiptId ? { receipt_id: receiptId } : {}),
        items: {
          some: {
            is_deleted: false,
            item: {
              is_deleted: false,
              unit: { is_deleted: false },
              category: { is_deleted: false }
            }
          }
        }
      },
      select: {
        transaction_date: true,
        items: {
          where: {
            is_deleted: false,
            item: {
              is_deleted: false,
              unit: { is_deleted: false },
              category: { is_deleted: false }
            }
          },
          select: {
            quantity: true,
            item: {
              select: {
                item_name: true,
                unit: {
                  select: { name: true }
                }
              }
            }
          }
        }
      },
      orderBy: {
        transaction_date: 'desc'
      }
    });

    const formatted = receipts.map(receipt => ({
      transaction_date: receipt.transaction_date,
      items: receipt.items.map(entry => ({
        item_name: entry.item.item_name,
        unit_name: entry.item.unit?.name || null,
        quantity: parseFloat(entry.quantity.toString())
      }))
    }));

    return Response.json({ success: true, data: formatted });

  } catch (error) {
    console.error('Inventory fetch error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Inventory fetch failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
