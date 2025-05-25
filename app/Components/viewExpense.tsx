'use client';

import React, { useEffect, useState } from 'react';
import '../styles/addExpense.css';
import ItemList from '../Components/addExpense_itemList';
import { Item } from '../utility/calcAmount';

type ReceiptItem = {
  receipt_item_id: string;
  item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type Receipt = {
  receipt_id: string;
  supplier: string;
  receipt_date: string;
  vat_reg_tin?: string;
  terms?: string;
  status: string;
  total_amount: number;
  vat_amount?: number;
  total_amount_due?: number;
  items: ReceiptItem[];
};

type ExpenseData = {
  expense_id: string;
  date: string;
  department_from: string;
  category: string;
  total_amount: number;
  receipt?: Receipt;
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

  const items: Item[] = record.receipt?.items.map(item => ({
    name: item.item_name,
    quantity: item.quantity.toString(),
    unitPrice: item.unit_price.toString()
  })) ?? [];

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
                <select id="category" name="category" value={record.department_from} disabled>
                  <option value={record.department_from}>{record.department_from}</option>
                </select>
              </div>

              {/* Description */}
              <div className="formField">
                <label htmlFor="expense">Category</label>
                <input
                  type="text"
                  id="expense"
                  name="expense"
                  value={record.category}
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Item List */}
          <div className="itemList">
            <ItemList items={items} readOnly />
          </div>

          {/* Total Amount */}
          <div className="formField" style={{ marginTop: '1rem' }}>
            <label>Total Amount</label>
            <input type="text" value={`₱${Number(record.total_amount).toFixed(2)}`} readOnly />
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
