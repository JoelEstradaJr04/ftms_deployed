"use client";

import React, { useState, useEffect, useCallback } from "react";
import PieChart from "../../Components/pieChart";
import ExportConfirmationModal from "../../Components/ExportConfirmationModal";
import "../../styles/dashboard.css"; // External CSS for styling
import { logAuditToServer } from "../../lib/clientAuditLogger";
import Loading from '../../Components/loading';
import { formatDisplayText } from '@/app/utils/formatting';

interface RevenueRecord {
  category: RevenueCategory;
  total_amount: string | number;
}

interface ExpenseRecord {
  category: ExpenseCategory;
  total_amount: string | number;
}

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

const DashboardPage = () => {
  const today = new Date().toISOString().split('T')[0];
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(""); // Tracks the selected filter
  const [dateFrom, setDateFrom] = useState(""); // Tracks the start date
  const [dateTo, setDateTo] = useState(""); // Tracks the end date
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    revenue: { total: 0, byCategory: {} as Record<RevenueCategory, number> },
    expense: { total: 0, byCategory: {} as Record<ExpenseCategory, number> },
    profit: 0
  });

  // Function to get emoji based on profit
  const getProfitEmoji = (profit: number) => {
    if (profit < 0) return "/sad.webm";
    if (profit <= 10000) return "/sad.webm";
    if (profit <= 10000) return "/happy.webm";
    return "/happy.webm";
  };

  // Function to fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      // Prepare date parameters
      const params = new URLSearchParams();
      if (dateFilter === "Custom" && dateFrom && dateTo) {
        params.append("dateFrom", dateFrom);
        params.append("dateTo", dateTo);
      } else if (dateFilter) {
        params.append("dateFilter", dateFilter);
      }

      // Fetch revenue data
      const revenueResponse = await fetch(`/api/revenues?${params}`);
      const revenueData = await revenueResponse.json();

      // Fetch expense data
      const expenseResponse = await fetch(`/api/expenses?${params}`);
      const expenseData = await expenseResponse.json();

      // Calculate totals and categorize
      const revenueByCategory = revenueData.reduce((acc: Record<RevenueCategory, number>, curr: RevenueRecord) => {
        acc[curr.category] = (acc[curr.category] || 0) + Number(curr.total_amount);
        return acc;
      }, {} as Record<RevenueCategory, number>);

      const expenseByCategory = expenseData.reduce((acc: Record<ExpenseCategory, number>, curr: ExpenseRecord) => {
        acc[curr.category] = (acc[curr.category] || 0) + Number(curr.total_amount);
        return acc;
      }, {} as Record<ExpenseCategory, number>);

      const totalRevenue = (Object.values(revenueByCategory) as number[]).reduce((a, b) => a + b, 0);
      const totalExpense = (Object.values(expenseByCategory) as number[]).reduce((a, b) => a + b, 0);
      const profit = totalRevenue - totalExpense;

      setDashboardData({
        revenue: { total: totalRevenue, byCategory: revenueByCategory },
        expense: { total: totalExpense, byCategory: expenseByCategory },
        profit
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
    finally {
      setLoading(false);
    }
  }, [dateFilter, dateFrom, dateTo]);

  // Initial fetch and polling setup
  useEffect(() => {
    // Fetch immediately
    fetchDashboardData();

    // Set up polling every 30 seconds
    const intervalId = setInterval(fetchDashboardData, 30000);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [fetchDashboardData]);

  const generateFileName = () => {
    const now = new Date();
    const timeStamp = now.toISOString().replace(/[:.]/g, '-').split('T')[1].slice(0, 8);
    const dateStamp = now.toISOString().split('T')[0];
    
    let fileName = 'dashboard_report';
    
    if (dateFilter) {
      fileName += `_${dateFilter.toLowerCase()}`;
    }
    
    if (dateFilter === 'Custom' && dateFrom && dateTo) {
      fileName += `_${dateFrom}_to_${dateTo}`;
    }
    
    fileName += `_${dateStamp}_${timeStamp}`;
    
    return `${fileName}.xlsx`;
  };

  // Function to handle export
  const handleExport = async () => {
    try {
      const response = await fetch('/api/export/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateFilter,
          dateFrom,
          dateTo,
          data: dashboardData
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = generateFileName();
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        setIsExportModalOpen(false);

        // Log the export action to audit using the client-side logger
        const idResponse = await fetch('/api/generate-export-id');
        if (!idResponse.ok) {
          throw new Error('Failed to generate export ID');
        }
        const { exportId } = await idResponse.json();
        
        await logAuditToServer({
          action: 'EXPORT',
          table_affected: 'Revenue AND Expense',
          record_id: exportId,
          performed_by: 'ftms_user',
          details: `Exported dashboard report (${fileName}) with date filter: ${dateFilter || 'All'}${
            dateFilter === 'Custom' ? `, range: ${dateFrom} to ${dateTo}` : ''
          }. Summary - Revenue: ₱${dashboardData.revenue.total.toLocaleString()}, Expenses: ₱${dashboardData.expense.total.toLocaleString()}, Profit: ₱${dashboardData.profit.toLocaleString()}`,
        });
      }
    } catch (error) {
      console.error('Error exporting dashboard data:', error);
    }
  };

  if (loading) {
    return (
        <div className="card">
            <h1 className="title">Dashboard</h1>
            <Loading />
        </div>
    );
  }
  
  return (
    <>
    <div className="dashboardPage">
      <div className="accounting">
        {/* CONTAINER FOR THE SETTINGS */}
        <div className="dashboard_settings">
          <div className="filterDate">
            {/* DROPDOWN FILTER OF PERIODS */}
            <div className="filter">
              <label htmlFor="dateFilter">Filter By:</label>
              <select
                value={dateFilter}
                id="dateFilter"
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  if (e.target.value !== 'Custom') {
                    setDateFrom('');
                    setDateTo('');
                  }
                }}
              >
                <option value="">All</option>
                <option value="Day">Today</option>
                <option value="Month">This Month</option>
                <option value="Year">This Year</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            {dateFilter === "Custom" && (
                <div className="dateRangePicker">
                    <div className="date">
                        <label htmlFor="startDate">Start Date:</label>
                        <input
                            type="date"
                            id="startDate"
                            name="startDate"
                            value={dateFrom}
                            onChange={(e) => {
                              setDateFrom(e.target.value);
                              if (dateTo) {
                                fetchDashboardData();
                              }
                            }}
                            max={today}
                        />
                    </div>

                    <div className="date">
                        <label htmlFor="endDate">End Date:</label>
                        <input
                            type="date"
                            id="endDate"
                            name="endDate"
                            value={dateTo}
                            onChange={(e) => {
                              setDateTo(e.target.value);
                              if (dateFrom) {
                                fetchDashboardData();
                              }
                            }}
                            max={today}
                        />
                    </div>
                </div>
            )}
          </div>

          {/* EXPORT BUTTON */}
          <div className="exportButton">
              <button onClick={() => setIsExportModalOpen(true)}><i className="ri-receipt-line" /> Export</button>
          </div>
        </div>
      {/* </div> */}

        {/* CONTAINER FOR THE DATA */}
        {/* CONTAINS REVENUE, EXPENSES, AND PROFIT */}
        {/* GRAPHS FOR THE EXPENSES */}
          <div className="dataContainer">
                <div className="data">
                    <div className="dataGrid" id="revenue">
                        <div className="title"><h2>Revenue</h2></div>
                        <p>₱{dashboardData.revenue.total.toLocaleString()}</p>
                        <div className="categoryBreakdown">
                          {Object.entries(dashboardData.revenue.byCategory).map(([category, amount]) => (
                            <div key={category} className="categoryItem">
                              <span>{formatDisplayText(category)}</span>
                              <span>₱{amount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                    </div>
                    <div className="dataGrid" id="expenses">
                        <div className="title"><h2>Expenses</h2></div>  
                        <p>₱{dashboardData.expense.total.toLocaleString()}</p>
                        <div className="categoryBreakdown">
                          {Object.entries(dashboardData.expense.byCategory).map(([category, amount]) => (
                            <div key={category} className="categoryItem">
                              <span>{formatDisplayText(category)}</span>
                              <span>₱{amount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                    </div>
                    <div className="dataGrid" id="profit">
                        <div className="title"><h2>Profit</h2></div>
                        <p>₱{dashboardData.profit.toLocaleString()}</p>
                    </div>
                    {/* AUTOMATICALLY UPDATING EMOJI BASED ON THE PROFIT */}
                    <div className="dataGrid" id="emoji">
                        <div className="emoji">
                          <video
                            src={getProfitEmoji(dashboardData.profit)}
                            autoPlay
                            loop
                            muted
                          />
                        </div>
                    </div>
                </div>


                {/* CONTAINER FOR THE GRAPHS */}
                {/* CONTAINS THE REVENUE, EXPENSES, AND PROFIT GRAPHS */}
                <div className="graphContainer-wrapper">
                  <div className="graphContainer">
                      <div className="title"><h2>Financial Overview</h2></div>
                      {/* PIE CHART */}
                      {/* This is a pie chart that shows the expenses */}
                      {/* The data is passed as props to the PieChart component */}
                      {/* The PieChart component is imported from the Components folder */}
                      <div className="pieChartContainer">
                        <PieChart 
                          revenueData={dashboardData.revenue.byCategory}
                          expenseData={dashboardData.expense.byCategory}
                        />
                      </div>
                  </div>
                </div>
          </div>
      </div>
    </div>

    <ExportConfirmationModal
      isOpen={isExportModalOpen}
      onClose={() => setIsExportModalOpen(false)}
      onConfirm={handleExport}
      dateFilter={dateFilter}
      dateFrom={dateFrom}
      dateTo={dateTo}
      dashboardData={dashboardData}
    />
    </>
  );
};

export default DashboardPage;