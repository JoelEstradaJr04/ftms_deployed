"use client";

import React, { useState, useEffect } from "react";
import "../../../styles/balance.css";
import "../../../styles/table.css";
import "../../../styles/chips.css";
import PaginationComponent from "../../../Components/pagination";
import Swal from 'sweetalert2';
import AddBalanceModal from "./addBalance";
import ViewBalance from "./viewBalance";
import EditBalance from "./editBalance";
import PayBalance from "./payBalance";
// import PayBalanceModal from "/payBalanceModal";
import { getUnrecordedExpenseAssignments, getAllAssignmentsWithRecorded, type Assignment } from '@/lib/supabase/assignments';
import { formatDate } from '../../../utility/dateFormatter';
import Loading from '../../../Components/loading';
import { showSuccess, showError, showWarning, showInformation, showConfirmation } from '../../../utility/Alerts';
import { formatDisplayText } from '@/app/utils/formatting';

// Define interface based on your Prisma BalanceRecord schema
interface BalanceRecord {
  balance_id: string;
  assignment_id?: string;
  receipt_id?: string;
  position: string;
  total_amount: number;
  balance_date: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  is_deleted: boolean;
  assignment?: Assignment;

  // Added based on UI table
  employee_name: string;
  original_balance: number;
  paid_amount: number;
  remaining_balance: number;
  status: 'Pending' | 'Partial' | 'Paid' | string;
  payment_count: number;
  due_date: string;
  description?: string;
}

// UI data type that matches the processed schema used in the frontend
type BalanceData = {
  balance_id: string;
  position: string;
  total_amount: number;
  balance_date: string;
  created_by: string;
  assignment_id?: string;
  receipt_id?: string;
  assignment?: Assignment;

  // Added based on table
  employee_name: string;
  original_balance: number;
  paid_amount: number;
  remaining_balance: number;
  status: string;
  payment_count: number;
  due_date: string;
  description?: string;
};

const BalancePage = () => {
const dummyBalances: BalanceData[] = [
  {
    balance_id: "1",
    position: "Driver",
    total_amount: 10000,
    balance_date: "2024-06-01",
    created_by: "admin",
    assignment_id: undefined,
    receipt_id: undefined,
    assignment: undefined,
    employee_name: "Juan Dela Cruz",
    original_balance: 10000,
    paid_amount: 2000,
    remaining_balance: 8000,
    status: "Active",
    payment_count: 1,
    due_date: "2024-06-30",
    description: "Fuel advance"
  },
  {
    balance_id: "2",
    position: "Conductor",
    total_amount: 5000,
    balance_date: "2024-06-02",
    created_by: "admin",
    assignment_id: undefined,
    receipt_id: undefined,
    assignment: undefined,
    employee_name: "Maria Santos",
    original_balance: 5000,
    paid_amount: 5000,
    remaining_balance: 0,
    status: "Paid",
    payment_count: 2,
    due_date: "2024-06-25",
    description: "Uniform deduction"
  }
  // Add more dummy records as needed
];

  // Balance records
  const [data, setData] = useState<BalanceData[]>(dummyBalances);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [showModal, setShowModal] = useState(false); // Add modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  //Pay balance modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [recordToPay, setRecordToPay] = useState<BalanceData | null>(null);
  const [paymentRecords, setPaymentRecords] = useState<{ [balanceId: string]: any[] }>({});

  // Record targets
  const [recordToEdit, setRecordToEdit] = useState<BalanceData | null>(null);
  const [recordToView, setRecordToView] = useState<BalanceData | null>(null);

  // Assignments
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);

  // Metadata
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Fetch balances data
  const fetchBalances = async () => {
    try {
      const response = await fetch('/api/balances');
      if (!response.ok) throw new Error('Failed to fetch balances');
      const balancesData = await response.json();
      setData(balancesData);
    } catch (error) {
      console.error('Error fetching balances:', error);
      showError('Failed to load balances hehe', 'Error');
    }
  };

  // Fetch assignments data
  const fetchAssignments = async () => {
    try {
      setAssignmentsLoading(true);
      // Get unrecorded balance assignments for the dropdown
      const unrecordedAssignments = await getUnrecordedExpenseAssignments();
      setAssignments(unrecordedAssignments);
      
      // Get all assignments for reference (including recorded ones)
      const allAssignmentsData = await getAllAssignmentsWithRecorded();
      setAllAssignments(allAssignmentsData);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      showError( 'Failed to load assignments', 'Error');
    } finally {
      setAssignmentsLoading(false);
    }
  };


  // Initial Fetch data,, Check if thrown loading already
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchBalances(), fetchAssignments()]);
      setLoading(false);
      setHasLoaded(true); // Mark as loaded
    };
    loadData();
  }, []);


  // Auto-reload data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch data when lastUpdate changes
  useEffect(() => {
    if (hasLoaded && !loading && !showModal && !editModalOpen) {
      fetchBalances();
      fetchAssignments();
    }
  }, [hasLoaded,lastUpdate, loading, showModal, editModalOpen]);

  // Filter and pagination logic
  const filteredData = data.filter((item: BalanceData) => {
    const matchesSearch = (item.position?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesStatus = statusFilter ? item.status === statusFilter : true;
    const matchesDate = (!dateFrom || item.balance_date >= dateFrom) && 
                      (!dateTo || item.balance_date <= dateTo);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const indexOfLastRecord = currentPage * pageSize;
  const indexOfFirstRecord = indexOfLastRecord - pageSize;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Add a new balance
const handleAddBalance = async (newBalance: {
  employee: string;
  position: string;
  balance: number;
  due_date: string;
  description: string;
  created_by: string;
}) => {
  // Map modal fields to API fields
  const apiPayload = {
    employee_name: newBalance.employee,
    position: newBalance.position,
    original_balance: newBalance.balance,
    due_date: newBalance.due_date,
    description: newBalance.description,
    created_by: newBalance.created_by,
  };

  try {
    const response = await fetch('/api/balances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiPayload),
    });

    if (!response.ok) throw new Error('Create failed');

    const result: BalanceRecord = await response.json();

    setData(prev => [
      {
        balance_id: result.balance_id,
        position: result.position,
        total_amount: Number(result.total_amount),
        balance_date: new Date(result.balance_date).toISOString().split('T')[0],
        created_by: result.created_by,
        assignment_id: result.assignment_id,
        receipt_id: result.receipt_id,
        employee_name: result.employee_name,
        original_balance: Number(result.original_balance),
        paid_amount: Number(result.paid_amount),
        remaining_balance: Number(result.remaining_balance),
        status: result.status,
        payment_count: result.payment_count,
        due_date: new Date(result.due_date).toISOString().split('T')[0],
        description: result.description || ''
      },
      ...prev,
    ]);

    setLastUpdate(Date.now());
    showSuccess('Balance added successfully', 'Success');
    setShowModal(false);
  } catch (error) {
    console.error('Create error:', error);
    showError('Failed to add balance: ' + (error instanceof Error ? error.message : 'Unknown error'), 'Error');
  }
};

  // for items status formatting
  const formatStatus = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "fully-paid":
        return "Fully Paid";
      case "cancelled":
        return "cancelled";
      default:
        return status;
    }
  };

  // Delete a balance record
  const handleDelete = async (balance_id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the record permanently.',
      icon: 'warning',
      showCancelButton: true,
      cancelButtonColor: '#13CE66',
      confirmButtonColor: '#961C1E',
      confirmButtonText: 'Yes, delete it!',
      background: 'white',
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/balances/${balance_id}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Delete failed');

        setData(prev => prev.filter(item => item.balance_id !== balance_id));
        showSuccess('Record deleted successfully', 'Deleted');
      } catch (error) {
        console.error('Delete error:', error);
        showError('Failed to delete record', 'Error');
      }
    }
  };


  // Save a payment for a balance
  const handlePay = (amount: number) => {
    if (!recordToPay) return;

    // Create new payment record
    const today = new Date().toISOString().split('T')[0];
    const prevPayments = paymentRecords[recordToPay.balance_id] || [];
    const newRemaining = Math.max(recordToPay.remaining_balance - amount, 0);

    const newPayment = {
      payment_date: today,
      payment: amount,
      remaining_balance: newRemaining,
      total_remaining: newRemaining,
    };

    // Update payment records
    setPaymentRecords(prev => ({
      ...prev,
      [recordToPay.balance_id]: [...prevPayments, newPayment],
    }));

    // Update balance data
    setData(prev =>
      prev.map(b =>
        b.balance_id === recordToPay.balance_id
          ? {
              ...b,
              paid_amount: b.paid_amount + amount,
              remaining_balance: newRemaining,
              status: newRemaining === 0 ? "Paid" : b.status,
            }
          : b
      )
    );

    setPayModalOpen(false);
    setRecordToPay(null);
    showSuccess('Payment recorded!', 'Success');
  };

  // Save an edited balance
  const handleSaveEdit = async (updatedRecord: {
    balance_id: string;
    employee_name: string;
    position: string;
    original_balance: number;
    due_date: string;
    description?: string;
  }) => {
    try {
      const response = await fetch(`/api/balances/${updatedRecord.balance_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecord),
      });

      if (!response.ok) throw new Error('Update failed');

      const result: BalanceRecord = await response.json();

      setData(prev => {
        const filtered = prev.filter(rec => rec.balance_id !== updatedRecord.balance_id);
        const updated = {
          ...result,
          balance_date: new Date(result.balance_date).toISOString().split('T')[0],
          due_date: new Date(result.due_date).toISOString().split('T')[0],
        };
        return [updated, ...filtered];
      });

      setEditModalOpen(false);
      setRecordToEdit(null);
      showSuccess('Record updated successfully', 'Updated');
    } catch (error) {
      console.error('Update error:', error);
      showError('Failed to update record', 'Error');
    }
  };

  const handleViewBalance = (expense: BalanceData) => {
    setRecordToView(expense);
    setViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setRecordToView(null);
    setViewModalOpen(false);
  };

  // Generate export details helper function
  const generateExportDetails = () => {
    let details = `Export Details:\n`;
    details += `Position: ${positionFilter || 'All Categories'}\n`;
    if (dateFrom || dateTo) {
      const from = dateFrom ? formatDate(dateFrom) : 'Beginning';
      const to = dateTo ? formatDate(dateTo) : 'Present';
      details += `Date Range: ${from} to ${to}\n`;
    } else {
      details += `Date Range: All Dates\n`;
    }
    details += `Total Records: ${filteredData.length}\n`;
    details += `Export Time: ${new Date().toISOString()}\n`;
    details += `Exported Columns: ${getExportColumns().join(', ')}`;
    return details;
  };

  // Add a new function to handle audit logging
  const logExportAudit = async () => {
    try {
      // First get the export ID from the API
      const idResponse = await fetch('/api/generate-export-id');
      if (!idResponse.ok) {
        throw new Error('Failed to generate export ID');
      }
      const { exportId } = await idResponse.json();

      // Generate details without export ID
      const details = generateExportDetails();

      const response = await fetch('/api/auditlogs/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'EXPORT',
          table_affected: 'ExpenseRecord',
          record_id: exportId,
          performed_by: 'ftms_user', // Replace with actual user ID
          details: details
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create audit log');
      }
  
      return exportId;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      throw error;
    }
  };

  // Generate the file name helper function
  const generateFileName = () => {
    const now = new Date();
    const timeStamp = now.toISOString().replace(/[:.]/g, '-').split('T')[1].slice(0, 8);
    const dateStamp = now.toISOString().split('T')[0];
    let fileName = 'expense_records';
    if (positionFilter) {
      fileName += `_${positionFilter.toLowerCase().replace('_', '-')}`;
    }
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom).toISOString().split('T')[0] : 'all';
      const to = dateTo ? new Date(dateTo).toISOString().split('T')[0] : 'present';
      fileName += `_${from}_to_${to}`;
    }
    fileName += `_${dateStamp}_${timeStamp}`;
    return `${fileName}.csv`;
  };

  const getExportColumns = () => [
    "Employee",
    "Position",
    "Date",
    "Original Balance",
    "Paid Amount",
    "Remaining Balance",
    "Status",
    "Number of Payments",
    "Due Date",
    "Description"
  ];

  // Export handler for Balance Records
  const handleExport = () => {
    const generateConfirmationMessage = () => {
      let message = `<strong>Balance Records Export</strong><br/><br/>`;
      message += `<strong>Position:</strong> ${positionFilter || 'All Categories'}<br/>`;
      if (dateFrom || dateTo) {
        const from = dateFrom ? formatDate(dateFrom) : 'Beginning';
        const to = dateTo ? formatDate(dateTo) : 'Present';
        message += `<strong>Date Range:</strong> ${from} to ${to}<br/>`;
      } else {
        message += `<strong>Date Range:</strong> All Dates<br/>`;
      }
      message += `<strong>Total Records:</strong> ${filteredData.length}`;
      return message;
    };

    Swal.fire({
      title: 'Confirm Export',
      html: generateConfirmationMessage(),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#961C1E',
      confirmButtonText: 'Export',
      background: 'white',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const exportId = await logExportAudit(); // Make sure this logs the export to backend
          performExport(filteredData, exportId);    // Export logic: CSV/XLSX/etc.
          showSuccess('Export completed successfully', 'Success');
        } catch (error) {
          console.error('Export error:', error);
          showError('Failed to export data', 'Error');
        }
      }
    });
  };

  const performExport = (recordsToExport: BalanceData[], exportId: string) => {
    const generateHeaderComment = () => {
      let comment = '"# Balance Records Export","","","","","","","","","",""\n';
      comment += `"# Export ID:","${exportId}","","","","","","","","",""\n`;
      comment += `"# Generated:","${formatDate(new Date())}","","","","","","","","",""\n`;
      comment += `"# Total Records:","${recordsToExport.length}","","","","","","","","",""\n\n`;
      return comment;
    };

    const columns = getExportColumns();
    const headers = columns.join(",") + "\n";

    const rows = recordsToExport.map(item => {
      const escapeField = (field: string | number | undefined | null) => {
        if (field === undefined || field === null) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      };

      return [
        escapeField(item.employee_name),
        escapeField(item.position),
        escapeField(formatDate(item.balance_date)),
        escapeField(Number(item.original_balance).toFixed(2)),
        escapeField(Number(item.paid_amount).toFixed(2)),
        escapeField(Number(item.remaining_balance).toFixed(2)),
        escapeField(item.status),
        escapeField(item.payment_count),
        escapeField(formatDate(item.due_date)),
        escapeField(formatDisplayText(item.description) || '')
      ].join(',');
    }).join('\n');

    const blob = new Blob([generateHeaderComment() + headers + rows], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = generateFileName(); // Your existing file name generator function
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

   if (loading) {
        return (
            <div className="card">
                <h1 className="title">Stock Management</h1>
                <Loading />
            </div>
        );
    }

  return (
    <div className="card">

      <div className="elements">
        <div className="title">
          <h1>Balance Management</h1>
        </div>

        <div className="settings">
          <div className="searchBar">
            <i className="ri-search-line" />
            <input
              type="text"
              placeholder="Search here..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filters">
            <input
              type="date"
              className="dateFilter"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />

            <input
              type="date"
              className="dateFilter"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />

            <select
              value={statusFilter}
              id="statusFilter"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="Paid">Paid</option>
              <option value="Active">Active</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <button onClick={handleExport} id="export">
              <i className="ri-receipt-line" /> Export CSV
            </button>

            <button onClick={() => setShowModal(true)} id="addBalance">
              <i className="ri-add-line" /> Add Balance
            </button>
          </div>
        </div>

        {/* ========== Balance Table ========== */}
        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Original Balance</th>
                  <th>Remaining Balance</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map((item) => (
                  <tr key={item.balance_id}>
                    <td onClick={() => { setRecordToView(item); setViewModalOpen(true); }}>{item.employee_name}</td>
                    <td onClick={() => { setRecordToView(item); setViewModalOpen(true); }}>{formatDate(item.balance_date)}</td>
                    <td onClick={() => { setRecordToView(item); setViewModalOpen(true); }}>₱{item.original_balance.toLocaleString()}</td>
                    <td onClick={() => { setRecordToView(item); setViewModalOpen(true); }}>₱{item.remaining_balance.toLocaleString()}</td>
                    <td onClick={() => { setRecordToView(item); setViewModalOpen(true); }}>
                      <span className={`chip ${item.status}`}>
                        {formatStatus(item.status)}
                      </span>
                    </td>
                    <td onClick={() => { setRecordToView(item); setViewModalOpen(true); }}>{formatDate(item.due_date)}</td>
                    <td onClick={() => { setRecordToView(item); setViewModalOpen(true); }}>{formatDisplayText(item.description) || 'N/A'}</td>
                    <td className="actionButtons">
                      <div className="actionButtonsContainer">
                        <button className="payBtn" onClick={() => {setRecordToPay(item); setPayModalOpen(true)}} title="View Record">
                          <i className="ri-cash-line"></i>
                        </button>
                        <button className="editBtn" onClick={() => { setRecordToEdit(item); setEditModalOpen(true); }} title="Edit Record">
                          <i className="ri-edit-2-line" />
                        </button>
                        <button className="deleteBtn" onClick={() => handleDelete(item.balance_id)} title="Delete Record">
                          <i className="ri-delete-bin-line" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {currentRecords.length === 0 && !loading && <p>No records found.</p>}
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

      {/* Add Balance Modal */}
      {showModal && (
        <AddBalanceModal
          onClose={() => setShowModal(false)}
          onAddBalance={handleAddBalance}
          currentUser="ftms_user" // Replace with your actual user ID
        />
      )}

      {/* View Balance Modal */}
      {viewModalOpen && recordToView && (
        <ViewBalance
          record={recordToView}
          onClose={() => setViewModalOpen(false)}
        />
      )}

      {editModalOpen && recordToEdit && (
        <EditBalance
          record={recordToEdit}
          onSave={handleSaveEdit}
          onClose={() => {
            setEditModalOpen(false);
            setRecordToEdit(null);
          }}
        />
      )}


      {/* Pay Balance Modal */}
      {payModalOpen && recordToPay && (
        <PayBalance
          record={recordToPay}
          paymentRecords={paymentRecords[recordToPay.balance_id] || []}
          onPay={handlePay}
          onClose={() => {
            setPayModalOpen(false);
            setRecordToPay(null);
          }}
        />
      )}

      
    </div>
  );
};

export default BalancePage;