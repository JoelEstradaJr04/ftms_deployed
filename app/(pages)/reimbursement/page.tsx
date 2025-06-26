"use client";
import React, { useState, useEffect } from "react";
import '../../styles/table.css';
import "../../styles/reimbursement.css";
import PaginationComponent from "../../Components/pagination";
import Loading from '../../Components/loading';
import { showSuccess, showError, showConfirmation } from '../../utility/Alerts';
import ViewReimbursement from "./viewReimbursement";
import styles from '../../styles/ExportConfirmationModal.module.css';
import { formatDateTime } from '../../utility/dateFormatter';

// REIMBURSEMENT TYPE
type Reimbursement = {
  reimbursement_id: string;
  expense_id: string;
  employee_id: string;
  employee_name: string;
  created_at: string;
  submitted_date: string;
  approved_by: string | null;
  approved_date: string | null;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid' | 'Cancelled';
  amount: number | null;
  rejection_reason: string | null;
  paid_date: string | null;
  payment_reference: string | null;
  notes: string;
  cancelled_by?: string | null;
  cancelled_date?: string | null;
  updated_at?: string | null;
};

// Update ApiReimbursement to match your Prisma schema structure
type ApiReimbursement = {
  reimbursement_id: string;
  expense_id: string;
  employee_id: string;
  employee_name: string;
  created_at: string;
  requested_date: string;
  approved_by: string | null;
  approved_date: string | null;
  // Update to match schema - status is a relation object
  status: {
    id: string;
    name: string;
  };
  amount: number | null;
  rejection_reason: string | null;
  paid_date: string | null;
  payment_reference: string | null;
  cancelled_by?: string | null;
  cancelled_date?: string | null;
  updated_at?: string | null;
};

// Fix status type for Reimbursement - ADD CANCELLED mapping
const statusMap = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
};

const ReimbursementPage = () => {
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(""); // Tracks the selected filter
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedReimbursement, setSelectedReimbursement] = useState<Reimbursement | null>(null);
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  
  // Add state for reject modal
  const [rejectModal, setRejectModal] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch reimbursements (replace with your actual fetch logic)
  const fetchReimbursements = async (
    setLoading: (b: boolean) => void,
    setReimbursements: (r: Reimbursement[]) => void
  ) => {
    setLoading(true);
    try {
      const res = await fetch('/api/reimbursement');
      console.log('API response status:', res.status);
      const text = await res.text();
      console.log('API response text:', text);
      if (!res.ok) throw new Error('Failed to fetch reimbursements');
      const data: ApiReimbursement[] = JSON.parse(text);
      setReimbursements(
        data.map((item) => {
          // Fix: Access status.name instead of status_name
          const statusKey = (item.status?.name || '').toUpperCase() as keyof typeof statusMap;
          const mappedStatus = statusMap[statusKey] ||
            (item.status?.name ? item.status.name.charAt(0).toUpperCase() + item.status.name.slice(1).toLowerCase() : 'Unknown');
          return {
            reimbursement_id: item.reimbursement_id,
            expense_id: item.expense_id,
            employee_id: item.employee_id,
            employee_name: item.employee_name,
            created_at: item.created_at ? item.created_at : '',
            submitted_date: item.requested_date ? item.requested_date : '',
            approved_by: item.approved_by,
            approved_date: item.approved_date ? item.approved_date : null,
            status: mappedStatus as Reimbursement['status'],
            amount: Number(item.amount),
            rejection_reason: item.rejection_reason,
            paid_date: item.paid_date ? item.paid_date : null,
            payment_reference: item.payment_reference,
            notes: '',
            cancelled_by: item.cancelled_by ?? null,
            cancelled_date: item.cancelled_date ? item.cancelled_date : null,
            updated_at: item.updated_at ? item.updated_at : null,
          };
        })
        // Sort by updated_at (or created_at if updated_at is null) descending (latest first)
        .sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at).getTime();
          const dateB = new Date(b.updated_at || b.created_at).getTime();
          return dateB - dateA;
        })
      );
    } catch {
      showError('Failed to fetch reimbursements', 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReimbursements(setLoading, setReimbursements);
  }, []);

  // Handle reimburse action
  const handleReimburse = async (reimbursementId: string) => {
    const result = await showConfirmation(
      'Process Reimbursement',
      'Are you sure you want to process this reimbursement?'
    );
    
    if (result.isConfirmed) {
      try {
        const res = await fetch('/api/reimbursement', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reimbursement_id: reimbursementId,
            action: 'PAY',
            performed_by: 'ftms_user', // Replace with actual user
            payment_reference: `PAY${Date.now()}`,
            payment_method: 'CASH', // Or get from UI if needed
          })
        });
        if (!res.ok) throw new Error('Failed to process reimbursement');
        showSuccess('Reimbursement processed successfully!', 'Success');
        fetchReimbursements(setLoading, setReimbursements);
      } catch {
        showError('Failed to process reimbursement', 'Error');
      }
    }
  };

  const filteredReimbursements = reimbursements.filter(reimbursement => {
    const searchLower = search.toLowerCase();
    const matchesEmployee = (reimbursement.employee_name ?? '').toLowerCase().includes(searchLower);
    const matchesSubmittedDate = reimbursement.submitted_date
      ? formatDateTime(reimbursement.submitted_date).toLowerCase().includes(searchLower)
      : false;
    
    // Finalized By / Finalized Date
    let finalizedBy = 'N/A';
    let finalizedDate = 'N/A';
    if (reimbursement.status === 'Approved' || reimbursement.status === 'Rejected') {
      finalizedBy = reimbursement.approved_by || 'N/A';
      finalizedDate = reimbursement.approved_date ? formatDateTime(reimbursement.approved_date) : 'N/A';
    } else if (reimbursement.status === 'Cancelled') {
      finalizedBy = reimbursement.cancelled_by || 'N/A';
      finalizedDate = reimbursement.cancelled_date ? formatDateTime(reimbursement.cancelled_date) : 'N/A';
    } else if (reimbursement.status === 'Paid') {
      finalizedBy = reimbursement.paid_date ? 'ftms_user' : 'N/A';
      finalizedDate = reimbursement.paid_date ? formatDateTime(reimbursement.paid_date) : 'N/A';
    }

    const matchesFinalized =
      (finalizedBy ?? '').toLowerCase().includes(searchLower) ||
      (finalizedDate ?? '').toLowerCase().includes(searchLower);
    const matchesStatusText = (reimbursement.status ?? '').toLowerCase().includes(searchLower);
      
    // Amount
    const matchesAmount = (reimbursement.amount ?? 0).toFixed(2).includes(search);
    // Paid Date
    const matchesPaidDate = reimbursement.paid_date
      ? formatDateTime(reimbursement.paid_date).toLowerCase().includes(searchLower)
      : false;

    const matchesSearch =
      search === "" ||
      matchesEmployee ||
      matchesSubmittedDate ||
      matchesFinalized ||
      matchesStatusText ||
      matchesAmount ||
      matchesPaidDate;

    const matchesStatus = statusFilter === "" || reimbursement.status === statusFilter;

    // Date filter using submitted_date
    let matchesDate = true;
    if (dateFilter === "Day") {
      matchesDate = reimbursement.submitted_date === today;
    } else if (dateFilter === "Month") {
      const [year, month] = today.split('-');
      matchesDate = reimbursement.submitted_date.startsWith(`${year}-${month}`);
    } else if (dateFilter === "Year") {
      const [year] = today.split('-');
      matchesDate = reimbursement.submitted_date.startsWith(year);
    } else if (dateFilter === "Custom") {
      matchesDate =
        (!dateFrom || reimbursement.submitted_date >= dateFrom) &&
        (!dateTo || reimbursement.submitted_date <= dateTo);
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredReimbursements.length / pageSize);
  const currentRecords = filteredReimbursements.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleApprove = async (reimbursementId: string) => {
    const result = await showConfirmation(
      'Approve Reimbursement',
      'Are you sure you want to approve this reimbursement?'
    );
    
    if (result.isConfirmed) {
      try {
        const res = await fetch('/api/reimbursement', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reimbursement_id: reimbursementId,
            action: 'APPROVE',
            performed_by: 'ftms_user', // Replace with actual user
          })
        });
        if (!res.ok) throw new Error('Failed to approve reimbursement');
        showSuccess('Reimbursement approved successfully!', 'Success');
        fetchReimbursements(setLoading, setReimbursements);
      } catch {
        showError('Failed to approve reimbursement', 'Error');
      }
    }
  };

  // Add cancel handler
  const handleCancel = async (reimbursementId: string) => {
    const result = await showConfirmation(
      'Cancel Reimbursement',
      'Are you sure you want to cancel this reimbursement?'
    );
    if (result.isConfirmed) {
      try {
        const res = await fetch('/api/reimbursement', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reimbursement_id: reimbursementId,
            action: 'CANCEL',
            performed_by: 'ftms_user', // Replace with actual user
          })
        });
        if (!res.ok) throw new Error('Failed to cancel reimbursement');
        showSuccess('Reimbursement cancelled successfully!', 'Success');
        fetchReimbursements(setLoading, setReimbursements);
      } catch {
        showError('Failed to cancel reimbursement', 'Error');
      }
    }
  };

  // Add reject handler
  const handleReject = async (reimbursementId: string, reason: string) => {
    if (!reason) {
      showError('Rejection reason is required', 'Error');
      return;
    }
    try {
      const res = await fetch('/api/reimbursement', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reimbursement_id: reimbursementId,
          action: 'REJECT',
          performed_by: 'ftms_user', // Replace with actual user
          rejection_reason: reason,
        })
      });
      if (!res.ok) throw new Error('Failed to reject reimbursement');
      showSuccess('Reimbursement rejected successfully!', 'Success');
      setRejectModal({ open: false, id: null });
      setRejectionReason('');
      fetchReimbursements(setLoading, setReimbursements);
    } catch {
      showError('Failed to reject reimbursement', 'Error');
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Reimbursement Management</h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="elements">
        <h1 className="title">Reimbursement Management</h1>
        <div className="settings">
          <div className="searchBar">
            <i className="ri-search-line" />
            <input
              type="text"
              placeholder="Search reimbursements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filters">
            <div className="filterDate">
                {/* STATUS FILTER */}
                <div className="reimbursement-filter">
                    <label htmlFor="statusFilter">Status:</label>
                    <select
                        value={statusFilter}
                        id="statusFilter"
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Paid">Paid</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>
                {/* DROPDOWN FILTER OF PERIODS */}
                <div className="reimbursement-filter">
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
                                onChange={(e) => setDateFrom(e.target.value)}
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
                                onChange={(e) => setDateTo(e.target.value)}
                                max={today}
                            />
                        </div>
                    </div>
                )}
            </div>
          </div>
        </div>
        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Submitted Date</th>
                    <th>Finalized By / Finalized Date</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Paid Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.map((item) => {
                    // Compute finalized by/date based on status
                    let finalizedBy = 'N/A';
                    let finalizedDate = 'N/A';
                    if (item.status === 'Approved' || item.status === 'Rejected') {
                      finalizedBy = item.approved_by || 'N/A';
                      finalizedDate = item.approved_date ? formatDateTime(item.approved_date) : 'N/A';
                    } else if (item.status === 'Cancelled') {
                      finalizedBy = item.cancelled_by || 'N/A';
                      finalizedDate = item.cancelled_date ? formatDateTime(item.cancelled_date) : 'N/A';
                    } else if (item.status === 'Paid') {
                      finalizedBy = item.paid_date ? 'ftms_user' : 'N/A';
                      finalizedDate = item.paid_date ? formatDateTime(item.paid_date) : 'N/A';
                    }

                    // Action buttons logic
                    const renderActions = () => {
                      const normalizedStatus = (item.status || '').toLowerCase();
                      switch (normalizedStatus) {
                        case 'pending':
                          return (
                            <>
                              <button
                                onClick={e => { e.stopPropagation(); handleApprove(item.reimbursement_id); }}
                                className="action-btn approve-btn"
                              >
                                Approve
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); setRejectModal({ open: true, id: item.reimbursement_id }); }}
                                className="action-btn reject-btn"
                                style={{ marginLeft: 8 }}
                              >
                                Reject
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); handleCancel(item.reimbursement_id); }}
                                className="action-btn cancel-btn"
                                style={{ marginLeft: 8 }}
                              >
                                Cancel
                              </button>
                            </>
                          );
                        case 'approved':
                          return (
                            <button
                              onClick={e => { e.stopPropagation(); handleReimburse(item.reimbursement_id); }}
                              className="action-btn reimburse-btn"
                            >
                              Reimburse
                            </button>
                          );
                        case 'paid':
                          return <span className="completed-text">Completed</span>;
                        case 'rejected':
                          return <span className="rejected-text">Rejected</span>;
                        case 'cancelled':
                          return <span className="cancelled-text">Cancelled</span>;
                        default:
                          return null;
                      }
                    };

                    return (
                      <tr key={item.reimbursement_id} onClick={() => {
                        setSelectedReimbursement(item);
                        setViewModalOpen(true);
                      }}>
                        <td>{item.employee_name}</td>
                        <td>{formatDateTime(item.submitted_date)}</td>
                        <td>{finalizedBy} | {finalizedDate}</td>
                        <td>
                          <span className={`status ${typeof item.status === 'string' ? item.status.toLowerCase() : ''}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>₱{(item.amount ?? 0).toFixed(2)}</td>
                        <td>
                          {item.status === 'Paid'
                            ? (item.paid_date ? formatDateTime(item.paid_date) : 'N/A')
                            : 'N/A'}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          {renderActions()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
            </table>
            {currentRecords.length === 0 && <p className="noRecords">No reimbursements found.</p>}
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
      <ViewReimbursement
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        record={selectedReimbursement}
      />
      {rejectModal.open && (
        <div className={styles.modalOverlay} onClick={() => setRejectModal({ open: false, id: null })}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2>Reject Reimbursement</h2>
            <div style={{ margin: '1rem 0' }}>
              <label htmlFor="rejectionReason" style={{ display: 'block', marginBottom: 8 }}>Rejection Reason<span style={{ color: '#961C1E' }}>*</span></label>
              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                rows={3}
                required
                style={{ width: '100%', borderRadius: 4, border: '1px solid #ccc', padding: 8 }}
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={() => setRejectModal({ open: false, id: null })}>Cancel</button>
              <button className={styles.confirmButton} onClick={() => handleReject(rejectModal.id!, rejectionReason)} disabled={!rejectionReason.trim()}>
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReimbursementPage;