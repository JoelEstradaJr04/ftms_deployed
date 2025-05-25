"use client";

import React, { useState, useEffect } from "react";
import "../styles/expense.css";
import PaginationComponent from "../Components/pagination";
import AddExpenseModal from "../Components/addExpense";
import EditExpenseModal from "../Components/editExpense";
import ViewExpenseModal from '../Components/viewExpense';
import { showSuccess, showError } from '../utility/Alerts';

// ===== Data Types =====
type ReceiptItem = {
  receipt_item_id: string;
  item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type Receipt = {
  receipt_id: string;
  supplier: string;
  receipt_date: string;
  vat_reg_tin?: string;
  terms?: string;
  status: string;
  total_amount: number;
  vat_amount?: number;
  total_amount_due?: number;
  items: ReceiptItem[];
};

type ExpenseData = {
  expense_id: string;
  date: string;
  department_from: string;
  category: string;
  total_amount: number;
  receipt?: Receipt;
};

const ExpensePage = () => {
  // ===== State Management =====
  const [data, setData] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // ===== Modal State =====
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRecord, setRecordToEdit] = useState<ExpenseData | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewRecord, setViewRecord] = useState<ExpenseData | null>(null);

  // ===== Fetch Data =====
  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses');
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const expenses = await response.json();
      setData(expenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      showError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  // ===== View Modal Handler =====
  const handleView = (item: ExpenseData) => {
    setViewRecord(item);
    setShowViewModal(true);
  };

  // ===== Delete Handler =====
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete expense');
      
      setData(prev => prev.filter(item => item.expense_id !== id));
      showSuccess('Expense deleted successfully');
    } catch (error) {
      console.error('Error deleting expense:', error);
      showError('Failed to delete expense');
    }
  };

  // ===== Filtered Data =====
  const filteredData = data.filter((item) => {
    const matchesSearch = item.category.toLowerCase().includes(search.toLowerCase());
    const matchesDepartment = departmentFilter ? item.department_from === departmentFilter : true;
    const matchesDate = (!dateFrom || item.date >= dateFrom) && (!dateTo || item.date <= dateTo);
    return matchesSearch && matchesDepartment && matchesDate;
  });

  // ===== Pagination =====
  const indexOfLastRecord = currentPage * pageSize;
  const indexOfFirstRecord = indexOfLastRecord - pageSize;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="expensePage">
      {/* Filter/Search Controls */}
      <div className="settings">
        <input
          type="text"
          placeholder="Search Category"
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
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="">Department</option>
            <option value="Inventory">Inventory</option>
            <option value="Operations">Operations</option>
            <option value="Human_Resources">HR</option>
          </select>

          <button onClick={() => setShowExpenseModal(true)}>
            Add Expense
          </button>
        </div>
      </div>

      {/* Expense Table */}
      <div className="tableContainer">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Department</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.map((item) => (
              <tr key={item.expense_id}>
                <td>{new Date(item.date).toLocaleDateString()}</td>
                <td>{item.department_from}</td>
                <td>{item.category}</td>
                <td>₱{Number(item.total_amount).toFixed(2)}</td>
                <td className="actionButtons">
                  <button 
                    className="ri-eye-fill viewBtn" 
                    onClick={() => handleView(item)}
                  />
                  <button
                    className="ri-pencil-fill editBtn"
                    onClick={() => {
                      setRecordToEdit(item);
                      setEditModalOpen(true);
                    }}
                  />
                  <button
                    className="ri-delete-bin-fill deleteBtn"
                    onClick={() => handleDelete(item.expense_id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {currentRecords.length === 0 && <p>No records found.</p>}
      </div>

      {/* Pagination */}
      <PaginationComponent
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* Modals */}
      {showExpenseModal && (
        <AddExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onAddSuccess={(newRecord: ExpenseData) => {
            setData(prev => [newRecord, ...prev]);
            setShowExpenseModal(false);
            showSuccess('Expense added successfully');
          }}
        />
      )}

      {showViewModal && viewRecord && (
        <ViewExpenseModal
          onClose={() => setShowViewModal(false)}
          record={viewRecord}
        />
      )}
      
      {editModalOpen && editRecord && (
        <EditExpenseModal
          record={editRecord}
          onClose={() => setEditModalOpen(false)}
          onSave={(updated: ExpenseData) => {
            setData(prev => prev.map(r => 
              r.expense_id === updated.expense_id ? updated : r
            ));
            setEditModalOpen(false);
            showSuccess('Expense updated successfully');
          }}
        />
      )}
    </div>
  );
};

export default ExpensePage;
