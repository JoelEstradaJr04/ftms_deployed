"use client";

import React, { useState, useEffect } from "react";
import "../../styles/expense.css";
import "../../styles/table.css";
import PaginationComponent from "../../Components/pagination";
import AddExpense from "./addExpense"; 
import Swal from 'sweetalert2';
import EditExpenseModal from "./editExpense";
import ViewExpenseModal from "./viewExpense";
import { getAllAssignmentsWithRecorded } from '@/lib/supabase/assignments';
import { formatDateTime, formatDate } from '../../utility/dateFormatter';
import Loading from '../../Components/loading';
import { showSuccess, showError, showConfirmation } from '../../utility/Alerts';
import { formatDisplayText } from '@/app/utils/formatting';
import ViewReceiptModal from '../receipt/viewReceipt';

// Define interface based on your Prisma ExpenseRecord schema
interface ExpenseRecord {
  expense_id: string;        
  assignment_id?: string;    
  receipt_id?: string;
  category_id: string;
  source_id?: string;
  payment_method_id: string;
  category: {
    category_id: string;
    name: string;
  };
  source?: {
    source_id: string;
    name: string;
  };
  payment_method: {
    id: string;
    name: string;
  };
  total_amount: number;      
  expense_date: string;              
  created_by: string;        
  created_at: string;        
  updated_at?: string;       
  is_deleted: boolean;
  receipt?: Receipt;
  reimbursements?: Reimbursement[];
  // Legacy fields for backward compatibility
  category_name?: string;
  payment_method_name?: string;
  source_name?: string;
}

interface Receipt {
  receipt_id: string;
  supplier: string;
  transaction_date: string;
  vat_reg_tin?: string;
  terms?: {
    id: string;
    name: string;
  };
  date_paid?: string;
  payment_status: {
    id: string;
    name: string;
  };
  total_amount: number;
  vat_amount?: number;
  total_amount_due: number;
  category: {
    category_id: string;
    name: string;
  };
  remarks?: string;
  ocr_confidence?: number;
  ocr_file_path?: string;
  is_expense_recorded: boolean;
  items: ReceiptItem[];
  source?: {
    source_id: string;
    name: string;
  };
  created_by: string;
  created_at: string;
  updated_at?: string;
  updated_by?: string;
  is_deleted: boolean;
}

interface ReceiptItem {
  receipt_item_id: string;
  receipt_id: string;
  item_id: string;
  item: {
    item_id: string;
    item_name: string;
    unit: {
      id: string;
      name: string;
    };
    category: {
      category_id: string;
      name: string;
    };
    other_unit?: string;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  updated_at?: string;
  created_by: string;
  updated_by?: string;
  is_deleted: boolean;
  ocr_confidence?: number;
}

type Reimbursement = {
  reimbursement_id: string;
  expense_id: string;
  employee_id: string;
  employee_name: string;
  job_title?: string;
  amount: number;
  status: {
    id: string;
    name: string;
  };
  requested_date: string;
  approved_by?: string;
  approved_date?: string;
  rejection_reason?: string;
  paid_by?: string;
  paid_date?: string;
  payment_reference?: string;
  payment_method?: string;
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  is_deleted: boolean;
  cancelled_by?: string;
  cancelled_date?: string;
};

// UI data type that matches your schema exactly
type ExpenseData = ExpenseRecord;

// Update Assignment type in this file
interface Assignment {
  assignment_id: string;
  bus_plate_number: string;
  bus_route: string;
  bus_type: string;
  driver_id: string;
  conductor_id: string;
  date_assigned: string;
  trip_fuel_expense: number;
  is_expense_recorded: boolean;
  payment_method: string;
}

// Add Employee type for local use
interface Employee {
  employee_id: string;
  name: string;
  job_title: string;
}

const ExpensePage = () => {
  const [data, setData] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const today = new Date().toISOString().split('T')[0];
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showModal, setShowModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewReceiptModalOpen, setViewReceiptModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<ExpenseData | null>(null);
  const [recordToView, setRecordToView] = useState<ExpenseData | null>(null);
  const [receiptToView, setReceiptToView] = useState<Receipt | null>(null);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  // Format assignment for display
  const formatAssignment = (assignment: Assignment): string => {
    const busType = assignment.bus_type === 'Airconditioned' ? 'A' : 'O';
    const driverEmp = allEmployees.find(e => e.employee_id === assignment.driver_id) as Employee | undefined;
    const conductorEmp = allEmployees.find(e => e.employee_id === assignment.conductor_id) as Employee | undefined;
    return `${busType} | ${assignment.bus_plate_number} - ${assignment.bus_route} | ${driverEmp?.name} & ${conductorEmp?.name}`;
  };

  // Format receipt for display
  const formatReceipt = (receipt: Receipt): string => {
    const paymentStatusName = receipt.payment_status?.name || 'Unknown';
    return `${receipt.supplier} - ${new Date(receipt.transaction_date).toLocaleDateString()} - ₱${receipt.total_amount_due} (${paymentStatusName})`
  };

  // Fetch expenses data
  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses');
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const expensesData = await response.json();
      setData(expensesData);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      showError('Failed to load expenses', 'Error');
    }
  };

  // Fetch assignments data
  const fetchAssignments = async () => {
    try {
      // Get all assignments for reference (including recorded ones)
      const allAssignmentsData = await getAllAssignmentsWithRecorded();
      setAllAssignments(allAssignmentsData);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      showError('Failed to load assignments', 'Error');
    }
  };

  // Fetch employees data
  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (!response.ok) throw new Error('Failed to fetch employees');
      const employeesData = await response.json();
      setAllEmployees(employeesData);
    } catch (error) {
      console.error('Error fetching employees:', error);
      showError('Failed to load employees', 'Error');
    }
  };

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchExpenses(), fetchAssignments(), fetchEmployees()]);
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
    if (!loading && !showModal && !editModalOpen) {
      fetchExpenses();
      fetchAssignments();
    }
  }, [lastUpdate, loading, showModal, editModalOpen]);

  // Filter and pagination logic
const filteredData = data.filter((item: ExpenseData) => {
  // Convert search to lowercase for case-insensitive comparison
  const searchLower = search.toLowerCase();
  
  // Check if search term exists in any field
  const matchesSearch = search === '' || 
    // Basic fields
    item.expense_id.toLowerCase().includes(searchLower) ||
    (item.category?.name?.toLowerCase() || item.category_name?.toLowerCase() || '').includes(searchLower) ||
    item.total_amount.toString().includes(searchLower) ||
    formatDate(item.expense_date).toLowerCase().includes(searchLower) ||
    (item.created_by?.toLowerCase() || '').includes(searchLower) ||
    (item.source?.name?.toLowerCase() || item.source_name?.toLowerCase() || '').includes(searchLower) ||
    
    // Assignment related fields (if available)
    (item.assignment_id?.toLowerCase() || '').includes(searchLower) ||
    
    // Receipt related fields (if available)
    (item.receipt?.supplier?.toLowerCase() || '').includes(searchLower) ||
    (item.receipt?.payment_status?.name?.toLowerCase() || '').includes(searchLower) ||
    (item.receipt?.total_amount_due?.toString() || '').includes(searchLower);
    
  const matchesCategory = categoryFilter ? 
    (item.category?.name === categoryFilter || item.category_name === categoryFilter) : true;
  const matchesDate = (!dateFrom || item.expense_date >= dateFrom) && 
                    (!dateTo || item.expense_date <= dateTo);
  return matchesSearch && matchesCategory && matchesDate;
});

  const indexOfLastRecord = currentPage * pageSize;
  const indexOfFirstRecord = indexOfLastRecord - pageSize;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleAddExpense = async (newExpense: any) => {
    // Remove employee_id if present and source is operations
    if (newExpense.assignment_id && newExpense.driver_reimbursement !== undefined && newExpense.conductor_reimbursement !== undefined) {
      delete newExpense.employee_id;
    }
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense)
      });

      if (!response.ok) throw new Error('Create failed');

      const result: ExpenseRecord = await response.json();
      
      // Update expenses state and trigger a refresh
      setData(prev => [{
        ...result,
        created_at: result.created_at || new Date().toISOString(),
        is_deleted: result.is_deleted ?? false,
      }, ...prev]);
      
      // Trigger immediate data refresh
      setLastUpdate(Date.now());

      showSuccess('Success', 'Expense added successfully');
      setShowModal(false);
    } catch (error) {
      console.error('Create error:', error);
      showError('Error', 'Failed to add expense: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDelete = async (expense_id: string) => {
    const result = await showConfirmation(
      'This will delete the record permanently.',
      'Are you sure?'
    );


    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/expenses/${expense_id}`, {
          method: 'DELETE'
        });

        if (!response.ok) throw new Error('Delete failed');

        setData(prev => prev.filter(item => item.expense_id !== expense_id));
        showSuccess('Deleted!', 'Record deleted successfully');
      } catch (error) {
        console.error('Delete error:', error);
        showError('Error', 'Failed to delete record');
      }
    }
  };

  const handleSaveEdit = async (updatedRecord: {
    expense_id: string;
    expense_date: string;
    total_amount: number;
    other_source?: string;
  }) => {
    try {
      const response = await fetch(`/api/expenses/${updatedRecord.expense_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecord)
      });

      if (!response.ok) throw new Error('Update failed');

      const result = await response.json();
      
      // Update local state by moving the edited record to the top
      setData(prev => {
        // Remove the old version of the record
        const filtered = prev.filter(rec => rec.expense_id !== updatedRecord.expense_id);
        // Create the updated record
        const updated = {
          ...result,
          created_at: result.created_at || new Date().toISOString(),
          is_deleted: result.is_deleted ?? false,
        };
        // Add the updated record at the beginning of the array
        return [updated, ...filtered];
      });

      setEditModalOpen(false);
      setRecordToEdit(null);
      showSuccess('Updated Successfully', 'Record updated successfully');
    } catch (error) {
      console.error('Update error:', error);
      showError('Failed to update record', 'Error');
    }
  };

  const handleViewExpense = (expense: ExpenseData) => {
    console.log('handleViewExpense called with:', expense);
    console.log('expense.receipt:', expense.receipt);
    
    // If the expense is linked to a receipt, show the receipt view
    if (expense.receipt) {
      console.log('Setting receipt to view:', expense.receipt);
      setReceiptToView(expense.receipt);
      setViewReceiptModalOpen(true);
      return;
    }
    
    // For other types of expenses, show the expense modal
    console.log('Setting record to view:', expense);
    setRecordToView(expense);
    setViewModalOpen(true);
  };

  const handleCloseReceiptModal = () => {
    setReceiptToView(null);
    setViewReceiptModalOpen(false);
  };

  const handleCloseViewModal = () => {
    setRecordToView(null);
    setViewModalOpen(false);
  };

  // Generate the file name helper function
  const generateFileName = () => {
    const now = new Date();
    const timeStamp = now.toISOString().replace(/[:.]/g, '-').split('T')[1].slice(0, 8);
    const dateStamp = now.toISOString().split('T')[0];
    
    let fileName = 'expense_records';
    
    if (categoryFilter) {
      fileName += `_${categoryFilter.toLowerCase().replace('_', '-')}`;
    }
    
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom).toISOString().split('T')[0] : 'all';
      const to = dateTo ? new Date(dateTo).toISOString().split('T')[0] : 'present';
      fileName += `_${from}_to_${to}`;
    }
    
    fileName += `_${dateStamp}_${timeStamp}`;
    
    return `${fileName}.csv`;
  };

  const getExportColumns = () => {
    const baseColumns = [
      "Expense Date",
      "Category",
      "Amount",
      "Source Type"
    ];

    if (!categoryFilter) {
      return [
        ...baseColumns,
        "Bus Type",
        "Body Number",
        "Route",
        "Driver Name",
        "Conductor Name",
        "Assignment Date",
        "Receipt Supplier",
        "Receipt Transaction Date",
        "Receipt VAT TIN",
        "Receipt Terms",
        "Receipt Status",
        "Receipt VAT Amount",
        "Receipt Total Due",
        "Other Source Description",
        "Other Category",
        "Payment Method",
        "Employee"
      ];
    }

    if (categoryFilter === 'Other') {
      return [
        ...baseColumns,
        "Other Source Description",
        "Other Category",
        "Payment Method",
        "Employee"
      ];
    }

    return [
      ...baseColumns,
      "Bus Type",
      "Body Number",
      "Route",
      "Driver Name",
      "Conductor Name",
      "Assignment Date",
      "Receipt Supplier",
      "Receipt Transaction Date",
      "Receipt VAT TIN",
      "Receipt Terms",
      "Receipt Status",
      "Receipt VAT Amount",
      "Receipt Total Due",
      "Payment Method",
      "Employee"
    ];
  };

  // Generate export details helper function
  const generateExportDetails = () => {
    let details = `Export Details:\n`;
    details += `Category: ${categoryFilter || 'All Categories'}\n`;
    
    if (dateFrom || dateTo) {
      const from = dateFrom ? formatDate(dateFrom) : 'Beginning';
      const to = dateTo ? formatDate(dateTo) : 'Present';
      details += `Date Range: ${from} to ${to}\n`;
    } else {
      details += `Date Range: All Dates\n`;
    }
    
    details += `Total Records: ${filteredData.length}\n`;
    details += `Export Time: ${new Date().toISOString()}\n`;
    details += `Exported Columns: ${getExportColumns().join(', ')}`;
    
    return details;
  };

  // Add a new function to handle audit logging
  const logExportAudit = async () => {
    try {
      // First get the export ID from the API
      const idResponse = await fetch('/api/generate-export-id');
      if (!idResponse.ok) {
        throw new Error('Failed to generate export ID');
      }
      const { exportId } = await idResponse.json();

      // Generate details without export ID
      const details = generateExportDetails();

      const response = await fetch('/api/auditlogs/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'EXPORT',
          table_affected: 'ExpenseRecord',
          record_id: exportId,
          performed_by: 'ftms_user', // Replace with actual user ID
          details: details
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create audit log');
      }
  
      return exportId;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      throw error;
    }
  };

  // Modify the handleExport function
  const handleExport = () => {
    // Generate confirmation message helper function
    const generateConfirmationMessage = () => {
      let message = `<strong>Expense Records Export</strong><br/><br/>`;
      
      if (categoryFilter) {
        message += `<strong>Category:</strong> ${categoryFilter}<br/>`;
      } else {
        message += `<strong>Category:</strong> All Categories<br/>`;
      }
      
      if (dateFrom || dateTo) {
        const from = dateFrom ? formatDate(dateFrom) : 'Beginning';
        const to = dateTo ? formatDate(dateTo) : 'Present';
        message += `<strong>Date Range:</strong> ${from} to ${to}<br/>`;
      } else {
        message += `<strong>Date Range:</strong> All Dates<br/>`;
      }
      
      message += `<strong>Total Records:</strong> ${filteredData.length}`;
      return message;
    };

    // Show confirmation dialog
    Swal.fire({
      title: 'Confirm Export',
      html: generateConfirmationMessage(),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#FEB71F',
      confirmButtonText: 'Export',
      background: 'white',
      reverseButtons:true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const exportId = await logExportAudit();
          performExport(filteredData, exportId);
          showSuccess('Export completed successfully', 'Exported Successfully');
        } catch (error) {
          console.error('Export error:', error);
          showError('Failed to export data', 'Error');
        }
      }
    });
  };

  const performExport = (recordsToExport: ExpenseData[], exportId: string) => {
    // Generate header comment with consistent expense_date formatting
    const generateHeaderComment = () => {
      let comment = '"# Expense Records Export","","","","","","","","","","","","","","",""\n';
      comment += `"# Export ID:","${exportId}","","","","","","","","","","","","","",""\n`;
      comment += `"# Generated:","${formatDate(new Date())}","","","","","","","","","","","","","",""\n`;
      
      if (categoryFilter) {
        comment += `"# Category:","${categoryFilter}","","","","","","","","","","","","","",""\n`;
      } else {
        comment += '"# Category:","All Categories","","","","","","","","","","","","","",""\n';
      }
      
      if (dateFrom || dateTo) {
        const from = dateFrom ? formatDate(dateFrom) : 'Beginning';
        const to = dateTo ? formatDate(dateTo) : 'Present';
        comment += `"# Date Range:","${from} to ${to}","","","","","","","","","","","","","",""\n`;
      } else {
        comment += '"# Date Range:","All Dates","","","","","","","","","","","","","",""\n';
      }
      
      comment += `"# Total Records:","${recordsToExport.length}","","","","","","","","","","","","","",""\n\n`;
      return comment;
    };

    const columns = getExportColumns();
    const headers = columns.join(",") + "\n";
  
    const rows = recordsToExport.map(item => {
      let source: string = '';
      if (item.assignment_id) {
        const assignment = allAssignments.find(a => a.assignment_id === item.assignment_id);
        if (assignment && 'driver_id' in assignment && 'conductor_id' in assignment) {
          source = formatAssignment(assignment);
        } else {
          source = `Assignment ${item.assignment_id} not found`;
        }
      } else if (item.receipt) {
        source = formatReceipt(item.receipt);
      } else {
        source = item.other_source || 'N/A';
      }

      // Reimbursement display logic
      let reimbursementDisplay = '-';
      if (item.payment_method === 'REIMBURSEMENT' && item.reimbursements && item.reimbursements.length > 0) {
        reimbursementDisplay = item.reimbursements.map(r => `${r.job_title ? r.job_title + ': ' : ''}${r.employee_name} (₱${Number(r.amount).toLocaleString()})`).join(', ');
      }
   
      return (
        <tr key={item.expense_id}>
          <td>{formatDateTime(item.expense_date)}</td>
          <td>{source}</td>
          <td>{formatDisplayText(item.category_name || item.category?.name || '')}</td>
          <td>₱{Number(item.total_amount).toLocaleString()}</td>
          <td>{item.payment_method_name ? (item.payment_method_name === 'REIMBURSEMENT' ? 'Reimbursement' : 'Cash') : (item.payment_method?.name === 'REIMBURSEMENT' ? 'Reimbursement' : 'Cash')}</td>
          <td className="actionButtons">
            <div className="actionButtonsContainer">
              {/* view button */}
              <button className="viewBtn" onClick={() => handleViewExpense(item)} title="View Record">
                <i className="ri-eye-line" />
              </button>
              {/* edit button */}
              <button className="editBtn" onClick={() => {setRecordToEdit(item);setEditModalOpen(true);}} title="Edit Record">
                <i className="ri-edit-2-line" />
              </button>
              {/* delete button */}
              <button className="deleteBtn" onClick={() => handleDelete(item.expense_id)} title="Delete Record">
                <i className="ri-delete-bin-line" />
              </button>
            </div>
          </td>
        </tr>
      );
    }).join("\n");
  
    const blob = new Blob([generateHeaderComment() + headers + rows], { 
      type: "text/csv;charset=utf-8;" 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = generateFileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
        return (
            <div className="card">
                <h1 className="title">Stock Management</h1>
                <Loading />
            </div>
        );
    }


  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Expense Management</h1>
        </div>
        
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

            <div className="filter">
                {/* <Filter
                    sections={filterSections}
                    onApply={handleApplyFilters}
                /> */}
            </div>

            <input
              type="date"
              className="dateFilter"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={today}
            />

            <input
              type="date"
              className="dateFilter"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              max={today}
            />

            <select
              value={categoryFilter}
              id="categoryFilter"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="Fuel">Fuel</option>
              <option value="Vehicle_Parts">Vehicle Parts</option>
              <option value="Tools">Tools</option>
              <option value="Equipment">Equipment</option>
              <option value="Supplies">Supplies</option>
              <option value="Other">Other</option>
            </select>

            <button onClick={handleExport} id="export"><i className="ri-receipt-line" /> Export CSV</button>

            <button onClick={() => setShowModal(true)} id='addExpense'><i className="ri-add-line" /> Add Expense</button>
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
                  <th>Payment Method</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map(item => {
                  let source: string = '';
                  if (item.assignment_id) {
                    const assignment = allAssignments.find(a => a.assignment_id === item.assignment_id);
                    if (assignment && 'driver_id' in assignment && 'conductor_id' in assignment) {
                      source = formatAssignment(assignment);
                    } else {
                      source = `Assignment ${item.assignment_id} not found`;
                    }
                  } else if (item.receipt) {
                    source = formatReceipt(item.receipt);
                  } else {
                    source = item.other_source || 'N/A';
                  }
               
                  // Reimbursement display logic
                  let reimbursementDisplay = '-';
                  if (item.payment_method === 'REIMBURSEMENT' && item.reimbursements && item.reimbursements.length > 0) {
                    reimbursementDisplay = item.reimbursements.map(r => `${r.job_title ? r.job_title + ': ' : ''}${r.employee_name} (₱${Number(r.amount).toLocaleString()})`).join(', ');
                  }
               
                  return (
                    <tr key={item.expense_id}>
                      <td>{formatDateTime(item.expense_date)}</td>
                      <td>{source}</td>
                      <td>{formatDisplayText(item.category_name || item.category?.name || '')}</td>
                      <td>₱{Number(item.total_amount).toLocaleString()}</td>
                      <td>{item.payment_method_name ? (item.payment_method_name === 'REIMBURSEMENT' ? 'Reimbursement' : 'Cash') : (item.payment_method?.name === 'REIMBURSEMENT' ? 'Reimbursement' : 'Cash')}</td>
                      <td className="styles.actionButtons">
                        <div className="actionButtonsContainer">
                          {/* view button */}
                          <button className="viewBtn" onClick={() => handleViewExpense(item)} title="View Record">
                            <i className="ri-eye-line" />
                          </button>
                          {/* edit button */}
                          <button className="editBtn" onClick={() => {setRecordToEdit(item);setEditModalOpen(true);}} title="Edit Record">
                            <i className="ri-edit-2-line" />
                          </button>
                          {/* delete button */}
                          <button className="deleteBtn" onClick={() => handleDelete(item.expense_id)} title="Delete Record">
                            <i className="ri-delete-bin-line" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {currentRecords.length === 0 && !loading && <p>No records found.</p>}
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />

        {showModal && (
          <AddExpense
            onClose={() => setShowModal(false)}
            onAddExpense={handleAddExpense}
            assignments={allAssignments}
            currentUser="ftms_user" // Replace with your actual user ID
          />
        )}

        {editModalOpen && recordToEdit && (
          <EditExpenseModal
            record={{
              expense_id: recordToEdit.expense_id,
              expense_date: recordToEdit.expense_date,
              category: recordToEdit.category,
              other_category: recordToEdit.other_category,
              total_amount: recordToEdit.total_amount,
              assignment: recordToEdit.assignment_id 
                ? (() => {
                    const assignment = allAssignments.find(a => a.assignment_id === recordToEdit.assignment_id);
                    if (!assignment) return undefined;
                    const driver = allEmployees.find(e => e.employee_id === assignment.driver_id);
                    const conductor = allEmployees.find(e => e.employee_id === assignment.conductor_id);
                    return {
                      ...assignment,
                      driver_name: driver ? driver.name : assignment.driver_id,
                      conductor_name: conductor ? conductor.name : assignment.conductor_id,
                    };
                  })()
                : undefined,
              receipt: recordToEdit.receipt,
              other_source: recordToEdit.other_source,
              payment_method: recordToEdit.payment_method,
              reimbursements: recordToEdit.reimbursements,
            }}
            onClose={() => {
              setEditModalOpen(false);
              setRecordToEdit(null);
            }}
            onSave={handleSaveEdit}
          />
        )}

        {viewModalOpen && recordToView && (
          <ViewExpenseModal
            record={{
              expense_id: recordToView.expense_id,
              category: recordToView.category,
              other_category: recordToView.other_category,
              total_amount: recordToView.total_amount,
              expense_date: recordToView.expense_date,
              assignment: recordToView.assignment_id 
                ? (() => {
                    const assignment = allAssignments.find(a => a.assignment_id === recordToView.assignment_id);
                    if (!assignment) return undefined;
                    const driver = allEmployees.find(e => e.employee_id === assignment.driver_id);
                    const conductor = allEmployees.find(e => e.employee_id === assignment.conductor_id);
                    return {
                      ...assignment,
                      driver_name: driver ? driver.name : assignment.driver_id,
                      conductor_name: conductor ? conductor.name : assignment.conductor_id,
                    };
                  })()
                : undefined,
              receipt: recordToView.receipt,
              other_source: recordToView.other_source,
              payment_method: recordToView.payment_method,
              reimbursements: recordToView.reimbursements,
            }}
            onClose={handleCloseViewModal}
          />
        )}

        {viewReceiptModalOpen && receiptToView && (
          <ViewReceiptModal
            record={receiptToView}
            onClose={handleCloseReceiptModal}
          />
        )}
      </div>
    </div>
  );
};

export default ExpensePage;
