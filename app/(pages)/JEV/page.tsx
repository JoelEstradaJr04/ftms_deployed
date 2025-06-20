"use client";
import React, { useState, useEffect } from "react";
import '../../styles/JEV_table.css';
import "../../styles/audit.css";
import PaginationComponent from "../../Components/pagination";
import Swal from "sweetalert2";
import Loading from '../../Components/loading';
import { showSuccess, showError, showConfirmation } from '../../utility/Alerts';
import { formatDisplayText } from '@/app/utils/formatting';

// DUMMY TYPE FOR AUDIT LOGS
type AuditLog = {
  log_id: string;
  timestamp: string;
  action: string;
  table_affected: string;
  record_id: string;
  performed_by: string;
  ip_address?: string | null;
};

// Dummy formatDateTime function
const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString();
};

const JEVpage = () => {


const dummyRecords = [
  {
    responsibilityCenter: "Finance",
    accountExplanation: "Cash on Hand",
    debit: 10000,
    credit: 0,
  },
  {
    responsibilityCenter: "HR",
    accountExplanation: "Salaries Expense",
    debit: 0,
    credit: 8000,
  },
  {
    responsibilityCenter: "IT",
    accountExplanation: "Equipment Purchase",
    debit: 5000,
    credit: 0,
  },
  {
    responsibilityCenter: "Logistics",
    accountExplanation: "Transportation Expense",
    debit: 0,
    credit: 2000,
  },
  {
    responsibilityCenter: "Admin",
    accountExplanation: "Office Supplies",
    debit: 1500,
    credit: 0,
  },
];


  const today = new Date().toISOString().split('T')[0];
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(""); // Tracks the selected filter
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Fetch logs (replace with your actual fetch logic)
  useEffect(() => {
    setLoading(true);
    // Simulate fetch
    setTimeout(() => {
      setLogs([]); // Replace with fetched data
      setLoading(false);
    }, 500);
  }, []);

  // Filter and paginate logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      search === "" ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.table_affected.toLowerCase().includes(search.toLowerCase()) ||
      log.record_id.toLowerCase().includes(search.toLowerCase()) ||
      log.performed_by.toLowerCase().includes(search.toLowerCase());
    const matchesTable = tableFilter === "" || log.table_affected === tableFilter;
    const matchesDateFrom = !dateFrom || log.timestamp >= dateFrom;
    const matchesDateTo = !dateTo || log.timestamp <= dateTo + "T23:59:59";
    return matchesSearch && matchesTable && matchesDateFrom && matchesDateTo;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const currentRecords = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Dummy export handler
  const handleExport = () => {
    Swal.fire({
      title: 'Export JEV',
      text: 'Export functionality is under construction.',
      icon: 'info'
    });
  };

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Journal Entry Voucher</h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="elements">
        <h1 className="title">Journal Entry Voucher</h1>
        <div className="settings">
          <div className="searchBar">
            <i className="ri-search-line" />
            <input
              type="text"
              placeholder="Search entry..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filters">
            <div className="filterDate">
                {/* DROPDOWN FILTER OF PERIODS */}
                <div className="filter">
                    <label htmlFor="dateFilter">Filter By:</label>
                    <select
                        value={dateFilter}
                        id="dateFilter"
                        onChange={(e) => {
                        setDateFilter(e.target.value);
                        if (e.target.value !== 'Custom') {
                            setDateFrom('');
                            setDateTo('');
                        }
                        }}
                    >
                        <option value="">All</option>
                        <option value="Day">Today</option>
                        <option value="Month">This Month</option>
                        <option value="Year">This Year</option>
                        <option value="Custom">Custom</option>
                    </select>
                </div>

                {dateFilter === "Custom" && (
                    <div className="dateRangePicker">
                        <div className="date">
                            <label htmlFor="startDate">Start Date:</label>
                            <input
                                type="date"
                                id="startDate"
                                name="startDate"
                                value={dateFrom}
                                onChange={(e) => {
                                setDateFrom(e.target.value);
                                //   if (dateTo) {
                                //     fetchDashboardData();
                                //   }
                                }}
                                max={today}
                            />
                        </div>

                        <div className="date">
                            <label htmlFor="endDate">End Date:</label>
                            <input
                                type="date"
                                id="endDate"
                                name="endDate"
                                value={dateTo}
                                onChange={(e) => {
                                setDateTo(e.target.value);
                                //   if (dateFrom) {
                                //     fetchDashboardData();
                                //   }
                                }}
                                max={today}
                            />
                        </div>
                    </div>
                )}
            </div>
            <button onClick={handleExport} id="export">
              <i className="ri-receipt-line" /> Export JEV
            </button>
          </div>
        </div>
        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
                <thead className="JEVhead">
                    <tr>
                        <th rowSpan={3} className="responsibility-center">Responsibility Centers</th>
                        <th colSpan={3}>Accounting Entries</th>
                    </tr>
                    <tr>
                        <th rowSpan={2} className="account">Account and Explanation</th>
                        <th colSpan={2}>Amount</th>
                    </tr>
                    <tr>
                        <th>Debit</th>
                        <th>Credit</th>
                    </tr>
                </thead>
                <tbody className="JEVbody">
                    {dummyRecords
                        .filter(
                            (rec) =>
                                rec.responsibilityCenter.toLowerCase().includes(search.toLowerCase()) ||
                                rec.accountExplanation.toLowerCase().includes(search.toLowerCase()) ||
                                rec.debit.toString().includes(search) ||
                                rec.credit.toString().includes(search)
                        )
                        .map((rec, idx) => (
                            <tr key={idx}>
                                <td>{rec.responsibilityCenter}</td>
                                <td>{rec.accountExplanation}</td>
                                <td>{rec.debit}</td>
                                <td>{rec.credit}</td>
                            </tr>
                    ))}
                    {currentRecords.length === 0 && <p className="noRecords">No entry found.</p>}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={2} style={{ fontWeight: "bold" }}>Total:</td>
                        <td style={{ fontWeight: "bold", textAlign: "center" }}>
                            {dummyRecords.reduce((sum, rec) => sum + rec.debit, 0)}
                        </td>
                        <td style={{ fontWeight: "bold", textAlign: "center" }}>
                            {dummyRecords.reduce((sum, rec) => sum + rec.credit, 0)}
                        </td>
                    </tr>
                </tfoot>
            </table>
            
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

export default JEVpage;