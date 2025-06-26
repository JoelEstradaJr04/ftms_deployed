import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  void request; // Unused parameter, but kept for consistency with the original code
  try {
    const receipts = await prisma.receipt.findMany({
      where: {
        is_deleted: false,
        items: {
          some: {
            is_deleted: false,
            is_inventory_processed: false,
            item: {
              is_deleted: false,
              unit: { is_deleted: false },
              category: { is_deleted: false }
            }
          }
        }
      },
      orderBy: {
        transaction_date: 'desc'
      },
      select: {
        transaction_date: true,
         items: {
          where: {
            is_deleted: false,
            is_inventory_processed: false,
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
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Format response: hide IDs, return only item details
    const formatted = receipts.map(receipt => ({
      transaction_date: receipt.transaction_date,
      items: receipt.items.map(item => ({
        item_name: item.item.item_name,
        unit: item.item.unit.name,
        quantity: parseFloat(item.quantity.toString())
      }))
    }));

    return Response.json({
      success: true,
      data: formatted
    });

  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch inventory items' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
