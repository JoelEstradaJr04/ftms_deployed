// financial-management\payroll\page.tsx
"use client";

import React, { useState, useEffect } from "react";
import "../../../styles/payroll.css";
import "../../../styles/table.css";
import "../../../styles/chips.css";
import PaginationComponent from "../../../Components/pagination";
import Loading from '../../../Components/loading';
import Swal from 'sweetalert2';
import { showSuccess } from '../../../utility/Alerts';
import ViewPayrollModal from "./viewPayroll";

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
  date_released?: string | null;
  // Additional fields for detailed view
  days_of_work?: number;
  basic_rate?: number;
  basic_pay?: number;
  regular?: number;
  holiday?: number;
  service_incentive_leave?: number;
  holiday_pay?: number;
  thirteenth_month_pay?: number;
  revenue?: number;
  safety?: number;
  additional?: number;
  philhealth?: number;
  pag_ibig?: number;
  sss?: number;
  cash_advance?: number;
  damage_shortage?: number;
  gross_total_earnings?: number;
  total_deduction?: number;
  created_at?: string;
  updated_at?: string;
};

// API Response type
type ApiResponse = {
  data: PayrollRecord[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
};

const PayrollPage = () => {
  // Selected Employee IDs
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
  // State
  const [data, setData] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");


  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  // View Payroll modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [recordToView, setRecordToView] = useState<PayrollRecord | null>(null);

  // Fetch payroll data from API
  const fetchPayrollData = async (isSearch = false) => {
    try {

      if (isSearch) {
        setSearchLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
      });

      if (search.trim()) {
        params.append('search', search.trim());
      }

      const response = await fetch(`/api/payroll?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse = await response.json();
      
      setData(result.data);
      setTotalPages(result.pagination.totalPages);
      
      if (isSearch) {
        setSearchLoading(false);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Error fetching payroll data:", err);
      setError("Error retrieving payroll data.");
      if (isSearch) {
        setSearchLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Fetch data when component mounts or filters change (excluding search)
  useEffect(() => {
    fetchPayrollData(false);
  }, [currentPage, pageSize, positionFilter]);

  // Separate effect for search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Reset to first page when searching
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchPayrollData(true);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [search]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault(); // Prevent any form submission
    setSearch(e.target.value);
  };

  // Handle search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent form submission and page reload
  };

  // Handle key press in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission on Enter
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearch("");
  };

  // Handle retry
  const handleRetry = () => {
    fetchPayrollData(false);
  };

  // Filter logic for client-side filtering
  const filteredData = data.filter(item =>
    (!statusFilter || item.status.toLowerCase() === statusFilter.toLowerCase()) &&
    (!positionFilter || item.job_title === positionFilter) &&
    (!search || (
      item.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      item.job_title.toLowerCase().includes(search.toLowerCase()) ||
      item.department.toLowerCase().includes(search.toLowerCase())
    ))
  );

  // Unique positions for filter dropdowns
  const positions = Array.from(new Set(data.map((d) => d.job_title)));

  const handleReleaseWithConfirm = (ids: string[]) => {
    Swal.fire({
      title: 'Confirm Release',
      text: 'Are you sure you want to release this payroll?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#FEB71F',
      confirmButtonText: 'Yes, Release',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      background: 'white',
    }).then((result) => {
      if (result.isConfirmed) {
        handleRelease(ids);
      }
    });
  };

  // Handle release action
  const handleRelease = async (ids: string[]) => {
    if (ids.length === 0) return;
    
    try {
      // Update status in API
      for (const id of ids) {
        await fetch('/api/payroll', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            payroll_id: id,
            status: 'Released',
            date_released: new Date().toISOString()
          })
        });
      }

      // Refresh data
      await fetchPayrollData(false);
      setSelectedIds([]);
      showSuccess('Payroll released!', 'Success');
    } catch (error) {
      console.error('Error releasing payroll:', error);
      setError('Failed to release payroll');
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Payroll Management</h1>
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h1 className="title">Payroll Management</h1>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
          <p>{error}</p>
          <button onClick={handleRetry} style={{ marginTop: '1rem' }}>
            Retry
          </button>
        </div>
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
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
              <i className="ri-search-line" />
              <input
                type="text"
                placeholder="Search here..."
                value={search}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyPress}
                disabled={searchLoading}
              />
              {searchLoading && (
                <div style={{ marginLeft: '8px', color: '#666' }}>
                  <i className="ri-loader-4-line" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              )}
              {search && !searchLoading && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </form>
          </div>

          <div className="filters">
            {/*FILTERS*/}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filterSelect"
            >
              <option value="">All Status</option>
              <option key="pending" value="pending">Pending</option>
              <option key="released" value="released">Released</option>
            </select>

            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="filterSelect"
            >
              <option value="">All Positions</option>
              {positions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>

            <button
              className="releaseAllBtn"
              disabled={filteredData.filter(r => r.status === "Pending").length === 0}
              onClick={() => handleReleaseWithConfirm(filteredData.filter(r => r.status === "Pending").map(r => r.payroll_id))}
            >
              <i className="ri-check-double-line" /> Release All Pending
            </button>
          </div>
        </div>

        {/* Payroll Table */}
        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
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
                {filteredData.map((item, index) => (
                  <tr key={item.payroll_id}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                    setRecordToView(item);
                    setViewModalOpen(true);
                    }}
                  >
                    <td>{(currentPage - 1) * pageSize + index + 1}</td>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReleaseWithConfirm([item.payroll_id]);
                            }}
                            title="Release Payroll"
                          >
                            <i className="ri-check-double-line" />
                          </button>
                        ) : (
                          <button className="releaseBtn" disabled title="Already Released">
                            <i className="ri-check-double-line" />
                          </button>
                        )}
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

        {viewModalOpen && recordToView && (
          <ViewPayrollModal
            record={recordToView}
            onClose={() => {
              setViewModalOpen(false);
              setRecordToView(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PayrollPage;
