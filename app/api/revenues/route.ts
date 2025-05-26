// api\revenues\route.ts

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAssignmentById } from '@/lib/supabase/assignments'
import { generateId } from '@/lib/idGenerator'
import type { NextRequest } from 'next/server'
import { logAudit } from '@/lib/auditLogger'

export async function POST(req: NextRequest) {
  const data = await req.json();
  // Add other_source to the destructured properties
  const { assignment_id, category, total_amount, collection_date, created_by, other_source } = data;

  try {
    let finalAmount = total_amount;

    if (assignment_id) {
      const duplicate = await prisma.revenueRecord.findFirst({
        where: {
          assignment_id,
          collection_date: new Date(collection_date),
        },
      });

      if (duplicate) {
        console.log(`Duplicate record found for assignment_id: ${assignment_id} on collection_date: ${collection_date}`);
        return NextResponse.json(
          { error: 'Revenue record for this assignment and collection_date already exists.' },
          { status: 409 }
        );
      }

      const assignmentData = await getAssignmentById(assignment_id);
      if (!assignmentData || assignmentData.trip_revenue == null) {
        console.log(`Assignment not found or missing trip_revenue for assignment_id: ${assignment_id}`);
        return NextResponse.json(
          { error: 'Assignment not found or missing trip_revenue in Supabase' },
          { status: 404 }
        );
      }

      finalAmount = assignmentData.trip_revenue;
    }

    const newRevenue = await prisma.revenueRecord.create({
      data: {
        revenue_id: await generateId('REV'),
        assignment_id: assignment_id ?? null,
        category,
        total_amount: finalAmount,
        collection_date: new Date(collection_date),
        created_by,
        created_at: new Date(),
        updated_at: null,
        is_deleted: false,
        other_source: category === 'Other' ? other_source : null // Now properly defined
      }
    });

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

export async function GET() {
  const revenues = await prisma.revenueRecord.findMany({ 
    where: { is_deleted: false },
    orderBy: { created_at: 'desc' }
  })
  return NextResponse.json(revenues)
}