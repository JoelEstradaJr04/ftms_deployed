import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

const HR_API_BASE_URL = process.env.HR_API_BASE_URL;

function parseDate(dateStr: string) {
  return new Date(dateStr);
}

function validateBasicRate(rate: string): number | null {
  const num = Number(rate);
  return isNaN(num) || num <= 0 ? null : num;
}

function validateDateRange(start: Date, end: Date): boolean {
  return start <= end;
}

function validateEmployeeStatus(status: string): boolean {
  return status && status.toLowerCase() === 'active';
}

function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

function getDaysWorked(attendances: any[], start: Date, end: Date, weekendWorkAllowed: boolean): number {
  return attendances.filter(att => {
    const attDate = new Date(att.date);
    if (!isDateInRange(attDate, start, end)) return false;
    if (att.status !== 'Present') return false;
    if (!weekendWorkAllowed) {
      const day = attDate.getDay();
      if (day === 0 || day === 6) return false; // Sunday=0, Saturday=6
    }
    return true;
  }).length;
}

function getPayrollPeriodConfig(config: any, defaultWorkDays = 22) {
  return {
    defaultWorkDays: config?.default_work_days || defaultWorkDays,
    weekendWorkAllowed: config?.weekend_work_allowed || false,
    holidayWorkRate: config?.holiday_work_rate || 1.5,
    overtimeRate: config?.overtime_rate || 1.25,
  };
}

interface ProrationItem {
  value: string | number;
  frequency: string;
}

function getProratedAmount(item: ProrationItem, payrollPeriod: string, daysWorked: number, defaultWorkDays: number): number {
  const freq = (item.frequency || '').toLowerCase();
  const value = Number(item.value);
  if (isNaN(value)) return 0;

  if (freq === payrollPeriod.toLowerCase()) {
    return value;
  }
  if (freq === 'monthly' && (payrollPeriod === 'weekly' || payrollPeriod === 'custom')) {
    return value * (daysWorked / defaultWorkDays);
  }
  // Add more rules as needed
  return value; // Default to full value if no proration rule matches
}

async function hasOverlap(employee_number: string, start: Date, end: Date) {
  const overlaps = await prisma.payrollRecord.findFirst({
    where: {
      employee_number,
      OR: [
        {
          payroll_start_date: { lte: end },
          payroll_end_date: { gte: start },
        },
      ],
      is_deleted: false,
    },
  });
  return !!overlaps;
}

export async function POST(req: NextRequest) {
  try {
    const { start, end, periodType } = await req.json();
    if (!start || !end || !periodType) {
      return NextResponse.json({ success: false, error: 'Missing start, end, or periodType.' }, { status: 400 });
    }
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    if (!validateDateRange(startDate, endDate)) {
      return NextResponse.json({ success: false, error: 'Invalid date range.' }, { status: 400 });
    }

    // Fetch global payroll config
    const globalConfig = await prisma.payrollConfiguration.findFirst();
    const payrollConfig = getPayrollPeriodConfig(globalConfig);

    // Fetch HR data
    const hrApiUrl = `${HR_API_BASE_URL}?start=${start}&end=${end}`;
    const hrRes = await fetch(hrApiUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    if (!hrRes.ok) {
      return NextResponse.json({ success: false, error: 'Failed to fetch HR data.' }, { status: 500 });
    }
    const hrData: any[] = await hrRes.json();

    let generated = 0, skipped = 0, filtered_out = 0;
    const errors: any[] = [];
    const createdRecords: any[] = [];

    for (const emp of hrData as any[]) {
      // Payroll frequency config
      const freqConfig = await prisma.payrollFrequencyConfig.findUnique({ where: { employee_number: emp.employeeNumber } });
      const employeePayrollPeriod = freqConfig?.payroll_period || 'monthly'; // Default to monthly

      // Filter employees whose payroll period does not match the generation run
      if (employeePayrollPeriod.toLowerCase() !== periodType.toLowerCase()) {
        filtered_out++;
        continue;
      }

      // Validation
      if (!validateEmployeeStatus(emp.employeeStatus)) {
        skipped++;
        errors.push({ employee: emp.employeeNumber, reason: 'Inactive status' });
        continue;
      }
      const basicRate = validateBasicRate(emp.basicRate);
      if (!basicRate) {
        skipped++;
        errors.push({ employee: emp.employeeNumber, reason: 'Invalid basicRate' });
        continue;
      }
      
      const payrollPeriod = employeePayrollPeriod; // Use the matched period
      const defaultWorkDays = payrollConfig.defaultWorkDays;
      const weekendWorkAllowed = payrollConfig.weekendWorkAllowed;
      
      // Days worked
      const daysWorked = getDaysWorked(emp.attendances || [], startDate, endDate, weekendWorkAllowed);
      
      // Overlap check
      if (await hasOverlap(emp.employeeNumber, startDate, endDate)) {
        skipped++;
        errors.push({ employee: emp.employeeNumber, reason: 'date overlap' });
        continue;
      }
      // Proration and calculation
      const dailyRate = basicRate / defaultWorkDays;
      const basicPay = dailyRate * daysWorked;
      // Benefits
      const processedBenefits = [];
      const benefitTotals = { revenue_benefit: 0, safety_benefit: 0, additional_benefits: 0, service_incentive_leave: 0, holiday_pay: 0, thirteenth_month_pay: 0 };
      for (const benefit of emp.benefits || []) {
        const prorated = getProratedAmount(benefit as ProrationItem, payrollPeriod, daysWorked, defaultWorkDays);
        processedBenefits.push({ ...benefit, prorated });
        const name = (benefit.benefitType.name || '').toLowerCase();
        if (name.includes('revenue')) benefitTotals.revenue_benefit += prorated;
        else if (name.includes('safety')) benefitTotals.safety_benefit += prorated;
        else if (name.includes('service') || name.includes('leave')) benefitTotals.service_incentive_leave += prorated;
        else if (name.includes('holiday')) benefitTotals.holiday_pay += prorated;
        else if (name.includes('13th') || name.includes('thirteenth')) benefitTotals.thirteenth_month_pay += prorated;
        else benefitTotals.additional_benefits += prorated;
      }
      // Deductions
      const processedDeductions = [];
      const deductionTotals = { sss_deduction: 0, philhealth_deduction: 0, pag_ibig_deduction: 0, cash_advance: 0, damage_shortage: 0, other_deductions: 0 };
      for (const deduction of emp.deductions || []) {
        const prorated = getProratedAmount(deduction as ProrationItem, payrollPeriod, daysWorked, defaultWorkDays);
        processedDeductions.push({ ...deduction, prorated });
        const name = (deduction.deductionType.name || '').toLowerCase();
        if (name.includes('sss')) deductionTotals.sss_deduction += prorated;
        else if (name.includes('philhealth')) deductionTotals.philhealth_deduction += prorated;
        else if (name.includes('pag-ibig') || name.includes('pag ibig')) deductionTotals.pag_ibig_deduction += prorated;
        else if (name.includes('cash') || name.includes('advance')) deductionTotals.cash_advance += prorated;
        else if (name.includes('damage') || name.includes('shortage') || name.includes('short')) deductionTotals.damage_shortage += prorated;
        else deductionTotals.other_deductions += prorated;
      }
      // Totals
      const grossTotalEarnings = basicPay + benefitTotals.revenue_benefit + benefitTotals.safety_benefit + benefitTotals.additional_benefits + benefitTotals.service_incentive_leave + benefitTotals.holiday_pay + benefitTotals.thirteenth_month_pay;
      const totalDeductions = deductionTotals.sss_deduction + deductionTotals.philhealth_deduction + deductionTotals.pag_ibig_deduction + deductionTotals.cash_advance + deductionTotals.damage_shortage + deductionTotals.other_deductions;
      const netPay = grossTotalEarnings - totalDeductions;
      // Calculation notes
      const calculationNotes = `Payroll period: ${payrollPeriod}. Days worked: ${daysWorked}. Daily rate: ${dailyRate.toFixed(2)}. Proration applied for benefits/deductions as needed.`;
      // Insert PayrollRecord
      const payrollRecord = await prisma.payrollRecord.create({
        data: {
          payroll_id: `payroll_${emp.employeeNumber}_${start}_${end}`,
          employee_number: emp.employeeNumber,
          employee_name: [emp.firstName, emp.middleName, emp.lastName, emp.suffix].filter(Boolean).join(' '),
          first_name: emp.firstName,
          middle_name: emp.middleName || null,
          last_name: emp.lastName,
          suffix: emp.suffix || null,
          employee_status: emp.employeeStatus,
          hire_date: new Date(emp.hiredate),
          termination_date: emp.terminationDate ? new Date(emp.terminationDate) : null,
          job_title: emp.position?.positionName || '-',
          department: emp.position?.department?.departmentName || '-',
          payroll_period: payrollPeriod,
          payroll_start_date: startDate,
          payroll_end_date: endDate,
          basic_rate: basicRate,
          days_worked: daysWorked,
          basic_pay: basicPay,
          overtime_regular: 0,
          overtime_holiday: 0,
          service_incentive_leave: benefitTotals.service_incentive_leave,
          holiday_pay: benefitTotals.holiday_pay,
          thirteenth_month_pay: benefitTotals.thirteenth_month_pay,
          revenue_benefit: benefitTotals.revenue_benefit,
          safety_benefit: benefitTotals.safety_benefit,
          additional_benefits: benefitTotals.additional_benefits,
          sss_deduction: deductionTotals.sss_deduction,
          philhealth_deduction: deductionTotals.philhealth_deduction,
          pag_ibig_deduction: deductionTotals.pag_ibig_deduction,
          cash_advance: deductionTotals.cash_advance,
          damage_shortage: deductionTotals.damage_shortage,
          other_deductions: deductionTotals.other_deductions,
          gross_total_earnings: grossTotalEarnings,
          total_deductions: totalDeductions,
          net_pay: netPay,
          status: 'Pending',
          date_released: null,
          created_by: 'system', // TODO: Use actual user if available
          hr_data_snapshot: emp,
          calculation_notes: calculationNotes,
          processed_benefits: processedBenefits,
          processed_deductions: processedDeductions,
        },
      });
      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'CREATED',
          table_affected: 'PayrollRecord',
          record_id: payrollRecord.payroll_id,
          performed_by: 'system', // TODO: Use actual user if available
          details: { new: payrollRecord },
        },
      });
      generated++;
      createdRecords.push(payrollRecord);
    }
    return NextResponse.json({ success: true, generated, skipped, filtered_out, errors });
  } catch (error) {
    console.error('Payroll generation error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 