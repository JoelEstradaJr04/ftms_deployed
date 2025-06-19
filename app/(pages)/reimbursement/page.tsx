"use client";
import React, { useState, useEffect } from "react";
import '../../styles/table.css';
import "../../styles/reimbursement.css";
import PaginationComponent from "../../Components/pagination";
import Swal from "sweetalert2";
import Loading from '../../Components/loading';
import { showSuccess, showError, showConfirmation } from '../../utility/Alerts';
import { formatDisplayText } from '@/app/utils/formatting';
import ViewReimbursement from "./viewReimbursement";
import ApplyReimbursement from "./applyReimbursement"; 

// REIMBURSEMENT TYPE
type Reimbursement = {
  reimbursement_id: string;
  expense_id: string;
  employee_id: string;
  employee_name: string;
  submitted_date: string;
  approved_by: string | null;
  approved_date: string | null;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  amount: number | null;
  rejection_reason: string | null;
  paid_date: string | null;
  payment_reference: string | null;
  notes: string;
};


// Dummy formatDateTime function
const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString();
};

const ReimbursementPage = () => {

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);

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
  

  // Fetch reimbursements (replace with your actual fetch logic)
  useEffect(() => {
    setLoading(true);
    // Simulate fetch with dummy data
    setTimeout(() => {
      const dummyData: Reimbursement[] = [
        {
          reimbursement_id: 'R001',
          expense_id: 'E001',
          employee_id: 'EMP001',
          employee_name: 'Buboy',
          submitted_date: '2024-06-15',
          approved_by: 'MGR001',
          approved_date: '2024-06-16',
          status: 'Approved',
          amount: 150.00,
          rejection_reason: null,
          paid_date: null,
          payment_reference: null,
          notes: 'Travel expense for client meeting'
        },
        {
          reimbursement_id: 'R002',
          expense_id: 'E002',
          employee_id: 'EMP002',
          employee_name: 'Bubay',
          submitted_date: '2024-06-17',
          approved_by: null,
          approved_date: null,
          status: 'Pending',
          amount: null,
          rejection_reason: null,
          paid_date: null,
          payment_reference: null,
          notes: 'Office supplies purchase'
        }
      ];
      setReimbursements(dummyData);
      setLoading(false);
    }, 500);
  }, []);

  // Handle reimburse action
  const handleReimburse = async (reimbursementId: string) => {
    const result = await showConfirmation(
      'Process Reimbursement',
      'Are you sure you want to process this reimbursement?'
    );
    
    if (result.isConfirmed) {
      try {
        // Update the reimbursement status
        setReimbursements(prev => prev.map(item => 
          item.reimbursement_id === reimbursementId 
            ? { 
                ...item, 
                status: 'Paid' as const,
                paid_date: new Date().toISOString().split('T')[0],
                payment_reference: `PAY${Date.now()}`
              }
            : item
        ));
        
        showSuccess('Reimbursement processed successfully!','Success');
      } catch (error) {
        showError('Failed to process reimbursement', 'Error');
      }
    }
  };

  // Filter and paginate reimbursements
  const filteredReimbursements = reimbursements.filter(reimbursement => {
    const matchesSearch =
      search === "" ||
      reimbursement.reimbursement_id.toLowerCase().includes(search.toLowerCase()) ||
      reimbursement.expense_id.toLowerCase().includes(search.toLowerCase()) ||
      reimbursement.employee_id.toLowerCase().includes(search.toLowerCase()) ||
      (reimbursement.notes && reimbursement.notes.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === "" || reimbursement.status === statusFilter;
    const matchesDateFrom = !dateFrom || reimbursement.submitted_date >= dateFrom;
    const matchesDateTo = !dateTo || reimbursement.submitted_date <= dateTo;
    
    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  const totalPages = Math.ceil(filteredReimbursements.length / pageSize);
  const currentRecords = filteredReimbursements.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Apply for reimbursement handler
  const handleApplyReimbursement = () => {
    setApplyModalOpen(true);
  };

 const handleSubmitReimbursement = (data: any) => {
    setReimbursements(prev => [
      {
        reimbursement_id: `R${String(prev.length + 1).padStart(3, "0")}`,
        expense_id: data.expense_id,
        employee_id: data.employee_id,
        employee_name: data.employeeDetails?.employee_name || "Unknown",
        submitted_date: new Date().toISOString().split("T")[0],
        approved_by: null,
        approved_date: null,
        status: "Pending",
        amount: data.amount, // <-- ADD THIS LINE to store original amount
        approved_amount: null,
        rejection_reason: null,
        paid_date: null,
        payment_reference: null,
        notes: data.notes,
      },
      ...prev,
    ]);
    setApplyModalOpen(false);
  };

  const handleApprove = async (reimbursementId: string) => {
    const result = await showConfirmation(
      'Approve Reimbursement',
      'Are you sure you want to approve this reimbursement?'
    );
    
    if (result.isConfirmed) {
      try {
        // Update the reimbursement status to Approved
        setReimbursements(prev => prev.map(item => 
          item.reimbursement_id === reimbursementId 
            ? { 
                ...item, 
                status: 'Approved' as const,
                approved_by: 'Current User', // Replace with actual user
                approved_date: new Date().toISOString().split('T')[0],
              }
            : item
        ));
        
        showSuccess('Reimbursement approved successfully!', 'Success');
      } catch (error) {
        showError('Failed to approve reimbursement', 'Error');
      }
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
                <div className="filter">
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
                    </select>
                </div>

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
            <button onClick={handleApplyReimbursement} id="apply">
              <i className="ri-add-line" /> Apply for Reimbursement
            </button>
          </div>
        </div>
        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Submitted Date</th>
                    <th>Approved By</th>
                    <th>Approved Date</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Paid Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.map((item) => (
                    <tr key={item.reimbursement_id} onClick={() => {
                      setSelectedReimbursement(item);
                      setViewModalOpen(true);
                    }}>
                      <td>{item.employee_name}</td>
                      <td>{item.submitted_date}</td>
                      <td>{item.approved_by || '-'}</td>
                      <td>{item.approved_date || '-'}</td>
                      <td>
                        <span className={`status ${item.status.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>₱{(item.amount ?? 0).toFixed(2)}</td>
                      <td>{item.paid_date || '-'}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {item.status === 'Pending' && (
                          <button 
                            onClick={() => handleApprove(item.reimbursement_id)}
                            className="action-btn approve-btn"
                          >
                            Approve
                          </button>
                        )}
                        {item.status === 'Approved' && (
                          <button 
                            onClick={() => handleReimburse(item.reimbursement_id)}
                            className="action-btn reimburse-btn"
                          >
                            Reimburse
                          </button>
                        )}
                        {item.status === 'Paid' && (
                          <span className="completed-text">Completed</span>
                        )}
                        {item.status === 'Rejected' && (
                          <span className="rejected-text">Rejected</span>
                        )}
                      </td>
                    </tr>
                  ))}
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

      <ApplyReimbursement
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        onSubmit={handleSubmitReimbursement}
      />
    </div>
  );
};

export default ReimbursementPage;