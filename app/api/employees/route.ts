// ftms_deployed\app\api\employees\route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAllEmployees } from '@/lib/supabase/employees';
import { Employee } from '@/lib/supabase/employees';

// GET - Return all cached employees, fetch from Supabase if cache is empty
export async function GET() {
  try {
    // First try to get from local cache
    const cachedEmployees = await prisma.employeeCache.findMany();
    
    // If cache is not empty, return it
    if (cachedEmployees.length > 0) {
      return NextResponse.json(cachedEmployees);
    }

    // If cache is empty, fetch from Supabase
    const supabaseData = await getAllEmployees();

    // Populate cache with Supabase data
    if (supabaseData && supabaseData.length > 0) {
      await prisma.employeeCache.createMany({
        data: supabaseData.map((employee: Employee) => ({
          employee_id: employee.employee_id,
          name: employee.name,
          job_title: employee.job_title,
        }))
      });
    }

    // Get the newly cached employees and return them
    const newCache = await prisma.employeeCache.findMany();
    return NextResponse.json(newCache);

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