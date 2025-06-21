import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET: List all payroll records
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl || req.url;
    const searchParams = (typeof url === 'string' ? new URL(url, 'http://localhost') : url).searchParams;
    
    // Get query parameters
    const search = searchParams.get('search');
    const position = searchParams.get('position');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const offset = (page - 1) * pageSize;

    // Build query
    let query = supabase
      .from('hr_payroll')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search && search.trim()) {
      const searchTerm = search.trim();
      query = query.or(`employee_name.ilike.%${searchTerm}%,position.ilike.%${searchTerm}%`);
    }
    
    if (position) {
      query = query.eq('position', position);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);
    
    // Order by created_at descending
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch payroll data' }, { status: 500 });
    }

    // Transform data to match frontend expectations
    const transformedData = data?.map(record => ({
      payroll_id: record.payroll_id,
      employee_name: record.employee_name,
      job_title: record.position, // Map position to job_title for frontend
      department: getDepartmentFromPosition(record.position), // Derive department from position
      payroll_period: "Monthly", // Default to monthly for now
      net_pay: parseFloat(record.net_pay),
      deduction: parseFloat(record.total_deduction),
      salary: parseFloat(record.gross_total_earnings), // Use gross earnings as salary
      status: record.status || "Pending", // Use actual status from database
      date_released: record.date_released,
      // Additional fields for detailed view
      days_of_work: record.days_of_work,
      basic_rate: parseFloat(record.basic_rate),
      basic_pay: parseFloat(record.basic_pay),
      regular: parseFloat(record.regular),
      holiday: parseFloat(record.holiday),
      service_incentive_leave: parseFloat(record.service_incentive_leave),
      holiday_pay: parseFloat(record.holiday_pay),
      thirteenth_month_pay: parseFloat(record.thirteenth_month_pay),
      revenue: parseFloat(record.revenue),
      safety: parseFloat(record.safety),
      additional: parseFloat(record.additional),
      philhealth: parseFloat(record.philhealth),
      pag_ibig: parseFloat(record.pag_ibig),
      sss: parseFloat(record.sss),
      cash_advance: parseFloat(record.cash_advance),
      damage_shortage: parseFloat(record.damage_shortage),
      gross_total_earnings: parseFloat(record.gross_total_earnings),
      total_deduction: parseFloat(record.total_deduction),
      created_at: record.created_at,
      updated_at: record.updated_at
    })) || [];

    return NextResponse.json({
      data: transformedData,
      pagination: {
        currentPage: page,
        pageSize,
        totalRecords: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    });

  } catch (error) {
    console.error('Error fetching payroll data:', error);
    return NextResponse.json({ error: 'Failed to fetch payroll data' }, { status: 500 });
  }
}

// POST: Create new payroll record
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      employee_name,
      position,
      days_of_work,
      basic_rate,
      regular = 0,
      holiday = 0,
      service_incentive_leave = 12.44,
      holiday_pay = 0,
      thirteenth_month_pay = 0,
      revenue = 0,
      safety = 0,
      additional = 0,
      philhealth = 0,
      pag_ibig = 0,
      sss = 0,
      cash_advance = 0,
      damage_shortage = 0
    } = body;

    // Validate required fields
    if (!employee_name || !position || !days_of_work || !basic_rate) {
      return NextResponse.json({ 
        error: 'Missing required fields: employee_name, position, days_of_work, basic_rate' 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('hr_payroll')
      .insert([{
        employee_name,
        position,
        days_of_work,
        basic_rate,
        regular,
        holiday,
        service_incentive_leave,
        holiday_pay,
        thirteenth_month_pay,
        revenue,
        safety,
        additional,
        philhealth,
        pag_ibig,
        sss,
        cash_advance,
        damage_shortage
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to create payroll record' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    console.error('Error creating payroll record:', error);
    return NextResponse.json({ error: 'Failed to create payroll record' }, { status: 500 });
  }
}

// PATCH: Update payroll record
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { payroll_id, ...updateData } = body;

    if (!payroll_id) {
      return NextResponse.json({ error: 'payroll_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('hr_payroll')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('payroll_id', payroll_id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to update payroll record' }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error updating payroll record:', error);
    return NextResponse.json({ error: 'Failed to update payroll record' }, { status: 500 });
  }
}

// DELETE: Delete payroll record
export async function DELETE(req: NextRequest) {
  try {
    const url = req.nextUrl || req.url;
    const searchParams = (typeof url === 'string' ? new URL(url, 'http://localhost') : url).searchParams;
    const payroll_id = searchParams.get('payroll_id');

    if (!payroll_id) {
      return NextResponse.json({ error: 'payroll_id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('hr_payroll')
      .delete()
      .eq('payroll_id', payroll_id);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to delete payroll record' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Payroll record deleted successfully' });

  } catch (error) {
    console.error('Error deleting payroll record:', error);
    return NextResponse.json({ error: 'Failed to delete payroll record' }, { status: 500 });
  }
}

// Helper function to derive department from position
function getDepartmentFromPosition(position: string): string {
  const positionLower = position.toLowerCase();
  
  if (['driver', 'conductor', 'mechanic'].includes(positionLower)) {
    return 'Operations';
  } else if (['manager', 'supervisor'].includes(positionLower)) {
    return 'Management';
  } else if (['accountant', 'cashier', 'clerk'].includes(positionLower)) {
    return 'Finance';
  } else if (['secretary', 'hr assistant'].includes(positionLower)) {
    return 'Administration';
  } else if (['nurse', 'midwife', 'dentist'].includes(positionLower)) {
    return 'Healthcare';
  } else if (['teacher', 'librarian'].includes(positionLower)) {
    return 'Education';
  } else if (['cook', 'dishwasher', 'cafeteria worker'].includes(positionLower)) {
    return 'Food Service';
  } else if (['security guard', 'janitor', 'maintenance'].includes(positionLower)) {
    return 'Facilities';
  } else {
    return 'General';
  }
} 