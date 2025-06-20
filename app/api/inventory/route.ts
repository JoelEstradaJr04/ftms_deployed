// /api/inventory/transactions endpoint
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      page = 1,
      limit = 100,
      startDate,
      endDate,
      itemName,
      category,
      includeSoftDeleted = false
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where conditions
    const whereConditions = {
      // Handle soft-deleted items based on query parameter
      ...(includeSoftDeleted === 'true' ? {} : { is_deleted: false }),
      
      // Date range filter
      ...(startDate || endDate ? {
        transaction_date: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {})
        }
      } : {}),
      
      // Item filters through relations
      item: {
        ...(includeSoftDeleted === 'true' ? {} : { is_deleted: false }),
        ...(itemName ? { item_name: { contains: itemName, mode: 'insensitive' } } : {}),
        ...(category ? { category: category } : {})
      }
    };

    // Main optimized query
    const transactions = await prisma.itemTransaction.findMany({
      where: whereConditions,
      select: {
        transaction_id: true,
        quantity: true,
        transaction_date: true,
        transaction_type: true,
        unit_price: true,
        is_deleted: true,
        item: {
          select: {
            item_id: true,
            item_name: true,
            unit: true,
            category: true,
            other_category: true,
            is_deleted: true
          }
        },
        receipt: {
          select: {
            receipt_id: true,
            supplier: true,
            transaction_date: true
          }
        }
      },
      orderBy: [
        { transaction_date: 'desc' },
        { item: { item_name: 'asc' } }
      ],
      skip,
      take
    });

    // Get total count for pagination
    const totalCount = await prisma.itemTransaction.count({
      where: whereConditions
    });

    // Transform data to match your requirements
    const formattedTransactions = transactions.map(transaction => ({
      transaction_id: transaction.transaction_id,
      item_name: transaction.item.item_name,
      item_unit: transaction.item.unit,
      quantity: parseFloat(transaction.quantity), // Individual transaction quantity only
      item_category: transaction.item.other_category || transaction.item.category,
      transaction_date: transaction.transaction_date,
      transaction_type: transaction.transaction_type,
      unit_price: parseFloat(transaction.unit_price),
      supplier: transaction.receipt?.supplier || null,
      receipt_id: transaction.receipt?.receipt_id || null,
      // Flags for data integrity
      item_soft_deleted: transaction.item.is_deleted,
      transaction_soft_deleted: transaction.is_deleted
    }));

    const response = {
      data: formattedTransactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      },
      metadata: {
        includeSoftDeleted: includeSoftDeleted === 'true',
        filters: {
          startDate,
          endDate,
          itemName,
          category
        }
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Inventory transactions error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch inventory transactions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Alternative query for high-performance scenarios with raw SQL
export async function getInventoryTransactionsRaw(filters = {}) {
  const {
    startDate,
    endDate,
    itemName,
    category,
    includeSoftDeleted = false,
    limit = 100,
    offset = 0
  } = filters;

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  // Build dynamic WHERE clause
  if (!includeSoftDeleted) {
    whereClause += ` AND it.is_deleted = false AND i.is_deleted = false`;
  }

  if (startDate) {
    whereClause += ` AND it.transaction_date >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND it.transaction_date <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  if (itemName) {
    whereClause += ` AND i.item_name ILIKE $${paramIndex}`;
    params.push(`%${itemName}%`);
    paramIndex++;
  }

  if (category) {
    whereClause += ` AND i.category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  const query = `
    SELECT 
      it.transaction_id,
      i.item_name,
      i.unit as item_unit,
      it.quantity,
      COALESCE(i.other_category, i.category::text) as item_category,
      it.transaction_date,
      it.transaction_type,
      it.unit_price,
      r.supplier,
      r.receipt_id,
      i.is_deleted as item_soft_deleted,
      it.is_deleted as transaction_soft_deleted
    FROM "ItemTransaction" it
    JOIN "Item" i ON it.item_id = i.item_id
    LEFT JOIN "Receipt" r ON it.receipt_id = r.receipt_id
    ${whereClause}
    ORDER BY it.transaction_date DESC, i.item_name ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);

  return await prisma.$queryRawUnsafe(query, ...params);
}