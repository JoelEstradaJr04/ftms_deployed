"use client";

import React, { useState } from "react";
import "../styles/expense.css"; // External CSS
import PaginationComponent from "../Components/pagination";
import AddExpenseModal from "../Components/addExpense";
import EditExpenseModal from "../Components/editExpense";
import Swal from "sweetalert2";
import { showSuccess, showError } from '../utility/Alerts';
import ViewExpenseModal from '../Components/viewExpense';
import { calcAmount, Item } from "../utility/calcAmount"; // Importing the Item type



// ===== Data Type =====

type ExpenseData = {
  id: number;
  date: string;
  department: string;
  description: string;
  amount: number;
  items?: Item[];
};



const ExpensePage = () => {
  // ===== State Management =====
  const [data, setData] = useState<ExpenseData[]>([
    //Dummy data
   

  ]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // ===== Modal State =====

  // ----- Add Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  // ----- Edit Expense Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRecord, setRecordToEdit] = useState<ExpenseData | null>(null);
  // ----- View Expense Modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewRecord, setViewRecord] = useState<ExpenseData | null>(null);


  const recordsPerPage = pageSize;

  //====== View Modal Handler ======
  const handleView = (item: ExpenseData) => {
    setViewRecord(item);
    setShowViewModal(true);
  };


  // ===== Filtered Data =====
  const filteredData = data.filter((item) => {
    const matchesSearch = item.description.toLowerCase().includes(search.toLowerCase());
    const matchesDepartment = departmentFilter ? item.department === departmentFilter : true;
    const matchesDate = (!dateFrom || item.date >= dateFrom) && (!dateTo || item.date <= dateTo);
    return matchesSearch && matchesDepartment && matchesDate;
  });

  // ===== Pagination =====
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredData.length / recordsPerPage);

  // ===== Delete Function =====
  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the record permanently.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#961C1E',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      backdrop: false,
      background: 'white',
    });

    if (result.isConfirmed) {
      setData((prev) => prev.filter((item) => item.id !== id));
      await Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'The record has been deleted.',
        confirmButtonColor: '#961C1E',
        backdrop: false,
        background: 'white',
      });
    }
  };


  return (

    <div className="expensePage">

      {/* Filter/Search Controls */}
      <div className="settings">
        <input
          type="text"
          placeholder="Search Name"
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
            id="categoryFilter"
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="">Department</option>
            <option value="Marketing">Inventory</option>
            <option value="Operations">Operations</option>
            <option value="HR">HR</option>
            <option value="Other">Other</option>
          </select>


          <button id="addExpense" onClick={() => {
            setShowExpenseModal(true)}} itemID="addExpense">
            Add Expense
          </button>
        </div>
      </div>

      {/* Expense Table */}
      <div className="tableContainer">
        <table>
          <thead>
            <tr>
              <th><input type="checkbox" /></th>
              <th>Date</th>
              <th>Department</th>
              <th>Expense</th>
              <th>Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.map((item) => (
              <tr key={item.id}>
                <td><input type="checkbox" /></td>
                <td>{item.date}</td>
                <td>{item.department}</td>
                <td>{item.description}</td>
                <td>${item.amount.toFixed(2)}</td>
                <td className="actionButtons">
                  <button className="ri-eye-fill viewBtn"  onClick={() => handleView(item)}></button>

                  {
                    (item.department.toUpperCase() === "OTHER" || item.department.toUpperCase() === "OTHERS") && (
                      <button
                        className="ri-pencil-fill editBtn"
                        onClick={() => {
                          setRecordToEdit(item);
                          setEditModalOpen(true);
                        }}
                      >
                      </button>
                    )
                  }
                                    
                  <button
                    className="ri-delete-bin-fill deleteBtn"
                    onClick={() => handleDelete(item.id)}
                  >
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {currentRecords.length === 0 && <p>No records found.</p>}
      </div>

      {/* Edit Modal 
      {editModalOpen && recordToEdit && (
        <EditExpenseModal
          record={recordToEdit}
          onClose={() => {
            setEditModalOpen(false);
            setRecordToEdit(null);
          }}
          onSave={(updatedRecord) => {
            setData((prev) =>
              prev.map((rec) => (rec.id === updatedRecord.id ? updatedRecord : rec))
            );
            setEditModalOpen(false);
            setRecordToEdit(null);
          }}
        />
      )}*/}

      {/* Pagination */}
      <PaginationComponent
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />


         {/* Modal */}
      {showExpenseModal && (
        <AddExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onAddSuccess={(newRecord: ExpenseData) => {
            setData(prev => [...prev, newRecord]);
          }}
        />
      )}

      {/* View Modal */}
      {showViewModal && viewRecord && (
        <ViewExpenseModal
          onClose={() => setShowViewModal(false)}
          record={viewRecord}
        />
      )}
      
      {/* Edit Modal */}
      {editModalOpen && editRecord && (
        <EditExpenseModal
          record={editRecord}
          onClose={() => setEditModalOpen(false)}
          onSave={(updated) => {
            setData(prev => prev.map(r => (r.id === updated.id ? updated : r)));
            setEditModalOpen(false);
          }}
        />
      )}


    </div>
  );
};

export default ExpensePage;
