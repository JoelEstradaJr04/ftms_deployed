"use client";
import React from "react";
import '../../styles/viewReimbursement.css'; // Use the same modal CSS as payroll

type Reimbursement = {
  reimbursement_id: string;
  expense_id: string;
  employee_id: string;
  employee_name: string;
  submitted_date: string;
  approved_by: string | null;
  approved_date: string | null;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  approved_amount: number | null;
  rejection_reason: string | null;
  paid_date: string | null;
  payment_reference: string | null;
  notes: string;
};

interface ViewReimbursementProps {
  isOpen: boolean;
  onClose: () => void;
  record: Reimbursement | null;
}

const formatDisplay = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === "" ? "-" : value;

const ViewReimbursement: React.FC<ViewReimbursementProps> = ({
  isOpen,
  onClose,
  record,
}) => {
  if (!isOpen || !record) return null;

  return (
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
              <span className="label">Reimbursement ID:</span>
              <span className="value">{record.reimbursement_id}</span>
            </div>
            <div className="detailRow">
              <span className="label">Expense ID:</span>
              <span className="value">{record.expense_id}</span>
            </div>
            <div className="detailRow">
              <span className="label">Employee ID:</span>
              <span className="value">{record.employee_id}</span>
            </div>
            <div className="detailRow">
              <span className="label">Employee Name:</span>
              <span className="value">{record.employee_name}</span>
            </div>
            <div className="detailRow">
              <span className="label">Submitted Date:</span>
              <span className="value">{formatDisplay(record.submitted_date)}</span>
            </div>
            <div className="detailRow">
              <span className="label">Status:</span>
              <span className={`value viewStatus ${record.status.toLowerCase()}`}>{record.status}</span>
            </div>
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
                {record.approved_amount !== null
                  ? `₱${record.approved_amount.toFixed(2)}`
                  : "-"}
              </span>
            </div>
            <div className="detailRow">
              <span className="label">Paid Date:</span>
              <span className="value">{formatDisplay(record.paid_date)}</span>
            </div>
            <div className="detailRow">
              <span className="label">Payment Reference:</span>
              <span className="value">{formatDisplay(record.payment_reference)}</span>
            </div>
            {record.status === "Rejected" && (
              <div className="detailRow">
                <span className="label">Rejection Reason:</span>
                <span className="value">{formatDisplay(record.rejection_reason)}</span>
              </div>
            )}
            <div className="detailRow">
              <span className="label">Notes:</span>
              <span className="value fullDetails">{formatDisplay(record.notes)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewReimbursement;