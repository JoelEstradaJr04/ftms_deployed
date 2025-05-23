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
  is_recorded: boolean // Changed to snake_case
  assignment_type: 'Boundary' | 'Percentage' | 'Bus_Rental'
}

export async function getAssignmentById(id: string): Promise<Assignment | null> {
  const { data, error } = await supabase
    .from('op_bus_assignments')
    .select('*')
    .eq('assignment_id', id)
    .single()

  if (error) {
    console.error('Failed to fetch assignment from Supabase:', error)
    throw error
  }

  return data as Assignment | null
}

export async function getAllAssignments() {
  const { data, error } = await supabase
    .from('op_bus_assignments')
    .select('*')
    .eq('is_recorded', false); // Changed to snake_case

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateAssignmentIsRecorded(id: string, is_recorded: boolean) {
  const { data, error } = await supabase
    .from('op_bus_assignments')
    .update({ is_recorded }) // Now perfectly matches
    .eq('assignment_id', id)
    .select();

  if (error) {
    throw new Error(`Failed to update is_recorded: ${error.message}`); // Updated error message
  }

  return data;
}