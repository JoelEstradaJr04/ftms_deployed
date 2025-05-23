'use client';

import React, { useEffect, useState } from 'react';
import '../styles/addExpense.css';
import ItemList from '../Components/addExpense_itemList';
import { Item } from '../utility/calcAmount';

type ExpenseData = {
  id: number;
  date: string;
  department: string;
  description: string;
  amount: number;
  items?: Item[];
};

type ViewExpenseModalProps = {
  onClose: () => void;
  record: ExpenseData;
};

const ViewExpenseModal: React.FC<ViewExpenseModalProps> = ({ onClose, record }) => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setCurrentDate(now.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' }));
  }, []);

  return (
    <div className="modalOverlay">
      <div className="addExpenseModal">
        <div className="modalHeader">
          <h2>View Expense</h2>
          <div className="timeDate">
            <div className="currTime">{currentTime}</div>
            <div className="currDate">{currentDate}</div>
          </div>
        </div>

        <form>
          <div className="row">
            <div className="formFields">
              {/* Department */}
              <div className="formField">
                <label htmlFor="category">Category</label>
                <select id="category" name="category" value={record.department} disabled>
                  <option value={record.department}>{record.department}</option>
                </select>
              </div>

              {/* Description */}
              <div className="formField">
                <label htmlFor="expense">Expense</label>
                <input
                  type="text"
                  id="expense"
                  name="expense"
                  value={record.description}
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Item List */}
          <div className="itemList">
            <ItemList items={record.items ?? []} setItems={() => {}} readOnly />
          </div>

          {/* Total Amount */}
          <div className="formField" style={{ marginTop: '1rem' }}>
            <label>Total Amount</label>
            <input type="text" value={`$${record.amount.toFixed(2)}`} readOnly />
          </div>

          {/* Close Button Only */}
          <div className="buttonRow">
            <div className="buttonContainer">
              <button type="button" className="cancelButton" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ViewExpenseModal;
