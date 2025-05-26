"use client";

import React, { useState, useEffect } from "react";
import "../styles/expense.css";
import PaginationComponent from "../Components/pagination";
import AddExpense from "../Components/addExpense"; 
import Swal from 'sweetalert2';
import EditExpenseModal from "../Components/editExpense";
import ViewExpenseModal from "../Components/viewExpense";
import { getAllAssignments, type Assignment } from '@/lib/supabase/assignments';
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
      const assignmentsData = await getAllAssignments();
      setAssignments(assignmentsData.filter(a => !a.is_expense_recorded));
      setAllAssignments(assignmentsData);
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

  return (
    <div className="expensePage">
      {(loading || assignmentsLoading) && <div className="loading">Loading...</div>}

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
