import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const receiptItems = await prisma.receiptItem.findMany({
    include: { item: true }
  });

  for (const ri of receiptItems) {
    // If already migrated, skip
    if (ri.item_id) continue;

    // Find or create the Item
    const item = await prisma.item.upsert({
      where: { item_name: ri.item_name },
      update: {},
      create: {
        item_name: ri.item_name,
        unit: ri.unit,
        category: ri.category || 'Other', // fallback if missing
        created_at: new Date(),
        is_deleted: false,
      },
    });

    // Update ReceiptItem to reference the Item
    await prisma.receiptItem.update({
      where: { receipt_item_id: ri.receipt_item_id },
      data: {
        item_id: item.item_id,
      },
    });
  }

  // Optionally, update ItemTransaction similarly if needed
  const itemTransactions = await prisma.itemTransaction.findMany({ include: { item: true } });
  for (const tx of itemTransactions) {
    if (tx.item_id) continue;
    // Try to find the item by name (if available)
    if (tx.item_name) {
      const item = await prisma.item.findFirst({ where: { item_name: tx.item_name } });
      if (item) {
        await prisma.itemTransaction.update({
          where: { transaction_id: tx.transaction_id },
          data: { item_id: item.item_id },
        });
      }
    }
  }

  console.log('Migration complete!');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 