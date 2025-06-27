// api\revenues\route.ts

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAssignmentById } from '@/lib/operations/assignments'
import { generateId } from '@/lib/idGenerator'
import type { NextRequest } from 'next/server'
import { logAudit } from '@/lib/auditLogger'

export async function POST(req: NextRequest) {
  const data = await req.json();
  const { assignment_id, category_id, total_amount, collection_date, created_by } = data;

  try {
    let finalAmount = total_amount;
    let assignmentData = null;

    // --- ANTI-DUPLICATE LOGIC ---
    if (assignment_id) {
      // Check for duplicate revenue record for the same assignment and collection_date
      const duplicate = await prisma.revenueRecord.findFirst({
        where: {
          assignment_id,
          collection_date: new Date(collection_date),
          // Optionally, also check category_id if needed
          category_id,
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'Revenue record for this assignment and collection_date already exists.' },
          { status: 409 }
        );
      }
      assignmentData = await getAssignmentById(assignment_id);
      if (!assignmentData) {
        return NextResponse.json(
          { error: 'Assignment not found in Operations API' },
          { status: 404 }
        );
      }
      if (assignmentData.trip_revenue == null || assignmentData.trip_revenue === undefined) {
        return NextResponse.json(
          { error: 'Assignment found but missing trip_revenue in Operations API' },
          { status: 400 }
        );
      }
      finalAmount = assignmentData.trip_revenue;
    } else {
      // For non-assignment revenues, check for duplicate by category, amount, and date
      const duplicate = await prisma.revenueRecord.findFirst({
        where: {
          category_id,
          total_amount: finalAmount,
          collection_date: new Date(collection_date),
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'Revenue record for this category, amount and collection_date already exists.' },
          { status: 409 }
        );
      }
    }

    const newRevenue = await prisma.revenueRecord.create({
      data: {
        revenue_id: await generateId('REV'),
        assignment_id: assignment_id ?? null,
        category_id,
        source_id: null,
        total_amount: finalAmount,
        collection_date: new Date(collection_date),
        created_by,
        created_at: new Date(),
        updated_at: null,
        is_deleted: false,
      },
      include: {
        category: true,
        source: true,
      }
    });

    // PATCH to Operations API to set IsRevenueRecorded is intentionally omitted. See FTMS issue: assignments are not marked as recorded to keep assignment data available for mapping.

    await logAudit({
      action: 'CREATE',
      table_affected: 'RevenueRecord',
      record_id: newRevenue.revenue_id,
      performed_by: created_by,
      details: `Created revenue record with amount ₱${finalAmount}`,
    });

    return NextResponse.json(newRevenue);
  } catch (error) {
    console.error('Failed to create revenue:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const dateFilter = searchParams.get('dateFilter');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  let dateCondition = {};

  if (dateFilter) {
    const now = new Date();
    switch (dateFilter) {
      case 'Day':
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        dateCondition = {
          collection_date: {
            gte: startOfDay,
            lt: endOfDay
          }
        };
        break;
      case 'Month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        dateCondition = {
          collection_date: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        };
        break;
      case 'Year':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        dateCondition = {
          collection_date: {
            gte: startOfYear,
            lte: endOfYear
          }
        };
        break;
    }
  } else if (dateFrom && dateTo) {
    dateCondition = {
      collection_date: {
        gte: new Date(dateFrom),
        lte: new Date(dateTo)
      }
    };
  }

  const revenues = await prisma.revenueRecord.findMany({ 
    where: { 
      is_deleted: false,
      ...dateCondition
    },
    include: {
      category: true,
      source: true,
    },
    orderBy: { created_at: 'desc' }
  });
  
  return NextResponse.json(revenues);
}