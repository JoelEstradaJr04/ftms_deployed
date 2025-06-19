/* ──────────────────────────────────────────────────────────────
   File: app/Components/editExpense.tsx
   Desc: Edit-Expense modal – mirrors Add-Expense UI/logic
   ──────────────────────────────────────────────────────────── */
'use client';

import React, { useState, useEffect } from 'react';
import '../../styles/editExpense.css';
import { getAssignmentById } from '@/lib/supabase/assignments';
import { formatDate } from '../../utility/dateFormatter';
import { showError, showConfirmation } from '../../utility/Alerts';
import { formatDisplayText } from '@/app/utils/formatting';
import { validateField, isValidAmount, ValidationRule } from "../../utility/validation";


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
    receipt?: Receipt;
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
  const [originalTripExpense, setOriginalTripExpense] = useState<number | null>(null);
  const [showDeviationWarning, setShowDeviationWarning] = useState(false);
  const [deviationPercentage, setDeviationPercentage] = useState(0);

  type FieldName = 'category' | 'assignment_id' | 'receipt_id' | 'source' | 'amount' | 'other_source' | 'total_amount' | 'expense_date' | 'other_category';

  const validationRules: Record<FieldName, ValidationRule> = {
    expense_date: { required: true, label: "Expense Date" },
    category: { required: true, label: "Category" },
    source: { required: true, label: "Source" },
    amount: { required: true, min: 0.01, label: "Amount" },
    assignment_id: { required: record.source === 'operations', label: "Assignment" },
    receipt_id: { required: record.source === 'receipt', label: "Receipt" },
    other_source: { required: record.source === 'other', label: "Other Source", minLength: 2, maxLength: 50 },
    other_category: { required: record.category === 'Other', label: "Other Category", minLength: 2, maxLength: 50 },
    total_amount: { required: false, label: "Total Amount" }, // Added to satisfy FieldName
  };

  const [errors, setErrors] = useState<Record<FieldName, string[]>>({
      category: [],
      assignment_id: [],
      receipt_id: [],
      source: [],
      amount: [],
      other_source: [],
      total_amount: [],
      expense_date: [],
      other_category: [],
    });

  const [formData, setFormData] = useState({
      category: 'Fuel',
      assignment_id: '',
      receipt_id: '',
      total_amount: 0,
      expense_date: new Date().toISOString().split('T')[0],
      other_source: '',
      other_category: '',
    });


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
  
      // Prepare the new value for formData
      let newValue: any = value;
  
      if (name === 'total_amount') {
        newValue = parseFloat(value) || 0;
      }
  
      // Special handling for category "Other"
      if (name === 'category' && value === 'Other') {
        setFormData(prev => ({
          ...prev,
          category: value,
          other_category: '', // Reset other_category when switching to Other
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: newValue,
        }));
      }
  
      // Validate this field immediately
      if (validationRules[name as FieldName]) {
        setErrors(prev => ({
          ...prev,
          [name]: validateField(newValue, validationRules[name as FieldName]),
        }));
      }
    };

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
                    <label htmlFor="category">Category<span className='requiredTags'></span></label>
                    <input
                      type="text"
                      id="category"
                      name="category"
                      value={record.category === 'Other' ? record.other_category || 'Other' : record.category}
                      onChange={handleInputChange}
                      readOnly
                      className={`formInput${errors.category.length ? ' input-error' : ''}`}
                    />
                    {errors.category.map((msg, i) => (
                      <div className="error-message" key={i}>{msg}</div>
                    ))}
                  </div>
                  <div className="formField">
                    <label htmlFor="source">Source<span className='requiredTags'> *</span></label>
                    <input
                      type="text"
                      id="source"
                      name="source"
                      value={record.source}
                      readOnly
                      onChange={handleInputChange}
                      className={`formInput${errors.source.length ? ' input-error' : ''}`}
                    />
                    {errors.source.map((msg, i) => (
                      <div className="error-message" key={i}>{msg}</div>
                    ))}
                  </div>
                </div>

                {record.category === 'Other' && (
                  <div className="formRow">
                    <div className="formField">
                      <label htmlFor="other_category">Category<span className='requiredTags'></span></label>
                      <input
                        type="text"
                        id="other_category"
                        name="other_category"
                        value={otherCategory}
                        onChange={(e) => { setOtherCategory(e.target.value); handleInputChange(e); }}
                        placeholder="Specify category"
                        required
                        className={`formInput${errors.other_category.length ? ' input-error' : ''}`}
                      />
                      {errors.other_category.map((msg, i) => (
                        <div className="error-message" key={i}>{msg}</div>
                      ))}
                    </div>
                    <div className="formField">
                      <label htmlFor="other_source">Source<span className='requiredTags'></span></label>
                      <input
                        type="text"
                        id="other_source"
                        name="other_source"
                        value={otherSource}
                        onChange={(e) => {setOtherSource(e.target.value); handleInputChange(e); }}
                        placeholder="Specify source"
                        required
                        className={`formInput${errors.other_source.length ? ' input-error' : ''}`}
                      />
                      {errors.other_source.map((msg, i) => (
                        <div className="error-message" key={i}>{msg}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="formRow">
                  <div className="formField">
                    <label htmlFor="expense_date">Expense Date<span className='requiredTags'> *</span></label>
                    <input
                      type="date"
                      id="expense_date"
                      name="expense_date"
                      value={expenseDate}
                      onChange={(e) => {setExpenseDate(e.target.value); handleInputChange(e); }}
                      required
                      className={`formInput${errors.expense_date.length ? ' input-error' : ''}`}
                    />
                    {errors.expense_date.map((msg, i) => (
                      <div className="error-message" key={i}>{msg}</div>
                    ))}
                  </div>
                </div>
                
                <div className="formRow">
                  <div className="formField">
                    <label htmlFor="expense_date">Expense Date<span className='requiredTags'> *</span></label>
                    <input
                      type="date"
                      id="expense_date"
                      name="expense_date"
                      value={expenseDate}
                      onChange={(e) => {setExpenseDate(e.target.value); handleInputChange(e); }}
                      required
                      className={`formInput${errors.expense_date.length ? ' input-error' : ''}`}
                      max={currentDate} // Prevent future dates
                    />
                    {errors.expense_date.map((msg, i) => (
                      <div className="error-message" key={i}>{msg}</div>
                    ))}
                  </div>
                  <div className="formField">
                    <label htmlFor="amount">Amount<span className='requiredTags'> *</span></label>
                    <input
                      type="number"
                      id="amount"
                      name="amount"
                      value={amount}
                      onChange={(e) => {handleAmountChange(parseFloat(e.target.value)); handleInputChange(e); }}
                      min="0"
                      step="0.01"
                      required
                      className={`formInput${errors.amount.length ? ' input-error' : ''}`}
                    />
                    {errors.amount.map((msg, i) => (
                      <div className="error-message" key={i}>{msg}</div>
                    ))}
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

                <div className="detailRow">
                  <span className="label">Category:</span>
                  <span className="value">
                    {record.category === 'Other' ? formatDisplayText(record.other_category || '') : formatDisplayText(record.category)}
                  </span>
                </div>

                <div className="detailRow">
                  <span className="label">Terms:</span>
                  <span className="value">{record.receipt?.terms ? formatDisplayText(record.receipt.terms) : 'N/A'}</span>
                </div>

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