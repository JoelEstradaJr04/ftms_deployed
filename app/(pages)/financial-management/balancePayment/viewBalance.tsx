'use client';

import React from 'react';
import '../../../styles/viewBalance.css';


type ViewBalanceProps = {
  record: {
    employee_name: string;
    position: string;
    original_balance: number;
    paid_amount: number;
    remaining_balance: number;
    status: string;
    payment_count: number;
    due_date: string;
    description?: string;
    balance_date: string;
    created_by: string;
  };
  onClose: () => void;
};

const ViewBalance: React.FC<ViewBalanceProps> = ({ record, onClose }) => {
  if (!record) return null;

  return (
    <div className="modalOverlay">
      <div className="viewBalanceModal">
        {/* Close Button */}
        <button type="button" className="closeButton" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>

        <div className="modalHeader">
          <h1>Balance Details</h1>
        </div>

        <div className="modalContent">
          <div className="formFieldsVertical">
            <div className="formRow">
              <div className="formField">
                <label>Employee</label>
                <div className="viewField">{record.employee_name}</div>
              </div>
              <div className="formField">
                <label>Position</label>
                <div className="viewField">{record.position}</div>
              </div>
            </div>

            <div className="formRow">
              <div className="formField">
                <label>Original Balance</label>
                <div className="viewField">₱{record.original_balance.toLocaleString()}</div>
              </div>
              <div className="formField">
                <label>Paid Amount</label>
                <div className="viewField">₱{record.paid_amount.toLocaleString()}</div>
              </div>
            </div>

            <div className="formRow">
              <div className="formField">
                <label>Remaining Balance</label>
                <div className="viewField">₱{record.remaining_balance.toLocaleString()}</div>
              </div>
              <div className="formField">
                <label>Status</label>
                <div className="viewField">{record.status}</div>
              </div>
            </div>

            <div className="formRow">
              <div className="formField">
                <label>Number of Payments</label>
                <div className="viewField">{record.payment_count}</div>
              </div>
              <div className="formField">
                <label>Due Date</label>
                <div className="viewField">{record.due_date}</div>
              </div>
            </div>

            <div className="formRow">
              <div className="formField" style={{ flex: 1 }}>
                <label>Description</label>
                <div className="viewField">{record.description || 'N/A'}</div>
              </div>
            </div>

            <div className="formRow">
              <div className="formField">
                <label>Balance Date</label>
                <div className="viewField">{record.balance_date}</div>
              </div>
              <div className="formField">
                <label>Created By</label>
                <div className="viewField">{record.created_by}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewBalance;