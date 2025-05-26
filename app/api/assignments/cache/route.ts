// app/api/assignments/cache/route.ts
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import type { Assignment } from '@/lib/supabase/assignments'

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
        data: supabaseData.map((assignment: Assignment) => ({
          assignment_id: assignment.assignment_id,
          bus_bodynumber: assignment.bus_bodynumber,
          bus_platenumber: assignment.bus_platenumber,
          bus_route: assignment.bus_route,
          bus_type: assignment.bus_type,
          driver_name: assignment.driver_name,
          conductor_name: assignment.conductor_name,
          date_assigned: new Date(assignment.date_assigned),
          trip_fuel_expense: assignment.trip_fuel_expense,
          trip_revenue: assignment.trip_revenue,
          is_revenue_recorded: assignment.is_revenue_recorded,
          assignment_type: assignment.assignment_type
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
        data: supabaseData.map((assignment: Assignment) => ({
          assignment_id: assignment.assignment_id,
          bus_bodynumber: assignment.bus_bodynumber,
          bus_platenumber: assignment.bus_platenumber,
          bus_route: assignment.bus_route,
          bus_type: assignment.bus_type,
          driver_name: assignment.driver_name,
          conductor_name: assignment.conductor_name,
          date_assigned: new Date(assignment.date_assigned),
          trip_fuel_expense: assignment.trip_fuel_expense,
          trip_revenue: assignment.trip_revenue,
          is_revenue_recorded: assignment.is_revenue_recorded,
          assignment_type: assignment.assignment_type
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