import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  void request;

  try {
    const transactions = await prisma.itemTransaction.findMany({
      where: {
        is_deleted: false,
        receipt: {
          is_deleted: false,
        },
        item: {
          is_deleted: false,
          unit: {
            is_deleted: false,
          },
          category: {
            is_deleted: false,
          }
        }
      },
      orderBy: {
        transaction_date: 'desc'
      },
      select: {
        transaction_id: true,
        transaction_date: true,
        quantity: true,
        item: {
          select: {
            item_id: true,
            item_name: true,
            unit: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    const formatted = transactions.map(tx => ({
      transaction_id: tx.transaction_id,
      transaction_date: tx.transaction_date,
      item_id: tx.item.item_id,
      item_name: tx.item.item_name,
      item_unit: tx.item.unit.name,
      quantity: parseFloat(tx.quantity.toString())
    }));

    return Response.json({
      success: true,
      data: formatted
    });

  } catch (error) {
    console.error('Error fetching inventory transactions:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch inventory transactions' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
