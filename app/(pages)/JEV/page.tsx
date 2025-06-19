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
  const today = new Date().toISOString().split('T')[0];
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState("");
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
      title: 'Export Logs',
      text: 'Export functionality not implemented.',
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
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="dateFilter"
              max={today}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="dateFilter"
              max={today}
            />
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="categoryFilter"
              id="categoryFilter"
            >
              <option value="">All Tables</option>
              <option value="ExpenseRecord">Expense Records</option>
              <option value="RevenueRecord">Revenue Records</option>
              <option value="Receipt">Receipts</option>
            </select>
            <button onClick={handleExport} id="export">
              <i className="ri-receipt-line" /> Export Logs
            </button>
          </div>
        </div>
        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
                <thead>
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
                <tbody>
                    <tr>
                        <td></td>
                    </tr>
                    <tr>
                        <td></td>
                    </tr>
                    <tr>
                        <td></td>
                    </tr>
                    <tr>
                        <td></td>
                    </tr>
                    <tr>
                        <td></td>
                    </tr>
                    <tr>
                        <td></td>
                    </tr>
                    <tr>
                        <td></td>
                    </tr>
                    <tr>
                        <td></td>
                    </tr>
                    <tr>
                        <td></td>
                    </tr>
                    <tr>
                        <td></td>
                    </tr>
                    <tr>
                        <td></td>
                    </tr>
                    <tr>
                        <td></td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <th colSpan={2}>Total:</th>
                        <th>[Total Debit Here]</th>
                        <th>[Total Credit Here]</th>
                    </tr>
                </tfoot>
            </table>
            {currentRecords.length === 0 && <p className="noRecords">No entry found.</p>}
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