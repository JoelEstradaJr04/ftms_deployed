// lib\supabase\assignments.ts
import { supabase } from './client'

export type Assignment = {
  assignment_id: string
  bus_bodynumber: string
  bus_platenumber: string
  bus_route: 'S. Palay to PITX' | 'S. Palay to Sta. Cruz'
  bus_type: 'Airconditioned' | 'Ordinary'
  driver_name: string
  conductor_name: string
  date_assigned: string
  trip_fuel_expense: number
  trip_revenue: number
  is_recorded: boolean
  assignment_type: 'Boundary' | 'Percentage' | 'Bus_Rental'
}

// Base URL for API calls
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Function to check cache and get assignments
async function getAssignmentsFromCache(): Promise<Assignment[] | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/assignments/cache`);
    if (!response.ok) return null;
    
    const { data } = await response.json();
    if (!data) return null;

    return data.map((assignment: Assignment) => ({
      assignment_id: assignment.assignment_id,
      bus_bodynumber: assignment.bus_bodynumber,
      bus_platenumber: assignment.bus_platenumber,
      bus_route: assignment.bus_route as 'S. Palay to PITX' | 'S. Palay to Sta. Cruz',
      bus_type: assignment.bus_type as 'Airconditioned' | 'Ordinary',
      driver_name: assignment.driver_name,
      conductor_name: assignment.conductor_name,
      date_assigned: new Date(assignment.date_assigned).toISOString(),
      trip_fuel_expense: Number(assignment.trip_fuel_expense),
      trip_revenue: Number(assignment.trip_revenue),
      is_recorded: assignment.is_recorded,
      assignment_type: assignment.assignment_type as 'Boundary' | 'Percentage' | 'Bus_Rental'
    }));
  } catch (error) {
    console.error('Error fetching from cache:', error);
    return null;
  }
}

// Function to update cache
async function updateCache(): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/api/assignments/cache`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to update cache');
    }
  } catch (error) {
    console.error('Error updating cache:', error);
    throw error;
  }
}

export async function getAssignmentById(id: string): Promise<Assignment | null> {
  try {
    // Try cache first
    const cachedAssignments = await getAssignmentsFromCache();
    if (cachedAssignments) {
      const cachedAssignment = cachedAssignments.find(a => a.assignment_id === id);
      if (cachedAssignment) return cachedAssignment;
    }

    // If not in cache or cache miss, fetch from Supabase
    const { data, error } = await supabase
      .from('op_bus_assignments')
      .select('*')
      .eq('assignment_id', id)
      .single();

    if (error) {
      console.error('Failed to fetch assignment from Supabase:', error);
      return null;
    }

    // Update cache with all assignments
    await updateCache();

    return data ? {
      ...data,
      trip_fuel_expense: Number(data.trip_fuel_expense),
      trip_revenue: Number(data.trip_revenue)
    } as Assignment : null;
  } catch (error) {
    console.error('Error in getAssignmentById:', error);
    return null;
  }
}

export async function getAllAssignments(): Promise<Assignment[]> {
  try {
    // Try cache first
    const cachedAssignments = await getAssignmentsFromCache();
    if (cachedAssignments) {
      // For UI dropdown, only return unrecorded assignments
      return cachedAssignments.filter(a => !a.is_recorded);
    }

    // If cache miss, fetch from Supabase
    const { data, error } = await supabase
      .from('op_bus_assignments')
      .select('*')
      .eq('is_recorded', false);

    if (error) {
      throw new Error(error.message);
    }

    // Update cache with all assignments
    await updateCache();

    return data.map(assignment => ({
      ...assignment,
      trip_fuel_expense: Number(assignment.trip_fuel_expense),
      trip_revenue: Number(assignment.trip_revenue)
    })) as Assignment[];
  } catch (error) {
    console.error('Error fetching assignments:', error);
    throw error;
  }
}

export async function updateAssignmentIsRecorded(id: string, is_recorded: boolean) {
  try {
    const { data, error } = await supabase
      .from('op_bus_assignments')
      .update({ is_recorded })
      .eq('assignment_id', id)
      .select();

    if (error) {
      throw new Error(`Failed to update is_recorded: ${error.message}`);
    }

    // Update cache to reflect the change
    await updateCache();

    return data;
  } catch (error) {
    console.error('Error updating assignment:', error);
    throw error;
  }
}

export async function refreshAssignmentsCache() {
  await updateCache();
  return await getAllAssignments();
}