import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

const HR_API_BASE_URL = process.env.HR_API_BASE_URL;

interface HRPayrollEmployeeAssignment {
  department?: {
    departmentName?: string;
  };
  departmentName?: string;
}

interface HRPayrollEmployee {
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  employeeStatus: string;
  hiredate: string;
  terminationDate?: string;
  basicRate: number;
  position: {
    positionName: string;
    department: {
      departmentName: string;
    };
  };
  department?: {
    departmentName: string;
  };
  attendances: Array<{
    date: string;
    status: string;
  }>;
  benefits: Array<{
    benefitType: {
      name: string;
    };
    value: number;
    frequency: string;
    effectiveDate: string;
    endDate?: string;
    isActive: boolean;
  }>;
  deductions: Array<{
    deductionType: {
      name: string;
      type: string;
    };
    value: number;
    frequency: string;
    effectiveDate: string;
    endDate?: string;
    isActive: boolean;
  }>;
  assignments?: HRPayrollEmployeeAssignment[];
}

function transformHRDataToPayroll(hrData: HRPayrollEmployee[], startDate: string, endDate: string) {
  return hrData.map(employee => {
    const fullName = [employee.firstName, employee.middleName, employee.lastName, employee.suffix]
      .filter(Boolean)
      .join(' ');

    // Calculate days worked based on attendance
    const daysWorked = employee.attendances.filter(att => att.status === 'Present').length;
    
    // Calculate basic pay
    const basicPay = Number(employee.basicRate) / 30 * daysWorked; // Ensure number
    
    // Process benefits
    let revenueBenefit = 0;
    let safetyBenefit = 0;
    let additionalBenefits = 0;
    let serviceIncentiveLeave = 0;
    let holidayPay = 0;
    let thirteenthMonthPay = 0;

    employee.benefits.forEach(benefit => {
      if (!benefit.isActive) return;
      const value = Number(benefit.value);
      const benefitName = benefit.benefitType.name.toLowerCase();
      if (benefitName.includes('revenue')) revenueBenefit += value;
      else if (benefitName.includes('safety')) safetyBenefit += value;
      else if (benefitName.includes('service') || benefitName.includes('leave')) serviceIncentiveLeave += value;
      else if (benefitName.includes('holiday')) holidayPay += value;
      else if (benefitName.includes('13th') || benefitName.includes('thirteenth')) thirteenthMonthPay += value;
      else additionalBenefits += value;
    });

    // Process deductions
    let sssDeduction = 0;
    let philhealthDeduction = 0;
    let pagIbigDeduction = 0;
    let cashAdvance = 0;
    let damageShortage = 0;
    let otherDeductions = 0;

    employee.deductions.forEach(deduction => {
      if (!deduction.isActive) return;
      const value = Number(deduction.value);
      const deductionName = deduction.deductionType.name.toLowerCase();
      if (deductionName.includes('sss')) sssDeduction += value;
      else if (deductionName.includes('philhealth')) philhealthDeduction += value;
      else if (deductionName.includes('pag-ibig') || deductionName.includes('pag ibig')) pagIbigDeduction += value;
      else if (deductionName.includes('cash') || deductionName.includes('advance')) cashAdvance += value;
      else if (deductionName.includes('damage') || deductionName.includes('shortage')) damageShortage += value;
      else otherDeductions += value;
    });

    // Calculate totals (ensure numbers)
    const grossTotalEarnings = Number(basicPay) + Number(revenueBenefit) + Number(safetyBenefit) + Number(additionalBenefits) + 
                              Number(serviceIncentiveLeave) + Number(holidayPay) + Number(thirteenthMonthPay);
    
    const totalDeductions = Number(sssDeduction) + Number(philhealthDeduction) + Number(pagIbigDeduction) + 
                           Number(cashAdvance) + Number(damageShortage) + Number(otherDeductions);
    
    const netPay = Number(grossTotalEarnings) - Number(totalDeductions);

    // --- Department extraction (FIXED) ---
    // First try to get department from position.department.departmentName
    let departmentName = '-';
    if (employee.position && employee.position.department && employee.position.department.departmentName) {
      departmentName = employee.position.department.departmentName;
    } 
    // Fallback to direct department property if exists
    else if (employee.department && employee.department.departmentName) {
      departmentName = employee.department.departmentName;
    } 
    // Fallback to assignments if available
    else if (employee.assignments && Array.isArray(employee.assignments) && employee.assignments.length > 0) {
      const assignment = employee.assignments[0];
      if (assignment.department && assignment.department.departmentName) {
        departmentName = assignment.department.departmentName;
      } else if (assignment.departmentName) {
        departmentName = assignment.departmentName;
      }
    }

    return {
      payroll_id: `payroll_${employee.employeeNumber}_${startDate}_${endDate}`,
      employee_number: employee.employeeNumber,
      employee_name: fullName,
      first_name: employee.firstName,
      middle_name: employee.middleName || null,
      last_name: employee.lastName,
      suffix: employee.suffix || null,
      employee_status: employee.employeeStatus,
      hire_date: employee.hiredate,
      termination_date: employee.terminationDate || null,
      job_title: (employee.position && employee.position.positionName) ? employee.position.positionName : '-',
      department: departmentName,
      payroll_period: "Monthly", // Default to monthly, adjust as needed
      payroll_start_date: startDate,
      payroll_end_date: endDate,
      basic_rate: Number(employee.basicRate),
      days_worked: daysWorked,
      
      // Earnings
      basic_pay: Number(basicPay),
      overtime_regular: 0, // Not provided in HR data
      overtime_holiday: 0, // Not provided in HR data
      service_incentive_leave: Number(serviceIncentiveLeave),
      holiday_pay: Number(holidayPay),
      thirteenth_month_pay: Number(thirteenthMonthPay),
      
      // Benefits
      revenue_benefit: Number(revenueBenefit),
      safety_benefit: Number(safetyBenefit),
      additional_benefits: Number(additionalBenefits),
      
      // Deductions
      sss_deduction: Number(sssDeduction),
      philhealth_deduction: Number(philhealthDeduction),
      pag_ibig_deduction: Number(pagIbigDeduction),
      cash_advance: Number(cashAdvance),
      damage_shortage: Number(damageShortage),
      other_deductions: Number(otherDeductions),
      
      // Totals
      gross_total_earnings: Number(grossTotalEarnings),
      total_deductions: Number(totalDeductions),
      net_pay: Number(netPay),
      
      // Status
      status: "Pending",
      date_released: null,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start') || new Date().toISOString().split('T')[0];
    const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];

    const hrApiUrl = `${HR_API_BASE_URL}/finance/payroll-employees-range?start=${startDate}&end=${endDate}`;
    
    const response = await fetch(hrApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HR API responded with status: ${response.status}`);
    }

    const hrData: HRPayrollEmployee[] = await response.json();
    const transformedData = transformHRDataToPayroll(hrData, startDate, endDate);

    return NextResponse.json({
      success: true,
      data: transformedData,
      count: transformedData.length,
    });

  } catch (error) {
    console.error('Error fetching payroll data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch payroll data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    console.log('PATCH /api/payroll - Request received');
    
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const records = Array.isArray(body) ? body : [body];
    console.log('Records to process:', records.length);
    
    const results = [];
    for (const rec of records) {
      console.log('Processing record for employee:', rec.employee_number);
      
      // Prepare data for upsert - convert date strings to Date objects
      const dataToSave = {
        ...rec,
        status: 'Released',
        date_released: new Date(),
        // Convert string dates to Date objects for Prisma
        payroll_start_date: new Date(rec.payroll_start_date),
        payroll_end_date: new Date(rec.payroll_end_date),
        hire_date: new Date(rec.hire_date),
        termination_date: rec.termination_date ? new Date(rec.termination_date) : null,
      };
      
      console.log('Data to save:', {
        employee_number: dataToSave.employee_number,
        payroll_start_date: dataToSave.payroll_start_date,
        payroll_end_date: dataToSave.payroll_end_date,
        status: dataToSave.status
      });
      
      try {
        // Upsert by unique constraint (employee_number, payroll_start_date, payroll_end_date)
        const saved = await prisma.payrollRecord.upsert({
          where: {
            employee_number_payroll_start_date_payroll_end_date: {
              employee_number: rec.employee_number,
              payroll_start_date: new Date(rec.payroll_start_date),
              payroll_end_date: new Date(rec.payroll_end_date),
            }
          },
          update: dataToSave,
          create: {
            ...dataToSave,
            created_by: rec.released_by || 'system', // fallback if not provided
          }
        });
        
        console.log('Successfully saved record for employee:', rec.employee_number);
        results.push(saved);
      } catch (dbError) {
        console.error('Database error for employee', rec.employee_number, ':', dbError);
        throw dbError;
      }
    }
    
    console.log('PATCH completed successfully. Records processed:', results.length);
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('PATCH /api/payroll - Error occurred:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}