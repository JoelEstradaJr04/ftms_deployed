// financial-management\payroll\page.tsx
"use client";

import React, { useState, useEffect, useCallback} from "react";
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
  employee_number: string;
  employee_name: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  employee_status: string;
  hire_date: string;
  termination_date?: string | null;
  job_title: string;
  department: string;
  payroll_period: "Monthly" | "Weekly";
  payroll_start_date: string;
  payroll_end_date: string;
  basic_rate: number;
  days_worked: number;
  // Earnings
  basic_pay: number;
  overtime_regular: number;
  overtime_holiday: number;
  service_incentive_leave: number;
  holiday_pay: number;
  thirteenth_month_pay: number;
  // Benefits
  revenue_benefit: number;
  safety_benefit: number;
  additional_benefits: number;
  // Deductions
  sss_deduction: number;
  philhealth_deduction: number;
  pag_ibig_deduction: number;
  cash_advance: number;
  damage_shortage: number;
  other_deductions: number;
  // Totals
  gross_total_earnings: number;
  total_deductions: number;
  net_pay: number;
  // Status
  status: "Released" | "Pending" | string;
  date_released?: string | null;
};

const PayrollPage = () => {
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

  // Add state for start/end date
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // default to first of month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  // Fetch payroll data from API
  const fetchPayrollData = useCallback(async (isSearch = false) => {
    try {
      if (isSearch) {
        setSearchLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Build query parameters with proper date formatting
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        start: startDate, // Already in YYYY-MM-DD format
        end: endDate,     // Already in YYYY-MM-DD format
      });
      
      if (search.trim()) {
        params.append('search', search.trim());
      }
      
      const response = await fetch(`/api/payroll?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result.data);
      setTotalPages(result.pagination?.totalPages || 1);
      
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
  }, [currentPage, pageSize, startDate, endDate, search]); // Add dependencies that the function uses

  // Fetch data when component mounts or filters change (excluding search)
  useEffect(() => {
    fetchPayrollData(false);
  }, [fetchPayrollData]);  // Added currentPage and pageSize dependencies

  // Separate effect for search with debouncing
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
}, [search, currentPage, fetchPayrollData]); // Add missing dependencies

// Effect to handle page changes
useEffect(() => {
  if (currentPage !== 1) {
    fetchPayrollData(false);
  }
}, [currentPage, pageSize, fetchPayrollData]); // Add missing fetchPayrollData dependency

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
      // Find the full records in memory
      const recordsToRelease = filteredData.filter(r => ids.includes(r.payroll_id));
      // Send the full records to the backend
      await fetch('/api/payroll', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordsToRelease),
      });
      await fetchPayrollData(false);
      showSuccess('Payroll released!', 'Success');
    } catch {
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
            <label style={{marginRight: 8}}>Start Date:
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{marginLeft: 4, marginRight: 16}}
              />
            </label>
            <label style={{marginRight: 8}}>End Date:
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{marginLeft: 4, marginRight: 16}}
              />
            </label>
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
                  <th>Employee Number</th>
                  <th>Employee Name</th>
                  <th>Job Title</th>
                  <th>Department</th>
                  <th>Employee Status</th>
                  <th>Payroll Period</th>
                  <th>Net Pay</th>
                  <th>Total Deductions</th>
                  <th>Gross Earnings</th>
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
                    <td>{item.employee_number}</td>
                    <td>{item.employee_name}</td>
                    <td>{item.job_title}</td>
                    <td>{item.department}</td>
                    <td>{item.employee_status}</td>
                    <td>{item.payroll_period}</td>
                    <td className="netPay">₱{item.net_pay.toLocaleString()}</td>
                    <td className="deduction">₱{item.total_deductions.toLocaleString()}</td>
                    <td className="salary">₱{item.gross_total_earnings.toLocaleString()}</td>
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
