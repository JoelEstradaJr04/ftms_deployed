// ftms_deployed\lib\supabase\employees.ts

import { supabase } from './client'

export type Employee = {
  employee_id: string;
  name: string;
  job_title: 'Driver' | 'Conductor' | 'Mechanic' | 'Manager' | 'Secretary';
};

export async function getAllEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('hr_employees')
    .select('*');

  if (error) {
    console.error('Supabase error fetching employees:', error.message);
    throw new Error(error.message);
  }

  return data as Employee[];
} 