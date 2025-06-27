import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  void request;
  try {
    // Get all unprocessed receipt items first
    const unprocessedReceiptItems = await prisma.receiptItem.findMany({
      where: {
        is_inventory_processed: false,
        is_deleted: false,
        receipt: {
          is_deleted: false
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
      select: {
        receipt_id: true,
        item_id: true
      }
    });

    // Get transactions that match these unprocessed receipt items
    const transactions = await prisma.itemTransaction.findMany({
      where: {
        is_deleted: false,
        OR: unprocessedReceiptItems.map(item => ({
          receipt_id: item.receipt_id,
          item_id: item.item_id
        }))
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

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { transaction_ids } = body;

    // Validate input
    if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'transaction_ids array is required and cannot be empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!transaction_ids.every(id => typeof id === 'string')) {
      return new Response(
        JSON.stringify({ success: false, error: 'All transaction_ids must be strings' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch relevant transactions - only need item_id and receipt_id for the update
    const transactions = await prisma.itemTransaction.findMany({
      where: {
        transaction_id: { in: transaction_ids },
        is_deleted: false,
        receipt: {
          is_deleted: false
        }
      },
      select: {
        transaction_id: true,
        item_id: true,
        receipt_id: true
      }
    });

    const foundIds = transactions.map(tx => tx.transaction_id);
    const missingIds = transaction_ids.filter(id => !foundIds.includes(id));

    if (missingIds.length > 0) {
      return new Response(
        JSON.stringify({ success: false, error: `Transaction IDs not found: ${missingIds.join(', ')}` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Filter out transactions without receipt_id (shouldn't happen based on schema, but safety check)
    const validTransactions = transactions.filter(tx => tx.receipt_id);

    if (validTransactions.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No valid receipt transactions found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepare updates on receiptItem using the unique constraint
    const updateOps = validTransactions.map(tx =>
      prisma.receiptItem.update({
        where: {
          receipt_id_item_id: {
            receipt_id: tx.receipt_id!,
            item_id: tx.item_id
          }
        },
        data: {
          is_inventory_processed: true
        }
      })
    );

    await prisma.$transaction(updateOps);

    return Response.json({
      success: true,
      message: `Marked ${validTransactions.length} transaction(s) as inventory processed`,
      processed_transaction_ids: validTransactions.map(tx => tx.transaction_id)
    });

  } catch (error) {
    console.error('Error updating inventory processed status:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to update inventory processed status' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
<<<<<<< Updated upstream
=======


// export async function PATCH(request: Request) {
//   try {
//     const body = await request.json();
//     const { transaction_ids, mode } = body;

//     if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) {
//       return new Response(
//         JSON.stringify({ success: false, error: 'transaction_ids array is required and cannot be empty' }),
//         { status: 400, headers: { 'Content-Type': 'application/json' } }
//       );
//     }

//     const transactions = await prisma.itemTransaction.findMany({
//       where: {
//         transaction_id: { in: transaction_ids },
//         is_deleted: false,
//         receipt: {
//           is_deleted: false
//         }
//       },
//       select: {
//         transaction_id: true,
//         item_id: true,
//         receipt_id: true
//       }
//     });

//     const foundIds = transactions.map(tx => tx.transaction_id);
//     const missingIds = transaction_ids.filter(id => !foundIds.includes(id));

//     if (missingIds.length > 0) {
//       return new Response(
//         JSON.stringify({ success: false, error: `Transaction IDs not found: ${missingIds.join(', ')}` }),
//         { status: 404, headers: { 'Content-Type': 'application/json' } }
//       );
//     }

//     const validTransactions = transactions.filter(tx => tx.receipt_id);

//     if (validTransactions.length === 0) {
//       return new Response(
//         JSON.stringify({ success: false, error: 'No valid receipt transactions found' }),
//         { status: 400, headers: { 'Content-Type': 'application/json' } }
//       );
//     }

//     // Choose the flag based on the mode
//     const flagValue = mode === 'reset' ? false : true;

//     const updateOps = validTransactions.map(tx =>
//       prisma.receiptItem.update({
//         where: {
//           receipt_id_item_id: {
//             receipt_id: tx.receipt_id!,
//             item_id: tx.item_id
//           }
//         },
//         data: {
//           is_inventory_processed: flagValue
//         }
//       })
//     );

//     await prisma.$transaction(updateOps);

//     return Response.json({
//       success: true,
//       message: `Marked ${validTransactions.length} transaction(s) as inventory ${mode === 'reset' ? 'UNPROCESSED' : 'processed'}`,
//       processed_transaction_ids: validTransactions.map(tx => tx.transaction_id)
//     });

//   } catch (error) {
//     console.error('Error updating inventory processed status:', error);
//     return new Response(
//       JSON.stringify({ success: false, error: 'Failed to update inventory processed status' }),
//       { status: 500, headers: { 'Content-Type': 'application/json' } }
//     );
//   }
// }
>>>>>>> Stashed changes
