// app/api/assignments/cache/route.ts
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// Local type for cache population
type AssignmentSupabase = {
  assignment_id: string;
  bus_route: string;
  date_assigned: string;
  trip_fuel_expense: number;
  trip_revenue: number;
  is_expense_recorded: boolean;
  is_revenue_recorded: boolean;
  assignment_type: string;
  assignment_value: number;
  payment_method: string;
  driver_id: string;
  conductor_id: string;
  bus_plate_number: string;
  bus_type: string;
};

// GET - Return all cached assignments
export async function GET() {
  try {
    // First try to get from cache
    let cachedAssignments = await prisma.assignmentCache.findMany();
    
    // If cache is empty, fetch from Supabase and populate cache
    if (!cachedAssignments || cachedAssignments.length === 0) {
      const { data: supabaseData, error: supabaseError } = await supabase
        .from('op_bus_assignments')
        .select('*');

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      // Populate cache with Supabase data
      await prisma.assignmentCache.createMany({
        data: (supabaseData as AssignmentSupabase[]).map((assignment) => ({
          assignment_id: assignment.assignment_id,
          bus_route: assignment.bus_route,
          date_assigned: new Date(assignment.date_assigned),
          trip_fuel_expense: assignment.trip_fuel_expense,
          trip_revenue: assignment.trip_revenue,
          is_expense_recorded: assignment.is_expense_recorded,
          is_revenue_recorded: assignment.is_revenue_recorded,
          assignment_type: assignment.assignment_type,
          assignment_value: assignment.assignment_value,
          payment_method: assignment.payment_method,
          driver_id: assignment.driver_id,
          conductor_id: assignment.conductor_id,
          bus_plate_number: assignment.bus_plate_number,
          bus_type: assignment.bus_type,
        }))
      });

      // Get the newly cached assignments
      cachedAssignments = await prisma.assignmentCache.findMany();
    }

    return NextResponse.json({ data: cachedAssignments });
  } catch (error) {
    console.error('Error checking/populating cache:', error);
    return NextResponse.json({ error: 'Failed to get assignments' }, { status: 500 });
  }
}

// POST - Update cache with new assignments
export async function POST() {
  try {
    const { data: supabaseData, error: supabaseError } = await supabase
      .from('op_bus_assignments')
      .select('*');

    if (supabaseError) {
      throw new Error(supabaseError.message);
    }

    // Begin transaction
    await prisma.$transaction(async (tx) => {
      // Clear existing cache
      await tx.assignmentCache.deleteMany({});

      // Insert new cache entries
      await tx.assignmentCache.createMany({
        data: (supabaseData as AssignmentSupabase[]).map((assignment) => ({
          assignment_id: assignment.assignment_id,
          bus_route: assignment.bus_route,
          date_assigned: new Date(assignment.date_assigned),
          trip_fuel_expense: assignment.trip_fuel_expense,
          trip_revenue: assignment.trip_revenue,
          is_expense_recorded: assignment.is_expense_recorded,
          is_revenue_recorded: assignment.is_revenue_recorded,
          assignment_type: assignment.assignment_type,
          assignment_value: assignment.assignment_value,
          payment_method: assignment.payment_method,
          driver_id: assignment.driver_id,
          conductor_id: assignment.conductor_id,
          bus_plate_number: assignment.bus_plate_number,
          bus_type: assignment.bus_type,
        }))
      });
    });

    const updatedCache = await prisma.assignmentCache.findMany();
    return NextResponse.json({ data: updatedCache });
  } catch (error) {
    console.error('Error updating cache:', error);
    return NextResponse.json({ error: 'Failed to update cache' }, { status: 500 });
  }
}