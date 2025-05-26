"use client";

import React, { useState, useEffect } from "react";
import "../styles/expense.css";
import PaginationComponent from "../Components/pagination";
import AddExpense from "../Components/addExpense"; 
import Swal from 'sweetalert2';
import EditExpenseModal from "../Components/editExpense";
import ViewExpenseModal from "../Components/viewExpense";
import { getUnrecordedExpenseAssignments, getAllAssignmentsWithRecorded, type Assignment } from '@/lib/supabase/assignments';
import { formatDate } from '../utility/dateFormatter';

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

const ExpensePage = () => {
  const [data, setData] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showModal, setShowModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<ExpenseData | null>(null);
  const [recordToView, setRecordToView] = useState<ExpenseData | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Format assignment for display
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
      setData(expensesData);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      Swal.fire('Error', 'Failed to load expenses', 'error');
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
      Swal.fire('Error', 'Failed to load assignments', 'error');
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
    if (!loading && !showModal && !editModalOpen) {
      fetchExpenses();
      fetchAssignments();
    }
  }, [lastUpdate, loading, showModal, editModalOpen]);

  // Filter and pagination logic
  const filteredData = data.filter((item: ExpenseData) => {
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

  const handleAddExpense = async (newExpense: {
    category: string;
    assignment_id?: string;
    receipt_id?: string;
    total_amount: number;
    expense_date: string;
    created_by: string;
    other_source?: string;
    other_category?: string;
  }) => {
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
        expense_id: result.expense_id,
        category: result.category,
        total_amount: Number(result.total_amount),
        expense_date: new Date(result.expense_date).toISOString().split('T')[0],
        created_by: result.created_by,
        assignment_id: result.assignment_id,
        receipt_id: result.receipt_id,
        other_source: result.other_source,
        other_category: result.other_category,
        receipt: result.receipt
      }, ...prev]);
      
      // Trigger immediate data refresh
      setLastUpdate(Date.now());

      Swal.fire('Success', 'Expense added successfully', 'success');
      setShowModal(false);
    } catch (error) {
      console.error('Create error:', error);
      Swal.fire('Error', 'Failed to add expense: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    }
  };

  const handleDelete = async (expense_id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the record permanently.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#961C1E',
      confirmButtonText: 'Yes, delete it!',
      background: 'white',
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/expenses/${expense_id}`, {
          method: 'DELETE'
        });

        if (!response.ok) throw new Error('Delete failed');

        setData(prev => prev.filter(item => item.expense_id !== expense_id));
        Swal.fire('Deleted!', 'Record deleted successfully', 'success');
      } catch (error) {
        console.error('Delete error:', error);
        Swal.fire('Error', 'Failed to delete record', 'error');
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
          expense_id: result.expense_id,
          category: result.category,
          total_amount: Number(result.total_amount),
          expense_date: new Date(result.expense_date).toISOString().split('T')[0],
          created_by: result.created_by,
          assignment_id: result.assignment_id,
          receipt_id: result.receipt_id,
          other_source: result.other_source,
          receipt: result.receipt
        };
        // Add the updated record at the beginning of the array
        return [updated, ...filtered];
      });

      setEditModalOpen(false);
      setRecordToEdit(null);
      Swal.fire('Success', 'Record updated successfully', 'success');
    } catch (error) {
      console.error('Update error:', error);
      Swal.fire('Error', 'Failed to update record', 'error');
    }
  };

  const handleViewExpense = (expense: ExpenseData) => {
    setRecordToView(expense);
    setViewModalOpen(true);
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
        "Other Category"
      ];
    }

    if (categoryFilter === 'Other') {
      return [
        ...baseColumns,
        "Other Source Description",
        "Other Category"
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
      "Receipt Total Due"
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
      cancelButtonColor: '#961C1E',
      confirmButtonText: 'Export',
      background: 'white',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const exportId = await logExportAudit();
          performExport(filteredData, exportId);
          Swal.fire('Success', 'Export completed successfully', 'success');
        } catch (error) {
          console.error('Export error:', error);
          Swal.fire('Error', 'Failed to export data', 'error');
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
      const assignment = item.assignment_id 
        ? allAssignments.find(a => a.assignment_id === item.assignment_id)
        : null;

      const escapeField = (field: string | undefined | number) => {
        if (field === undefined || field === null) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      };

      const rowData: string[] = [];
    
      columns.forEach(col => {
        switch(col) {
          case "Expense Date":
            rowData.push(escapeField(formatDate(item.expense_date)));
            break;
          case "Category":
            rowData.push(escapeField(item.category === 'Other' ? item.other_category || 'Other' : item.category.replace('_', ' ')));
            break;
          case "Amount":
            rowData.push(escapeField(Number(item.total_amount).toFixed(2)));
            break;
          case "Source Type":
            rowData.push(escapeField(assignment ? 'Assignment' : item.receipt ? 'Receipt' : 'Other'));
            break;
          case "Bus Type":
            rowData.push(escapeField(assignment?.bus_type));
            break;
          case "Body Number":
            rowData.push(escapeField(assignment?.bus_bodynumber));
            break;
          case "Route":
            rowData.push(escapeField(assignment?.bus_route));
            break;
          case "Driver Name":
            rowData.push(escapeField(assignment?.driver_name));
            break;
          case "Conductor Name":
            rowData.push(escapeField(assignment?.conductor_name));
            break;
          case "Assignment Date":
            rowData.push(escapeField(assignment?.date_assigned ? formatDate(assignment.date_assigned) : ''));
            break;
          case "Receipt Supplier":
            rowData.push(escapeField(item.receipt?.supplier));
            break;
          case "Receipt Transaction Date":
            rowData.push(escapeField(item.receipt?.transaction_date ? formatDate(item.receipt.transaction_date) : ''));
            break;
          case "Receipt VAT TIN":
            rowData.push(escapeField(item.receipt?.vat_reg_tin));
            break;
          case "Receipt Terms":
            rowData.push(escapeField(item.receipt?.terms));
            break;
          case "Receipt Status":
            rowData.push(escapeField(item.receipt?.status));
            break;
          case "Receipt VAT Amount":
            rowData.push(escapeField(item.receipt?.vat_amount ? Number(item.receipt.vat_amount).toFixed(2) : ''));
            break;
          case "Receipt Total Due":
            rowData.push(escapeField(item.receipt?.total_amount_due ? Number(item.receipt.total_amount_due).toFixed(2) : ''));
            break;
          case "Other Source Description":
            rowData.push(escapeField(item.other_source));
            break;
          case "Other Category":
            rowData.push(escapeField(item.other_category));
            break;
          default:
            rowData.push('');
        }
      });
      return rowData.join(',');
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

  return (
    <div className="expensePage">
      {(loading || assignmentsLoading) && <div className="loading">Loading...</div>}

      <div className="importExport">
        <button onClick={handleExport}>Export CSV</button>
      </div>

      <div className="settings">
        <input
          type="text"
          placeholder="Search by category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="filters">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />

          <select
            value={categoryFilter}
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

          <button onClick={() => setShowModal(true)} id='addExpense'>
            Add Expense
          </button>
        </div>
      </div>

      <div className="tableContainer">
        <table>
          <thead>
            <tr>
              <th>Expense Date</th>
              <th>Source</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Action</th>
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
                  <td className="actionButtons">
                    <button 
                      className="viewBtn" 
                      onClick={() => handleViewExpense(item)}
                    >
                      View
                    </button>
                    <button 
                      className="editBtn" 
                      onClick={() => {
                        setRecordToEdit(item);
                        setEditModalOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      className="deleteBtn" 
                      onClick={() => handleDelete(item.expense_id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {currentRecords.length === 0 && !loading && <p>No records found.</p>}
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
          assignments={assignments}
          currentUser="ftms_user" // Replace with your actual user ID
        />
      )}

      {editModalOpen && recordToEdit && (
        <EditExpenseModal
          record={{
            expense_id: recordToEdit.expense_id,
            expense_date: recordToEdit.expense_date,
            category: recordToEdit.category,
            source: recordToEdit.assignment_id 
              ? formatAssignment(allAssignments.find(a => a.assignment_id === recordToEdit.assignment_id)!)
              : recordToEdit.receipt
              ? formatReceipt(recordToEdit.receipt)
              : recordToEdit.other_source || 'N/A',
            amount: recordToEdit.total_amount,
            assignment_id: recordToEdit.assignment_id,
            receipt_id: recordToEdit.receipt_id,
            other_source: recordToEdit.other_source
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
              ? allAssignments.find(a => a.assignment_id === recordToView.assignment_id)
              : undefined,
            receipt: recordToView.receipt,
            other_source: recordToView.other_source
          }}
          onClose={handleCloseViewModal}
        />
      )}
    </div>
  );
};

export default ExpensePage;
