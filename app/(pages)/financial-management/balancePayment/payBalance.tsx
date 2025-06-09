'use client';

import React, { useState } from 'react';
import '../../../styles/payBalance.css';
import '../../../styles/table.css';

type PaymentRecord = {
  payment_date: string;
  payment: number;
  remaining_balance: number;
  total_remaining: number;
};

type PayBalanceProps = {
  record: {
    employee_name: string;
    position: string;
    original_balance: number;
    remaining_balance: number;
    due_date: string;
    description?: string;
  };
  paymentRecords: PaymentRecord[];
  onPay: (amount: number) => void;
  onClose: () => void;
};

const PayBalance: React.FC<PayBalanceProps> = ({
  record,
  paymentRecords,
  onPay,
  onClose,
}) => {
  const [payment, setPayment] = useState<number>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (payment > 0 && payment <= record.remaining_balance) {
      onPay(payment);
      setPayment(0);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="viewBalanceModal">
        {/* Close Button */}
        <button type="button" className="closeButton" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>

        <div className="modalHeader">
          <h1>Pay Balance</h1>
        </div>

        {/* Employee Info (not editable) */}
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
        </div>

          {/* Payment Form */}
        <form onSubmit={handleSubmit}>
            <div className="formFieldsVertical" style={{ marginTop: '2rem' }}>
              <div className="formRow">
                    <div className="formField">
                    <label>Remaining Balance</label>
                    <div className="viewField">₱{record.remaining_balance.toLocaleString()}</div>
                    </div>
                    <div className="formField">
                    <label>Enter Payment</label>
                    <input
                        type="number"
                        min={1}
                        max={record.remaining_balance}
                        value={payment}
                        onChange={e => setPayment(Number(e.target.value))}
                        className="formInput"
                        required
                    />
                    </div>
                    
                </div>
                <div className="formField" id="buttonContainer" style={{ alignSelf: 'flex-end' }}>
                    <button type="submit" className="payButton" style={{ marginTop: '1.5rem' }}>
                        <i className="ri-cash-line" /> Pay
                    </button>
                </div>
            </div>
        </form>

          {/* Payment Records Table */}
        <div className="formFieldsVertical" style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Payment Records</h3>
            <div className='table-wrapper'>
                <div className="tableContainer" style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                        <tr>
                            <th>Payment Date</th>
                            <th>Payment</th>
                            <th>Remaining Balance</th>
                            <th>Total Remaining</th>
                        </tr>
                        </thead>
                        <tbody>
                        {paymentRecords.length === 0 ? (
                            <tr>
                            <td colSpan={4} style={{ textAlign: 'center' }}>No payment records yet.</td>
                            </tr>
                        ) : (
                            paymentRecords.map((rec, idx) => (
                            <tr key={idx}>
                                <td>{rec.payment_date}</td>
                                <td>₱{rec.payment.toLocaleString()}</td>
                                <td>₱{rec.remaining_balance.toLocaleString()}</td>
                                <td>₱{rec.total_remaining.toLocaleString()}</td>
                            </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayBalance;