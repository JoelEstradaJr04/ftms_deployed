import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { RevenueCategory, ExpenseCategory } from '@prisma/client';
import { generateId } from '@/lib/idGenerator';

interface DashboardData {
  revenue: {
    total: number;
    byCategory: Record<RevenueCategory, number>;
  };
  expense: {
    total: number;
    byCategory: Record<ExpenseCategory, number>;
  };
  profit: number;
}

export async function POST(req: NextRequest) {
  try {
    const { data, dateFilter, dateFrom, dateTo } = await req.json();
    const dashboardData = data as DashboardData;
    const exportId = await generateId('EXP');
    const currentDate = new Date();

    // Format the date range for the title
    let dateRange = 'All Time';
    if (dateFilter === 'Day') {
      dateRange = 'Today';
    } else if (dateFilter === 'Month') {
      dateRange = 'This Month';
    } else if (dateFilter === 'Year') {
      dateRange = 'This Year';
    } else if (dateFilter === 'Custom') {
      dateRange = `${dateFrom} to ${dateTo}`;
    }

    // Create header information
    const headerInfo = [
      ['Financial Dashboard Export'],
      [''],
      ['Export Details:'],
      ['Export ID', exportId],
      ['Generated Date', currentDate.toLocaleString()],
      ['Date Filter', dateFilter || 'None'],
      ['Date Range', dateRange],
      [''],
      ['Summary:'],
      ['Total Revenue', `₱${dashboardData.revenue.total.toLocaleString()}`],
      ['Total Expenses', `₱${dashboardData.expense.total.toLocaleString()}`],
      ['Net Profit/Loss', `₱${dashboardData.profit.toLocaleString()}`],
      [''],
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Create revenue worksheet
    const revenueData = [
      ...headerInfo,
      ['Revenue Breakdown'],
      ['Category', 'Amount (₱)'],
      ...Object.entries(dashboardData.revenue.byCategory).map(([category, amount]) => [
        category.replace('_', ' '),
        amount.toLocaleString()
      ]),
      [''],
      ['Total Revenue', `₱${dashboardData.revenue.total.toLocaleString()}`]
    ];
    const wsRevenue = XLSX.utils.aoa_to_sheet(revenueData);

    // Create expense worksheet
    const expenseData = [
      ...headerInfo,
      ['Expense Breakdown'],
      ['Category', 'Amount (₱)'],
      ...Object.entries(dashboardData.expense.byCategory).map(([category, amount]) => [
        category.replace('_', ' '),
        amount.toLocaleString()
      ]),
      [''],
      ['Total Expenses', `₱${dashboardData.expense.total.toLocaleString()}`]
    ];
    const wsExpense = XLSX.utils.aoa_to_sheet(expenseData);

    // Create summary worksheet with more detailed information
    const summaryData = [
      ...headerInfo,
      ['Detailed Financial Analysis'],
      [''],
      ['Revenue Categories:'],
      ['Category', 'Amount (₱)', 'Percentage of Total Revenue'],
      ...Object.entries(dashboardData.revenue.byCategory).map(([category, amount]) => [
        category.replace('_', ' '),
        amount.toLocaleString(),
        `${((amount / dashboardData.revenue.total) * 100).toFixed(2)}%`
      ]),
      [''],
      ['Expense Categories:'],
      ['Category', 'Amount (₱)', 'Percentage of Total Expenses'],
      ...Object.entries(dashboardData.expense.byCategory).map(([category, amount]) => [
        category.replace('_', ' '),
        amount.toLocaleString(),
        `${((amount / dashboardData.expense.total) * 100).toFixed(2)}%`
      ]),
      [''],
      ['Financial Metrics:'],
      ['Metric', 'Value'],
      ['Revenue to Expense Ratio', `${(dashboardData.revenue.total / dashboardData.expense.total).toFixed(2)}`],
      ['Profit Margin', `${((dashboardData.profit / dashboardData.revenue.total) * 100).toFixed(2)}%`],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

    // Add worksheets to workbook
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    XLSX.utils.book_append_sheet(wb, wsRevenue, 'Revenue');
    XLSX.utils.book_append_sheet(wb, wsExpense, 'Expenses');

    // Style the worksheets - make columns wider
    ['!cols', '!rows'].forEach(prop => {
      [wsRevenue, wsExpense, wsSummary].forEach(ws => {
        ws[prop] = [
          { wch: 25 }, // First column wider for categories
          { wch: 20 }, // Second column for amounts
          { wch: 20 }  // Third column for percentages
        ];
      });
    });

    // Write to buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return the Excel file
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=dashboard-report-${currentDate.toISOString().split('T')[0]}.xlsx`
      }
    });
  } catch (error) {
    console.error('Error exporting dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to export dashboard data' },
      { status: 500 }
    );
  }
} 