// migrate_categories_sources.js
// Run this script after deploying the new schema to backfill GlobalCategory/GlobalSource and update all records.

let prisma;
async function getPrisma() {
  if (!prisma) {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

async function main() {
  const prisma = await getPrisma();
  // 1. Gather all unique categories and sources from legacy tables
  const expenseCategories = await prisma.expenseRecord.findMany({
    select: { legacy_category: true },
    distinct: ['legacy_category'],
  });
  const revenueCategories = await prisma.revenueRecord.findMany({
    select: { legacy_category: true },
    distinct: ['legacy_category'],
  });
  const itemCategories = await prisma.item.findMany({
    select: { legacy_category: true },
    distinct: ['legacy_category'],
  });
  const receiptCategories = await prisma.receipt.findMany({
    select: { legacy_category: true },
    distinct: ['legacy_category'],
  });
  const allCategories = [
    ...expenseCategories.map(c => c.legacy_category),
    ...revenueCategories.map(c => c.legacy_category),
    ...itemCategories.map(c => c.legacy_category),
    ...receiptCategories.map(c => c.legacy_category),
  ];
  const uniqueCategories = [...new Set(allCategories.filter(Boolean))];

  // 2. Gather all unique sources (if any)
  const expenseSources = await prisma.expenseRecord.findMany({
    select: { legacy_source: true },
    distinct: ['legacy_source'],
  });
  const revenueSources = await prisma.revenueRecord.findMany({
    select: { legacy_source: true },
    distinct: ['legacy_source'],
  });
  const receiptSources = await prisma.receipt.findMany({
    select: { legacy_source: true },
    distinct: ['legacy_source'],
  });
  const allSources = [
    ...expenseSources.map(s => s.legacy_source),
    ...revenueSources.map(s => s.legacy_source),
    ...receiptSources.map(s => s.legacy_source),
  ];
  const uniqueSources = [...new Set(allSources.filter(Boolean))];

  // 3. Insert categories into GlobalCategory
  const categoryMap = {};
  for (const name of uniqueCategories) {
    let cat = await prisma.globalCategory.findFirst({ where: { name } });
    if (!cat) {
      cat = await prisma.globalCategory.create({
        data: {
          name,
          applicable_modules: ['expense', 'revenue', 'item', 'receipt'],
        },
      });
    }
    categoryMap[name] = cat.category_id;
  }

  // 4. Insert sources into GlobalSource
  const sourceMap = {};
  for (const name of uniqueSources) {
    let src = await prisma.globalSource.findFirst({ where: { name } });
    if (!src) {
      src = await prisma.globalSource.create({
        data: {
          name,
          applicable_modules: ['expense', 'revenue', 'receipt'],
        },
      });
    }
    sourceMap[name] = src.source_id;
  }

  // 5. Update all records to use category_id/source_id
  // ExpenseRecord
  await Promise.all(
    (await prisma.expenseRecord.findMany()).map(async (rec) => {
      const category_id = categoryMap[rec.legacy_category];
      const source_id = rec.legacy_source ? sourceMap[rec.legacy_source] : null;
      await prisma.expenseRecord.update({
        where: { expense_id: rec.expense_id },
        data: { category_id, source_id },
      });
    })
  );
  // RevenueRecord
  await Promise.all(
    (await prisma.revenueRecord.findMany()).map(async (rec) => {
      const category_id = categoryMap[rec.legacy_category];
      const source_id = rec.legacy_source ? sourceMap[rec.legacy_source] : null;
      await prisma.revenueRecord.update({
        where: { revenue_id: rec.revenue_id },
        data: { category_id, source_id },
      });
    })
  );
  // Item
  await Promise.all(
    (await prisma.item.findMany()).map(async (rec) => {
      const category_id = categoryMap[rec.legacy_category];
      await prisma.item.update({
        where: { item_id: rec.item_id },
        data: { category_id },
      });
    })
  );
  // Receipt
  await Promise.all(
    (await prisma.receipt.findMany()).map(async (rec) => {
      const category_id = categoryMap[rec.legacy_category];
      const source_id = rec.legacy_source ? sourceMap[rec.legacy_source] : null;
      await prisma.receipt.update({
        where: { receipt_id: rec.receipt_id },
        data: { category_id, source_id },
      });
    })
  );

  console.log('Migration complete. Categories:', Object.keys(categoryMap).length, 'Sources:', Object.keys(sourceMap).length);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect()); 