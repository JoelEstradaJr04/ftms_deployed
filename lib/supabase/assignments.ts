// lib\supabase\assignments.ts
import { supabase } from './client'

export type Assignment = {
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
  // Add missing fields that are used in formatAssignment
  driver_name?: string;
  conductor_name?: string;
};

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
      bus_route: assignment.bus_route,
      date_assigned: assignment.date_assigned,
      trip_fuel_expense: Number(assignment.trip_fuel_expense),
      trip_revenue: Number(assignment.trip_revenue),
      is_expense_recorded: assignment.is_expense_recorded,
      is_revenue_recorded: assignment.is_revenue_recorded,
      assignment_type: assignment.assignment_type,
      assignment_value: Number(assignment.assignment_value),
      payment_method: assignment.payment_method,
      driver_id: assignment.driver_id,
      conductor_id: assignment.conductor_id,
      bus_plate_number: assignment.bus_plate_number,
      bus_type: assignment.bus_type
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

export async function getUnrecordedRevenueAssignments(): Promise<Assignment[]> {
  try {
    // Try cache first
    const cachedAssignments = await getAssignmentsFromCache();
    if (cachedAssignments) {
      return cachedAssignments.filter(a => !a.is_revenue_recorded);
    }

    // If cache miss, fetch from Supabase
    const { data, error } = await supabase
      .from('op_bus_assignments')
      .select('*')
      .eq('is_revenue_recorded', false);

    if (error) {
      throw new Error(error.message);
    }

    // Update cache with all assignments
    await updateCache();

    return data.map(assignment => ({
      ...assignment,
      trip_fuel_expense: Number(assignment.trip_fuel_expense),
      trip_revenue: Number(assignment.trip_revenue),
      is_revenue_recorded: false
    })) as Assignment[];
  } catch (error) {
    console.error('Error fetching unrecorded revenue assignments:', error);
    throw error;
  }
}

export async function getUnrecordedExpenseAssignments(): Promise<Assignment[]> {
  try {
    // Try cache first
    const cachedAssignments = await getAssignmentsFromCache();
    if (cachedAssignments) {
      return cachedAssignments.filter(a => !a.is_expense_recorded);
    }

    // If cache miss, fetch from Supabase
    const { data, error } = await supabase
      .from('op_bus_assignments')
      .select('*')
      .eq('is_expense_recorded', false);

    if (error) {
      throw new Error(error.message);
    }

    // Update cache with all assignments
    await updateCache();

    return data.map(assignment => ({
      ...assignment,
      trip_fuel_expense: Number(assignment.trip_fuel_expense),
      trip_revenue: Number(assignment.trip_revenue),
      is_expense_recorded: false
    })) as Assignment[];
  } catch (error) {
    console.error('Error fetching unrecorded expense assignments:', error);
    throw error;
  }
}

// Update getAllAssignments to fetch all assignments without filtering
export async function getAllAssignments(): Promise<Assignment[]> {
  try {
    // Try cache first
    const cachedAssignments = await getAssignmentsFromCache();
    if (cachedAssignments) {
      return cachedAssignments;
    }

    // If cache miss, fetch from Supabase
    const { data, error } = await supabase
      .from('op_bus_assignments')
      .select('*');

    if (error) {
      throw new Error(error.message);
    }

    // Update cache with all assignments
    await updateCache();

    return data.map(assignment => ({
      ...assignment,
      trip_fuel_expense: Number(assignment.trip_fuel_expense),
      trip_revenue: Number(assignment.trip_revenue),
      is_expense_recorded: Boolean(assignment.is_expense_recorded),
      is_revenue_recorded: Boolean(assignment.is_revenue_recorded)
    })) as Assignment[];
  } catch (error) {
    console.error('Error fetching all assignments:', error);
    throw error;
  }
}

export async function getAllAssignmentsWithRecorded(): Promise<Assignment[]> {
  try {
    // Try cache first
    const cachedAssignments = await getAssignmentsFromCache();
    if (cachedAssignments) {
      return cachedAssignments;
    }

    // If cache miss, fetch from Supabase
    const { data, error } = await supabase
      .from('op_bus_assignments')
      .select('*');

    if (error) {
      throw new Error(error.message);
    }

    // Update cache with all assignments
    await updateCache();

    return data.map(assignment => ({
      ...assignment,
      trip_fuel_expense: Number(assignment.trip_fuel_expense),
      trip_revenue: Number(assignment.trip_revenue),
      is_expense_recorded: Boolean(assignment.is_expense_recorded)
    })) as Assignment[];
  } catch (error) {
    console.error('Error fetching assignments:', error);
    throw error;
  }
}

export async function updateAssignmentIsRecorded(id: string, is_revenue_recorded: boolean) {
  try {
    const { data, error } = await supabase
      .from('op_bus_assignments')
      .update({ is_revenue_recorded })
      .eq('assignment_id', id)
      .select();

    if (error) {
      throw new Error(`Failed to update is_revenue_recorded: ${error.message}`);
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