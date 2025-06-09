'use client';

import React, { useState } from 'react';
import '../../../styles/viewBalance.css';

type EditBalanceProps = {
  record: {
    balance_id: string;
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
  onSave: (updated: {
    balance_id: string;
    employee_name: string;
    position: string;
    original_balance: number;
    due_date: string;
    description?: string;
  }) => void;
  onClose: () => void;
};

const EditBalance: React.FC<EditBalanceProps> = ({ record, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    employee_name: record.employee_name,
    position: record.position,
    original_balance: record.original_balance,
    due_date: record.due_date,
    description: record.description || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'original_balance' ? Number(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      balance_id: record.balance_id,
      ...formData,
    });
    onClose();
  };

  return (
    <div className="modalOverlay">
      <div className="viewBalanceModal">
        {/* Close Button */}
        <button type="button" className="closeButton" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>

        <div className="modalHeader">
          <h1>Edit Balance</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modalContent">
            <div className="formFieldsVertical">
              <div className="formRow">
                <div className="formField">
                  <label>Employee</label>
                  <input
                    type="text"
                    name="employee_name"
                    value={formData.employee_name}
                    onChange={handleChange}
                    className="formInput"
                    required
                  />
                </div>
                <div className="formField">
                  <label>Position</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    className="formInput"
                    required
                  />
                </div>
              </div>

              <div className="formRow">
                <div className="formField">
                  <label>Original Balance</label>
                  <input
                    type="number"
                    name="original_balance"
                    value={formData.original_balance}
                    onChange={handleChange}
                    className="formInput"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="formField">
                  <label>Due Date</label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                    className="formInput"
                    required
                  />
                </div>
              </div>

              <div className="formRow">
                <div className="formField" style={{ flex: 1 }}>
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="formInput"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="modalButtons" style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="addButton">
              <i className="ri-save-line" /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBalance;