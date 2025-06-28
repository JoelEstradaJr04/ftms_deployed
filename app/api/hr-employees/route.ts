import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const hrApiUrl = process.env.HR_API_EMPLOYEES_URL || 'https://hr-api.agilabuscorp.me/employees/inv';
    
    const response = await fetch(hrApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HR API request failed: ${response.status} ${response.statusText}`);
    }

    const hrEmployees = await response.json();

    // Transform HR API data to match our Employee interface
    const employees = hrEmployees.map((hrEmp: any) => ({
      employee_id: hrEmp.employeeNumber,
      name: `${hrEmp.firstName} ${hrEmp.middleName ? hrEmp.middleName + ' ' : ''}${hrEmp.lastName}`.trim(),
      job_title: hrEmp.position,
      department: hrEmp.department,
      phone: hrEmp.phone,
    }));

    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees from HR API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees from HR API' },
      { status: 500 }
    );
  }
} 