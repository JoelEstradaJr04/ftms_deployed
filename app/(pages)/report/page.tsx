// app/(pages)/reportPage/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import "../../styles/report.css";
import "../../styles/table.css";
import LineChart from '../../Components/expenseRevenueLineChart';
import ExpensesPieChart from '../../Components/expensesPieChart';
import RevenuePieChart from '../../Components/revenuePieChart';
import Pagination from '../../Components/pagination';
import { getUnrecordedExpenseAssignments, getAllAssignmentsWithRecorded, type Assignment } from '@/lib/supabase/assignments';
import { formatDate } from '../../utility/dateFormatter';
import Swal from 'sweetalert2';
import Loading from '../../Components/loading';
import { showSuccess, showError, showWarning, showInformation, showConfirmation } from '../../utility/Alerts';

// import PaginationComponent from "../Components/pagination"; //LATER <-------------------SEE THIS
// Define interface based on your Prisma ExpenseRecord schema
interface ExpenseRecord {
  expense_id: string;        
  assignment_id?: string;    
  receipt_id?: string;
  category: 'Fuel' | 'Vehicle_Parts' | 'Tools' | 'Equipment' | 'Supplies' | 'Other';
  total_amount: number;      
  expense_date: string;              
  created_by: string;        
  created_at: string;        
  updated_at?: string;       
  is_deleted: boolean;
  other_source?: string;
  other_category?: string;
  receipt?: Receipt;
}

interface Receipt {
  receipt_id: string;
  supplier: string;
  transaction_date: string;
  vat_reg_tin?: string;
  terms?: string;
  date_paid?: string;
  status: string;
  total_amount: number;
  vat_amount?: number;
  total_amount_due: number;
  items: ReceiptItem[];
}

interface ReceiptItem {
  receipt_item_id: string;
  item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

// UI data type that matches your schema exactly
type ExpenseData = {
  expense_id: string;       
  category: string;         
  total_amount: number;     
  expense_date: string;             
  created_by: string;       
  assignment_id?: string;   
  receipt_id?: string;
  other_source?: string;
  other_category?: string;
  assignment?: Assignment;
  receipt?: Receipt;
};

interface RevenueData {
  revenue_id: string;
  category: string;
  total_amount: number;
  collection_date: string;
  created_by: string;
  assignment_id?: string;
  other_source?: string;
}


const ReportPage = () => {

    const [dateFilter, setDateFilter] = useState(""); // Tracks the selected filter
    const [dateFrom, setDateFrom] = useState(""); // Tracks the start date
    const [dateTo, setDateTo] = useState(""); // Tracks the end date
    const [activeTab, setActiveTab] = useState('profit');//setActiveTab('profit'); // Tracks the active tab (profit/loss, expenses, revenue)

    const [revenueData, setData] = useState<RevenueData[]>([]);

    const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [assignmentsLoading, setAssignmentsLoading] = useState(true);
    const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
    const [lastUpdate, setLastUpdate] = useState(Date.now());
    



    // Resets values when the active tab changes
    useEffect(() => {
        // Reset filter and pagination values when tab changes
        setSearch("");
        setCategoryFilter("");
        setCurrentPage(1);
        setPageSize(10);
    }, [activeTab]);
      //==================== EXPENSE PART ==================//
      // Format assignment for display===
      const formatAssignment = (assignment: Assignment): string => {
        const busType = assignment.bus_type === 'Airconditioned' ? 'A' : 'O';
        return `${busType} | ${assignment.bus_bodynumber} - ${assignment.bus_route} | ${assignment.driver_name.split(' ').pop()} & ${assignment.conductor_name.split(' ').pop()} | ${formatDate(assignment.date_assigned)}`;
      };
    
      // Format receipt for display
      const formatReceipt = (receipt: Receipt): string => {
        return `${receipt.terms || 'N/A'} | ${receipt.supplier} | ${formatDate(receipt.transaction_date)}`;
      };
    
      // Fetch expenses data
      const fetchExpenses = async () => {
        try {
          const response = await fetch('/api/expenses');
          if (!response.ok) throw new Error('Failed to fetch expenses');
          const expensesData = await response.json();
          setExpenseData(expensesData);
        } catch (error) {
          console.error('Error fetching expenses:', error);
          showError('Failed to load expenses', 'Error');
        }
      };
    
      // Fetch assignments data
      const fetchAssignments = async () => {
        try {
          setAssignmentsLoading(true);
          // Get unrecorded expense assignments for the dropdown
          const unrecordedAssignments = await getUnrecordedExpenseAssignments();
          setAssignments(unrecordedAssignments);
          
          // Get all assignments for reference (including recorded ones)
          const allAssignmentsData = await getAllAssignmentsWithRecorded();
          setAllAssignments(allAssignmentsData);
        } catch (error) {
          console.error('Error fetching assignments:', error);
          showError('Failed to load assignments', 'Error');
        } finally {
          setAssignmentsLoading(false);
        }
      };
    
      // Initial data fetch
      useEffect(() => {
        const loadData = async () => {
          setLoading(true);
          await Promise.all([fetchExpenses(), fetchAssignments()]);
          setLoading(false);
        };
        loadData();
      }, []);
    
      // Auto-reload data every 30 seconds
      useEffect(() => {
        const interval = setInterval(() => {
          setLastUpdate(Date.now());
        }, 30000);
        return () => clearInterval(interval);
      }, []);
    
      // Fetch data when lastUpdate changes
      useEffect(() => {
        if (!loading) {
          fetchExpenses();
          fetchAssignments();
        }
      }, [lastUpdate, loading]);
    
      // Filter and pagination logic
      const filteredData = expenseData.filter((item: ExpenseData) => {
        const matchesSearch = (item.category?.toLowerCase() || '').includes(search.toLowerCase());
        const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
        const matchesDate = (!dateFrom || item.expense_date >= dateFrom) && 
                          (!dateTo || item.expense_date <= dateTo);
        return matchesSearch && matchesCategory && matchesDate;
      });
    
      const indexOfLastRecord = currentPage * pageSize;
      const indexOfFirstRecord = indexOfLastRecord - pageSize;
      const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
      const totalPages = Math.ceil(filteredData.length / pageSize);

    if (loading) {
        return (
            <div className="card">
                <h1 className="title">Stock Management</h1>
                <Loading />
            </div>
        );
        
    }
    return (
        <div className='card'>
            <div className='elements'>
                <h1 className='title'>Financial Reports</h1>
                {/* CONTAINER FOR THE SETTINGS */}
                <div className="settings">
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
                                            // fetchReportData(); or any other function to fetch data
                                        }
                                        }}
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
                                            // fetchReportData(); or any other function to fetch data
                                        }
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Export CSV */}
                    <button id="export" ><i className="ri-receipt-line" /> Export CSV</button>
                </div>


                <div className="tabBar-wrapper">
                    <div className={`tabBar ${activeTab === 'profit' ? 'tab-1' : activeTab === 'expense' ? 'tab-2' : 'tab-3'}`}>
                        <button
                        className={activeTab === 'profit' ? 'active' : ''}
                        onClick={() => setActiveTab('profit')}
                        >
                        Profit / Loss Report
                        </button>

                        <button
                        className={activeTab === 'expense' ? 'active' : ''}
                        onClick={() => setActiveTab('expense')}
                        >
                        Expense Reports
                        </button>

                        <button
                        className={activeTab === 'revenue' ? 'active' : ''}
                        onClick={() => setActiveTab('revenue')}
                        >
                        Revenue Reports
                        </button>
                    </div>
                </div>  


                <div className="tabContent">
                    {/* ============ Profit/Loss Report Tab ============ */}
                    {activeTab === 'profit' && 
                    <div className="profitTabContent">
                        <div className="totalPieChart">
                            <div className="total">
                                {/* Container for Expense */}
                                <div className="totalExpense">
                                    <h2>Total Expense</h2>
                                    <p>$0.00</p>
                                </div>

                                {/* Container for Revenue */}
                                <div className="totalRevenue">
                                    <h2>Total Revenue</h2>
                                    <p>$0.00</p>
                                </div>

                                {/* Container for Net Profit */}
                                <div className="totalNetProfit">
                                    <h2>Net Profit</h2>
                                    <p>0%</p>
                                </div>
                            </div>

                            {/* Expense Pie Chart Container */}
                            <div className="pieChartContainer">
                                {/* Placeholder for Pie Chart */}
                                <ExpensesPieChart />
                            </div>

                            {/* Revenue Pie Chart Container */}
                            <div className="pieChartContainer">
                                {/* Placeholder for Pie Chart */}
                                <RevenuePieChart />
                            </div>
                        </div>

                        <div className="expenseRevenueGraph">
                            {/* Placeholder for Expense/Revenue Graph */}
                            <LineChart />
                        </div>
                    </div>}



                    {/* ============ Expense Report Tab ============ */}
                    {activeTab === 'expense' && 
                    <div className="expenseTabContent">
                        <div className="expenseTable">
                            <div className="settings">
                                <div className="searchBar">
                                    <i className="ri-search-line" />
                                    <input
                                        type="text"
                                        placeholder="Search here..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    /> 
                                </div>
                                
                        
                                <div className="filters">
                        
                                    <select value={categoryFilter} id="categoryFilter" onChange={(e) => setCategoryFilter(e.target.value)}>
                                        <option value="">All Categories</option>
                                        <option value="Fuel">Fuel</option>
                                        <option value="Vehicle_Parts">Vehicle Parts</option>
                                        <option value="Tools">Tools</option>
                                        <option value="Equipment">Equipment</option>
                                        <option value="Supplies">Supplies</option>
                                        <option value="Other">Other</option>
                                    </select>                    
                        
                                </div>
                            </div>
                        
                            {/* ==========table===========  */}
                            <div className="table-wrapper">
                                <div className="tableContainer">
                                    <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Expense Date</th>
                                            <th>Source</th>
                                            <th>Category</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentRecords.map(item => {
                                        let source: string;
                                        if (item.assignment_id) {
                                            const assignment = allAssignments.find(a => a.assignment_id === item.assignment_id);
                                            source = assignment ? formatAssignment(assignment) : `Assignment ${item.assignment_id} not found`;
                                        } else if (item.receipt) {
                                            source = formatReceipt(item.receipt);
                                        } else {
                                            source = item.other_source || 'N/A';
                                        }
                        
                                        return (
                                            <tr key={item.expense_id}>
                                            <td>{formatDate(item.expense_date)}</td>
                                            <td>{source}</td>
                                            <td>{item.category === 'Other' ? item.other_category || 'Other' : item.category.replace('_', ' ')}</td>
                                            <td>₱{item.total_amount.toLocaleString()}</td>
                                            </tr>
                                        );
                                        })}
                                    </tbody>
                                    </table>
                                    {currentRecords.length === 0 && !loading && <p>No records found.</p>}
                                </div>
                            </div>
                        
                            <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                            onPageSizeChange={setPageSize}
                            />
                        </div>

                        <div className="pieChartContainer" id="expenseTabPieChart">
                            {/* Placeholder for Pie Chart */}
                            <ExpensesPieChart />
                        </div>

                    </div>}

                    {/* ============ Revenue Report Tab ============ */}
                    {activeTab === 'revenue' && 
                    <div className="revenueTabContent">

                        <div className="revenueTable">
                            <div className="settings">
                                <div className="searchBar">
                                    <i className="ri-search-line" />
                                    <input
                                        type="text"
                                        placeholder="Search here..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    /> 
                                </div>
                                
                        
                                <div className="filters">
                        
                                    <select value={categoryFilter} id="categoryFilter" onChange={(e) => setCategoryFilter(e.target.value)}>
                                        <option value="">All Categories</option>
                                        <option value="Boundary">Boundary-based</option>
                                        <option value="Percentage">Percentage-based</option>
                                        <option value="Bus-Rental">Bus-rental</option>
                                        <option value="Others">Others</option>
                                    </select>                    
                        
                                </div>
                            </div>
                        
                            {/* ==========table===========  */}
                            <div className="table-wrapper">
                                <div className="tableContainer">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Collection Date</th>
                                                <th>Source</th>
                                                <th>Category</th>
                                                <th>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentRecords.map(item => {
                                                const assignment = item.assignment_id 
                                                ? allAssignments.find(a => a.assignment_id === item.assignment_id)
                                                : null;

                                                console.log('Assignment for revenue:', item.revenue_id, assignment); // Debug log

                                                let source: string;
                                                if (item.category === 'Other') {
                                                source = item.other_source || 'N/A';
                                                } else if (assignmentsLoading) {
                                                source = 'Loading...';
                                                } else if (assignment) {
                                                source = formatAssignment(assignment);
                                                } else {
                                                // More descriptive message when assignment is not found
                                                source = item.assignment_id 
                                                    ? `Assignment ${item.assignment_id} not found`
                                                    : 'No assignment linked';
                                                }

                                                return (
                                                <tr key={item.revenue_id}>
                                                    <td>{formatDate(item.collection_date)}</td>
                                                    <td>{source}</td>
                                                    <td>{item.category === 'Other' ? 'Other' : item.category.replace('_', ' ')}</td>
                                                    <td>₱{item.total_amount.toLocaleString()}</td>
                                                </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {currentRecords.length === 0 && !loading && <p>No records found.</p>}
                                </div>
                            </div>
                        
                            <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                            onPageSizeChange={setPageSize}
                            />
                        </div>

                        <div className="pieChartContainer" id="expenseTabPieChart">
                            {/* Placeholder for Pie Chart */}
                            <RevenuePieChart />
                        </div>

                    </div>}
                </div>
                     
            </div>
        </div>
    )
}

export default ReportPage