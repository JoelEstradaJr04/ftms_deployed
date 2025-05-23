"use client";

import React, { useState } from "react";
import "../styles/financialRequest.css"; // External CSS
import PaginationComponent from "../Components/pagination";
import Swal from "sweetalert2";

// ===== Data Type =====
type financialRequestData = {
  id: number;
  date: string;
  request: string;
  department: string;
  amount: number;  
  status: number; //Brian: I think it should be numeric then translate it into words 1=approved, 2=pending, 3=rejected
  priority: number; //1=low, 2=Medium, 3=High

};

const financialRequestPage = () => {
  // ===== State Management =====
  const [data, setData] = useState<financialRequestData[]>([
    //Dummy data
    {
        id: 1,
        date: "2025-05-01",
        request: "Purchase Office Supplies",
        department: "Operations",
        amount: 1500,
        status: 1,
        priority: 3,
    },

    {
        id: 2,
        date: "2024-05-03",
        request: "Purchase Fuel",
        department: "Operations",
        amount: 6000,
        status: 2,
        priority: 2,
    },

    {
        id: 3,
        date: "2024-02-01",
        request: "Purchase decorations",
        department: "Inventory",
        amount: 500,
        status: 3,
        priority: 1,
    }
  ]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const recordsPerPage = pageSize;

  // ===== Filtered Data =====
  const filteredData = data.filter((item) => {
    const matchesSearch = item.request.toLowerCase().includes(search.toLowerCase());
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
      backdrop: false,
      cancelButtonText: 'Cancel',
      background: 'white',
    });

    if (result.isConfirmed) {
      setData((prev) => prev.filter((item) => item.id !== id));
      await Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'The record has been deleted.',
        confirmButtonColor: '#961C1E',
        background: 'white',
        backdrop: false,
      });
    }
  };

  return (
  <>
    <div className="financialRequestPage">

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
            <option value="">All Department</option>
            <option value="Marketing">Inventory</option>
            <option value="Operations">Operations</option>
            <option value="HR">HR</option>
          </select>
          
        </div>
      </div>

      {/*Requests Table */}
      <div className="tableContainer">
        <table>
          <thead>
            <tr>
              <>
                <th>Date</th> {/*Request Date*/}
                <th>Request</th> {/*Request Title */}
                <th>Department</th> {/*Department where request came from */}
                <th>Amount</th> {/*Requested Amount*/}
                <th>Status</th> {/*Pending/ Approved / Rejected */}
                <th>Priority</th> {/*Priority Level (High - Red, Medium - Orange, Low - blue)*/}
              </>
            </tr>
          </thead>
          <tbody>{/*This Maps/Lists the records of requests*/}
            
            {currentRecords.map((item) => (
              <tr key={item.id}>
                <>
                  <td>{item.date}</td>
                  <td>{item.request}</td>
                  <td>{item.department}</td>
                  <td>₱{item.amount.toFixed(2)}</td>
                  <td>{
                      item.status === 1
                          ? 'approved'
                      : item.status === 2
                          ? 'pending'
                      : item.status === 3
                          ? 'rejected'
                      : 'unknown'
                      }</td>
                  <td>{
                          item.priority === 1
                              ? 'low'
                          : item.priority === 2
                              ? 'medium'
                          : item.priority === 3
                              ? 'high'
                          : 'unknown'
                      }
                  </td>
                </>
                
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
    </>
  );
};

export default financialRequestPage;
