"use client";

import React, { useState } from "react";
import "../styles/audit.css"; // External CSS
import PaginationComponent from "../Components/pagination";
import Swal from "sweetalert2";

// ===== Data Type =====
type AuditData = {
  id: number;
  date: string;
  department: string;
  description: string;
  amount: number;
};

const AuditPage = () => {
  // ===== State Management =====
  const [data, setData] = useState<AuditData[]>([]);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<AuditData | null>(null);

  const recordsPerPage = pageSize;

  // ===== Filtered Data =====
  const filteredData = data.filter((item) => {
    const matchesSearch = item.description.toLowerCase().includes(search.toLowerCase());
    const matchesModule = moduleFilter ? item.department === moduleFilter : true;
    const matchesDate = (!dateFrom || item.date >= dateFrom) && (!dateTo || item.date <= dateTo);
    return matchesSearch && matchesModule && matchesDate;
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
      background: 'white',
    });

  };

  return (
    <div className="auditPage">

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
            value={moduleFilter}
            id="categoryFilter"
            onChange={(e) => setModuleFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="Dashboard">Dashboard</option>
            <option value="Revenue Mgmt">Revenue Mgmt</option>
            <option value="Expense Mgmt">Expense Mgmt</option>
            <option value="Receipt Mgmtr">Receipt Mgmt</option>
            <option value="Emp Financial Mgmt">Emp Financial Mgmt</option>
            <option value="Financial Request">Financial Request</option>
            <option value="Financial Report">Financial Report</option>
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="tableContainer">
        <table>
          <thead>
            <tr>
              <th><input type="checkbox" /></th>
              <th>Date | Time</th>
              <th>Username</th>
              <th>Module</th>
              <th>Action</th>
              <th>Description</th>
              <th>IP Address</th>
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
                  <button className="viewBtn">👁️</button>
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
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete
                  </button>
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

    </div>
  );
};

export default AuditPage;
