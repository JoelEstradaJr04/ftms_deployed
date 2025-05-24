// api\revenues\[id]\route.ts

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAssignmentById } from '@/lib/supabase/assignments'
import { generateId } from '@/lib/idGenerator'
import type { NextRequest } from 'next/server'
import { logAudit } from '@/lib/auditLogger'

export async function POST(req: NextRequest) {
  const data = await req.json();
  const { assignment_id, category, total_amount, date, created_by } = data;

  try {
    let finalAmount = total_amount;

    if (assignment_id) {
      const duplicate = await prisma.revenueRecord.findFirst({
        where: {
          assignment_id,
          date: new Date(date),
        },
      });

      if (duplicate) {
        console.log(`Duplicate record found for assignment_id: ${assignment_id} on date: ${date}`);
        return NextResponse.json(
          { error: 'Revenue record for this assignment and date already exists.' },
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
        revenue_id: await generateId('rev'),
        assignment_id: assignment_id ?? null,
        category,
        total_amount: finalAmount,
        date: new Date(date),
        created_by,
        created_at: new Date(),
        updated_at: null,
        isDeleted: false,
      },
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
    
    // Type guard to check if error is an instance of Error
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  const revenues = await prisma.revenueRecord.findMany({ 
    where: { isDeleted: false },
    orderBy: { created_at: 'desc' }
  })
  return NextResponse.json(revenues)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await req.json();
    const { total_amount, date, other_source } = data;
    const revenue_id = params.id;

    // Get the original record for comparison and validation
    const originalRecord = await prisma.revenueRecord.findUnique({
      where: { revenue_id }
    });

    if (!originalRecord || originalRecord.isDeleted) {
      return NextResponse.json(
        { error: 'Revenue record not found' },
        { status: 404 }
      );
    }

    // If linked to an assignment, get the original trip_revenue for comparison
    let originalTripRevenue = null;
    if (originalRecord.assignment_id) {
      const assignmentData = await getAssignmentById(originalRecord.assignment_id);
      originalTripRevenue = assignmentData?.trip_revenue;
    }

    // Calculate deviation percentage if there's an original trip revenue
    let deviationPercentage = null;
    if (originalTripRevenue !== null && originalTripRevenue !== undefined) {
      deviationPercentage = Math.abs((total_amount - originalTripRevenue) / originalTripRevenue * 100);
    }

    // Update the record
    const updatedRevenue = await prisma.revenueRecord.update({
      where: { revenue_id },
      data: {
        total_amount,
        date: new Date(date),
        other_source: originalRecord.category === 'Other' ? other_source : null,
        updated_at: new Date()
      }
    });

    // Log the audit trail, including deviation information if applicable
    let auditDetails = `Updated revenue record. Amount changed from ₱${originalRecord.total_amount} to ₱${total_amount}.`;
    if (deviationPercentage !== null) {
      auditDetails += ` Deviation from original trip revenue: ${deviationPercentage.toFixed(2)}%`;
    }

    await logAudit({
      action: 'UPDATE',
      table_affected: 'RevenueRecord',
      record_id: revenue_id,
      performed_by: originalRecord.created_by, // Using original creator as the updater
      details: auditDetails,
    });

    return NextResponse.json(updatedRevenue);
  } catch (error) {
    console.error('Failed to update revenue:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const revenue_id = params.id;

    // Get the record before deletion for audit purposes
    const record = await prisma.revenueRecord.findUnique({
      where: { revenue_id }
    });

    if (!record) {
      return NextResponse.json(
        { error: 'Revenue record not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting isDeleted flag
    const deletedRevenue = await prisma.revenueRecord.update({
      where: { revenue_id },
      data: { 
        isDeleted: true,
        updated_at: new Date()
      }
    });

    // Log the deletion in audit trail
    await logAudit({
      action: 'DELETE',
      table_affected: 'RevenueRecord',
      record_id: revenue_id,
      performed_by: record.created_by,
      details: `Soft deleted revenue record with amount ₱${record.total_amount}`,
    });

    return NextResponse.json(deletedRevenue);
  } catch (error) {
    console.error('Failed to delete revenue:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    );
  }
}