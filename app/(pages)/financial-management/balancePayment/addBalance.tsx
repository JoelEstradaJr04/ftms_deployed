'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import '../../../styles/addBalance.css';
import { formatDate } from '../../../utility/dateFormatter';
import { showSuccess, showError, showWarning, showInformation, showConfirmation } from '../../../utility/Alerts';

type AddBalanceProps = {
  onClose: () => void;
  onAddBalance: (formData: {
    employee: string;
    position: string;
    balance: number;
    due_date: string;
    description: string;
    created_by: string;
  }) => void;
  currentUser: string;
};

const AddBalance: React.FC<AddBalanceProps> = ({
  onClose,
  onAddBalance,
  currentUser,
}) => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  const [formData, setFormData] = useState({
    employee: '',
    position: '',
    balance: 0,
    due_date: new Date().toISOString().split('T')[0],
    description: '',
    created_by: currentUser,
  });

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(formatDate(now));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'balance' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { employee, position, balance, due_date } = formData;

    if (!employee || !position || !due_date || !currentUser) {
      showError('Please fill in all required fields', 'Error');
      return;
    }

    const result = await showConfirmation(
      'Are you sure you want to add this balance record?',
      'Confirm Action',
    );

    if (result.isConfirmed) {
      try {
        await onAddBalance(formData);
        showSuccess('Balance added successfully', 'Success');
        onClose();
      } catch (error: unknown) {
        console.error('Error adding balance:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        showError('Failed to add balance: ' + errorMessage, 'Error');
      }
    }
  };

  return (
    <div className="modalOverlay">
      <div className="addBalanceModal">
        {/* Close Button */}
        <button type="button" className="closeButton" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>

        <div className="modalHeader">
          <h1>Add Balance</h1>
          <div className="timeDate">
            <div className="currTime">{currentTime}</div>
            <div className="currDate">{currentDate}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modalContent">
            <div className="formFieldsVertical">
              <div className='formRow'>
                <div className="formField">
                  <label htmlFor="employee">Employee</label>
                  <input
                    type="text"
                    id="employee"
                    name="employee"
                    value={formData.employee}
                    onChange={handleChange}
                    placeholder="Enter employee name"
                    required
                    className="formInput"
                  />
                </div>

                <div className="formField">
                  <label htmlFor="position">Position</label>
                  <input
                    type="text"
                    id="position"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    placeholder="Enter position"
                    required
                    className="formInput"
                  />
                </div>
              </div>

              <div className='formRow'>
                <div className="formField">
                  <label htmlFor="balance">Balance</label>
                  <input
                    type="number"
                    id="balance"
                    name="balance"
                    value={formData.balance}
                    onChange={handleChange}
                    placeholder="Enter balance amount"
                    required
                    className="formInput"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="formField">
                  <label htmlFor="due_date">Due Date</label>
                  <input
                    type="date"
                    id="due_date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                    required
                    className="formInput"
                  />
                </div>
              </div>
              

              

              <div className="formField">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter description"
                  className="formInput"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div className="modalButtons">
            <button type="submit" className="addButton">
              <i className="ri-add-line" /> Add Balance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBalance;