// ftms_deployed\app\api\employees\route.ts
import { NextResponse } from 'next/server';
import { fetchEmployeesForReimbursement } from '@/lib/supabase/employees';

// GET - Return all employees from HR API
export async function GET() {
  try {
    // Fetch directly from HR API
    const employees = await fetchEmployeesForReimbursement();
    
    return NextResponse.json(employees);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Internal Server Error';
      
    console.error('Failed to fetch employees:', errorMessage);
    
    return NextResponse.json(
      { error: 'Failed to fetch employees', details: errorMessage }, 
      { status: 500 }
    );
  }
} 