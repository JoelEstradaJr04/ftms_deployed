"use client";

import React, { useState, useEffect } from "react";
import "../../../styles/payroll.css";
import "../../../styles/table.css";
import "../../../styles/chips.css";
import PaginationComponent from "../../../Components/pagination";
import Loading from '../../../Components/loading';
import { showSuccess } from '../../../utility/Alerts';

// Payroll record type
type PayrollRecord = {
  payroll_id: string;
  employee_name: string;
  job_title: string;
  department: string;
  payroll_period: "Monthly" | "Weekly";
  net_pay: number;
  deduction: number;
  salary: number;
  status: "Released" | "Pending" | string;
};

// Dummy data for demonstration
const dummyPayrolls: PayrollRecord[] = [
  {
    payroll_id: "1",
    employee_name: "Juan Dela Cruz",
    job_title: "Driver",
    department: "Operations",
    payroll_period: "Monthly",
    net_pay: 18000,
    deduction: 2000,
    salary: 20000,
    status: "Released",
  },
  {
    payroll_id: "2",
    employee_name: "Maria Santos",
    job_title: "Conductor",
    department: "Operations",
    payroll_period: "Weekly",
    net_pay: 4500,
    deduction: 500,
    salary: 5000,
    status: "Pending",
  },
  // Add more dummy records as needed
];

const PayrollPage = () => {
  // Selected Employee IDs
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
  // State
  const [data, setData] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null); // Fixed: use error state correctly

  // Filters
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleEdit = (item: PayrollRecord) => {
    console.log("Editing payroll:", item);
  };

  // Fetch payroll data (simulate API)
  useEffect(() => {
    setLoading(true);
    setError(null);
    // Simulate API delay
    setTimeout(() => {
      try {
        // Replace with real API call
        setData(dummyPayrolls);
        setLoading(false);
      } catch (err) { 
        console.error("Error fetching payroll data:", err);
        setError("Error retrieving payroll data.");
        setLoading(false);
      }
    }, 800);
  }, []); // No need to include setError

  // Filter logic
  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      item.job_title.toLowerCase().includes(search.toLowerCase());
    const matchesDept = departmentFilter
      ? item.department === departmentFilter
      : true;
    const matchesPeriod = periodFilter
      ? item.payroll_period === periodFilter
      : true;
    return matchesSearch && matchesDept && matchesPeriod;
  });

  // Pagination logic
  const indexOfLastRecord = currentPage * pageSize;
  const indexOfFirstRecord = indexOfLastRecord - pageSize;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Unique departments and periods for filter dropdowns
  const departments = Array.from(new Set(data.map((d) => d.department)));
  const periods = Array.from(new Set(data.map((d) => d.payroll_period)));

  // Handle release action
  const handleRelease = (ids: string[]) => {
    if (ids.length === 0) return;
    setData(prev =>
      prev.map(item =>
        ids.includes(item.payroll_id) && item.status === "Pending"
          ? { ...item, status: "Released" }
          : item
      )
    );
    setSelectedIds([]);
    showSuccess('Payroll released!', 'Success');
  };

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Payroll Management</h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Payroll Management</h1>
        </div>

        <div className="settings">
          <div className="searchBar">
            <i className="ri-search-line" />
            <input
              type="text"
              placeholder="Search employee or job title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filters">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="filterSelect"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="filterSelect"
            >
              <option value="">All Payroll Periods</option>
              {periods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>

            <button
              className="releaseAllBtn"
              disabled={selectedIds.length === 0}
              onClick={() => handleRelease(selectedIds)}
            >
              <i className="ri-check-double-line" /> Release
            </button>
          </div>
        </div>

        {/* Payroll Table */}
        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={
                        filteredData.length > 0 &&
                        filteredData.filter(r => r.status === "Pending").every(r => selectedIds.includes(r.payroll_id))
                      }
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedIds(filteredData.filter(r => r.status === "Pending").map(r => r.payroll_id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </th>
                  <th>Employee Name</th>
                  <th>Job Title</th>
                  <th>Department</th>
                  <th>Payroll Period</th>
                  <th>Net Pay</th>
                  <th>Deduction</th>
                  <th>Salary</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map((item) => (
                  <tr key={item.payroll_id}>
                    <td>
                      {item.status === "Pending" && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.payroll_id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedIds(prev => [...prev, item.payroll_id]);
                            } else {
                              setSelectedIds(prev => prev.filter(id => id !== item.payroll_id));
                            }
                          }}
                        />
                      )}
                    </td>
                    <td>{item.employee_name}</td>
                    <td>{item.job_title}</td>
                    <td>{item.department}</td>
                    <td>{item.payroll_period}</td>
                    <td className="netPay">₱{item.net_pay.toLocaleString()}</td>
                    <td className="deduction">₱{item.deduction.toLocaleString()}</td>
                    <td className="salary">₱{item.salary.toLocaleString()}</td>
                    <td>
                      <span className={`chip ${item.status}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <div className="actionButtonsContainer">
                        {item.status === "Pending" ? (
                          <button
                            className="releaseBtn"
                            onClick={() => handleRelease([item.payroll_id])}
                            title="Release Payroll"
                          >
                            <i className="ri-check-double-line" />
                          </button>
                        ) : (
                          <button className="releaseBtn" disabled title="Already Released">
                            <i className="ri-check-double-line" />
                          </button>
                        )}
                        <button
                          className="editBtn"
                          onClick={() => handleEdit(item)}
                          title="Edit Payroll"
                          disabled={item.status !== "Pending"} // Disable if not pending
                        >
                          <i className="ri-edit-2-line" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filteredData.length === 0 && (
              <p>No payroll records found.</p>
            )}
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
};

export default PayrollPage;
