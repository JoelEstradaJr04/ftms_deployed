"use client";
import React, { useState } from "react";
import ViewExpenseModal from '../expense/viewExpense';
import '../../styles/viewReimbursement.css';
// Import the Receipt type from the shared types
import type { Receipt } from '../../types/receipt';

type Assignment = {
  assignment_id: string;
  bus_route: string;
  date_assigned: string;
  bus_plate_number: string;
  bus_type: string;
  driver_id: string;
  conductor_id: string;
  trip_fuel_expense: number;
  // Add other assignment properties as needed
};

// Create a compatible Reimbursement type that matches what ViewExpenseModal expects
type ReimbursementForExpense = {
  reimbursement_id: string;
  expense_id: string;
  employee_id: string;
  employee_name: string;
  job_title?: string;
  amount: number;
  status: {
    id: string;
    name: string;
  };
  requested_date: string;
  approved_by?: string;
  approved_date?: string;
  rejection_reason?: string;
  paid_by?: string;
  paid_date?: string;
  payment_reference?: string;
  payment_method?: string;
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  is_deleted: boolean;
  cancelled_by?: string;
  cancelled_date?: string;
};

type ExpenseRecord = {
  expense_id: string;
  category: {
    category_id: string;
    name: string;
  };
  other_category?: string;
  total_amount: number;
  expense_date: string;
  assignment?: Assignment;
  receipt?: Receipt; // Now uses the imported Receipt type
  other_source?: string;
  payment_method: {
    id: string;
    name: string;
  };
  reimbursements?: ReimbursementForExpense[]; // Use the compatible type
};

type Reimbursement = {
  reimbursement_id: string;
  expense_id: string;
  employee_id: string;
  employee_name: string;
  job_title?: string;
  // Use the actual schema field name
  requested_date: string;
  // Keep submitted_date for backward compatibility if needed
  submitted_date?: string;
  approved_by: string | null;
  approved_date: string | null;
  // Match the mapped status from API
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';
  // Amount should match schema (not nullable in DB)
  amount: number;
  rejection_reason: string | null;
  paid_date: string | null;
  payment_reference: string | null;
  notes: string;
  remarks?: string | null;
  cancelled_by?: string | null;
  cancelled_date?: string | null;
  expense?: ExpenseRecord;
};

interface ViewReimbursementProps {
  isOpen: boolean;
  onClose: () => void;
  record: Reimbursement | null;
  onReimburse?: (reimbursementId: string, notes: string) => void;
}

const formatDisplay = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === "" ? "-" : value;

const ViewReimbursement: React.FC<ViewReimbursementProps> = ({
  isOpen,
  onClose,
  record
}) => {
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  if (!isOpen || !record) return null;

  return (
    <>
      <div className="modalOverlay" onClick={onClose}>
        <div className="modalContent" onClick={e => e.stopPropagation()}>
          <div className="modalHeader">
            <h2>Reimbursement Details</h2>
            <button className="closeButton" onClick={onClose}>
              <i className="ri-close-line"></i>
            </button>
          </div>
          <div className="modalBody">
            <div className="mainDetails">
              <div className="detailRow">
                <span className="label">Employee Name:</span>
                <span className="value">{record.employee_name}</span>
              </div>
              {record.job_title && (
                <div className="detailRow">
                  <span className="label">Job Title:</span>
                  <span className="value">{record.job_title}</span>
                </div>
              )}
              <div className="detailRow">
                <span className="label">Expense Reference:</span>
                <span className="value">
                  <button 
                    className="linkButton"
                    onClick={() => setShowExpenseModal(true)}
                    disabled={!record.expense}
                  >
                    {record.expense ? 
                      `View Expense - ${record.expense.category.name} (₱${record.expense.total_amount.toLocaleString()})` : 
                      'Expense details not available'
                    }
                  </button>
                </span>
              </div>
              <div className="detailRow">
                <span className="label">Submitted Date:</span>
                <span className="value">{formatDisplay(record.submitted_date || record.requested_date)}</span>
              </div>
              <div className="detailRow">
                <span className="label">Status:</span>
                <span className={`value viewStatus ${typeof record.status === 'string' ? record.status.toLowerCase() : ''} ${record.status === 'CANCELLED' ? 'status-cancelled' : ''}`}>
                  {record.status || '-'}
                </span>
              </div>
              {record.status === "CANCELLED" && (
                <>
                  <div className="detailRow">
                    <span className="label">Cancelled By:</span>
                    <span className="value">{formatDisplay(record.cancelled_by)}</span>
                  </div>
                  <div className="detailRow">
                    <span className="label">Cancelled Date:</span>
                    <span className="value">{formatDisplay(record.cancelled_date ? new Date(record.cancelled_date).toLocaleDateString() : null)}</span>
                  </div>
                </>
              )}
              <div className="detailRow">
                <span className="label">Approved By:</span>
                <span className="value">{formatDisplay(record.approved_by)}</span>
              </div>
              <div className="detailRow">
                <span className="label">Approved Date:</span>
                <span className="value">{formatDisplay(record.approved_date)}</span>
              </div>
              <div className="detailRow">
                <span className="label">Approved Amount:</span>
                <span className="value">
                  {record.amount !== null
                    ? `₱${record.amount.toFixed(2)}`
                    : "-"}
                </span>
              </div>
              <div className="detailRow">
                <span className="label">Paid Date:</span>
                <span className="value">{formatDisplay(record.paid_date)}</span>
              </div>
              {record.status === "REJECTED" && (
                <div className="detailRow">
                  <span className="label">Rejection Reason:</span>
                  <span className="value fullDetails">{formatDisplay(record.rejection_reason)}</span>
                </div>
              )}
              {/* Display remarks if they exist - not just for Paid status */}
              {record.remarks && record.remarks.trim() !== '' && (
                <div className="detailRow">
                  <span className="label">Remarks:</span>
                  <span className="value fullDetails">{formatDisplay(record.remarks)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="modalFooter">
            <button className="closeBtn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Expense Modal */}
      {showExpenseModal && record.expense && (
        <ViewExpenseModal
          record={record.expense}
          onClose={() => setShowExpenseModal(false)}
        />
      )}
    </>
  );
};

export default ViewReimbursement;