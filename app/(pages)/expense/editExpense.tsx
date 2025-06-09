/* ──────────────────────────────────────────────────────────────
   File: app/Components/editExpense.tsx
   Desc: Edit-Expense modal – mirrors Add-Expense UI/logic
   ──────────────────────────────────────────────────────────── */
'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import '../../styles/editExpense.css';
import { getAssignmentById } from '@/lib/supabase/assignments';
import { formatDate } from '../../utility/dateFormatter';
import { showSuccess, showError, showWarning, showInformation, showConfirmation } from '../../utility/Alerts';

/* ───── types ──────────────────────────────────────────────── */
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
  transaction_date: string;
  vat_reg_tin?: string;
  terms?: string;
  status: string;
  total_amount: number;
  vat_amount?: number;
  total_amount_due?: number;
  items: ReceiptItem[];
};

export type ExpenseData = {
  expense_id: string;
  date: string;
  department_from: string;
  category: string;
  total_amount: number;
  receipt?: Receipt;
};

type EditExpenseModalProps = {
  record: {
    expense_id: string;
    expense_date: string;
    category: string;
    source: string;
    amount: number;
    assignment_id?: string;
    receipt_id?: string;
    other_source?: string;
    other_category?: string;
  };
  onClose: () => void;
  onSave: (updatedRecord: {
    expense_id: string;
    expense_date: string;
    total_amount: number;
    other_source?: string;
    other_category?: string;
  }) => void;
};

/* ───── component ──────────────────────────────────────────── */
const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  record,
  onClose,
  onSave
}) => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [expenseDate, setExpenseDate] = useState(record.expense_date);
  const [amount, setAmount] = useState(record.amount);
  const [otherSource, setOtherSource] = useState(record.other_source || '');
  const [otherCategory, setOtherCategory] = useState(record.other_category || '');
  const [originalAmount] = useState(record.amount);
  const [originalTripExpense, setOriginalTripExpense] = useState<number | null>(null);
  const [showDeviationWarning, setShowDeviationWarning] = useState(false);
  const [deviationPercentage, setDeviationPercentage] = useState(0);

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

  useEffect(() => {
    const fetchOriginalAmount = async () => {
      if (record.assignment_id) {
        try {
          const assignmentData = await getAssignmentById(record.assignment_id);
          if (assignmentData?.trip_fuel_expense) {
            setOriginalTripExpense(assignmentData.trip_fuel_expense);
            const deviation = Math.abs((record.amount - assignmentData.trip_fuel_expense) / assignmentData.trip_fuel_expense * 100);
            setDeviationPercentage(deviation);
            setShowDeviationWarning(deviation > 10);
          }
        } catch (error) {
          console.error('Error fetching assignment data:', error);
        }
      }
    };

    fetchOriginalAmount();
  }, [record.assignment_id, record.amount]);

  const handleAmountChange = (newAmount: number) => {
    setAmount(newAmount);
    if (originalTripExpense) {
      const deviation = Math.abs((newAmount - originalTripExpense) / originalTripExpense * 100);
      setDeviationPercentage(deviation);
      setShowDeviationWarning(deviation > 10);
    }
  };

  const handleSave = async () => {
    if (!expenseDate) {
      await showError('Please fill in all required fields', 'Error');
      return;
    }

    if (record.category === 'Other' && !otherCategory) {
      await showError('Please specify the category', 'Error');
      return;
    }

    let confirmMessage = 'Do you want to save the changes to this record?';
    if (showDeviationWarning) {
      confirmMessage = `Warning: The amount deviates by ${deviationPercentage.toFixed(2)}% from the original expense amount. Do you want to proceed?`;
    }

    const result = await showConfirmation(
      confirmMessage,
      'Save Changes?',
    );


    if (result.isConfirmed) {
      onSave({
        expense_id: record.expense_id,
        expense_date: expenseDate,
        total_amount: amount,
        other_source: record.category === 'Other' ? otherSource : undefined,
        other_category: record.category === 'Other' ? otherCategory : undefined
      });
    }
  };

  return (
    <div className="modalOverlay">
      <div className="editExpenseModal">
        {/* Close Button */}
        <button type="button" className="closeButton" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>

        <div className="modalHeader">
          <h1>Edit Expense</h1>
          <div className="timeDate">
            <div className="currTime">{currentTime}</div>
            <div className="currDate">{currentDate}</div>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="modalContent">
            <div className="formFieldsHorizontal">
              <div className="formInputs">
                
                <div className="formRow">
                  <div className="formField">
                    <label htmlFor="category">Category</label>
                    <input
                      type="text"
                      id="category"
                      name="category"
                      value={record.category === 'Other' ? record.other_category || 'Other' : record.category}
                      readOnly
                      className="formInput"
                    />
                  </div>
                  <div className="formField">
                    <label htmlFor="source">Source</label>
                    <input
                      type="text"
                      id="source"
                      name="source"
                      value={record.source}
                      readOnly
                      className="formInput"
                    />
                  </div>
                </div>

                {record.category === 'Other' && (
                  <div className="formRow">
                    <div className="formField">
                      <label htmlFor="other_category">Category</label>
                      <input
                        type="text"
                        id="other_category"
                        name="other_category"
                        value={otherCategory}
                        onChange={(e) => setOtherCategory(e.target.value)}
                        placeholder="Specify category"
                        required
                        className="formInput"
                      />
                    </div>
                    <div className="formField">
                      <label htmlFor="other_source">Source</label>
                      <input
                        type="text"
                        id="other_source"
                        name="other_source"
                        value={otherSource}
                        onChange={(e) => setOtherSource(e.target.value)}
                        placeholder="Specify source"
                        required
                        className="formInput"
                      />
                    </div>
                  </div>
                )}

                <div className="formRow">
                  <div className="formField">
                    <label htmlFor="expense_date">Expense Date</label>
                    <input
                      type="date"
                      id="expense_date"
                      name="expense_date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      required
                      className="formInput"
                    />
                  </div>
                  <div className="formField">
                    <label htmlFor="amount">Amount</label>
                    <input
                      type="number"
                      id="amount"
                      name="amount"
                      value={amount}
                      onChange={(e) => handleAmountChange(parseFloat(e.target.value))}
                      min="0"
                      step="0.01"
                      required
                      className="formInput"
                    />
                  </div>
                </div>

                {/* Original Trip Expense Section - Moved below the form fields */}
                {originalTripExpense !== null && (
                  <div className="originalExpenseSection">
                    <div className="originalExpenseBox">
                      <span className="originalExpenseLabel">Original Trip Expense:</span>
                      <span className="originalExpenseAmount">₱{originalTripExpense.toLocaleString()}</span>
                      {showDeviationWarning && (
                        <div className="deviationWarning">
                          Deviation: {deviationPercentage.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          <div className="modalButtons">
            <button type="button" onClick={onClose} className="cancelButton">
              <i className="ri-close-line" /> Cancel
            </button>
            <button type="submit" className="saveButton">
              <i className="ri-save-line" /> Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditExpenseModal;