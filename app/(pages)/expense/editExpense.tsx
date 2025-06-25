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
import { validateField, ValidationRule } from "../../utility/validation";
import { getAllEmployees } from '@/lib/supabase/employees';


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
  payment_method?: 'CASH' | 'REIMBURSEMENT';
};

type Reimbursement = {
  reimbursement_id: string;
  expense_id: string;
  assignment_id?: string;
  employee_id: string;
  employee_name: string;
  job_title?: string;
  amount: number;
  status: {
    id: string;
    name: string;
  };
  requested_date?: string;
  approved_by?: string;
  approved_date?: string;
  rejection_reason?: string;
  paid_by?: string;
  paid_date?: string;
  payment_reference?: string;
  payment_method?: string;
  created_by: string;
  created_at?: string;
  updated_by?: string;
  updated_at?: string;
  is_deleted?: boolean;
};

type Assignment = {
  assignment_id: string;
  bus_plate_number: string;
  bus_route: string;
  bus_type: string;
  driver_id: string;
  conductor_id: string;
  date_assigned: string;
  trip_fuel_expense: number;
  driver_name?: string;
  conductor_name?: string;
};

type EditExpenseModalProps = {
  record: {
    expense_id: string;
    expense_date: string;
    category: {
      category_id: string;
      name: string;
    };
    other_category?: string;
    total_amount: number;
    assignment?: Assignment;
    receipt?: Receipt;
    other_source?: string;
    payment_method?: 'CASH' | 'REIMBURSEMENT';
    reimbursements?: Reimbursement[];
  };
  onClose: () => void;
  onSave: (updatedRecord: {
    expense_id: string;
    expense_date: string;
    total_amount: number;
    reimbursements?: { reimbursement_id: string; amount: number }[];
    other_source?: string;
    other_category?: string;
    payment_method?: 'CASH' | 'REIMBURSEMENT';
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
  const [amount, setAmount] = useState(record.total_amount);
  const [otherSource, setOtherSource] = useState(record.other_source || '');
  const [otherCategory, setOtherCategory] = useState(record.other_category || '');
  const [originalTripExpense, setOriginalTripExpense] = useState<number | null>(null);
  const [showDeviationWarning, setShowDeviationWarning] = useState(false);
  const [deviationPercentage, setDeviationPercentage] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'REIMBURSEMENT'>(record.payment_method || 'CASH');
  const [reimbursementEdits, setReimbursementEdits] = useState<{ [id: string]: string }>({});
  const [reimbEditMode, setReimbEditMode] = useState(false);
  const [employeeList, setEmployeeList] = useState<{ employee_id: string; name: string; job_title?: string }[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(record.reimbursements?.[0]?.employee_id || '');
  const [reimbursableAmount, setReimbursableAmount] = useState(record.reimbursements?.[0]?.amount?.toString() || '');
  const [, setEmployeeName] = useState(record.reimbursements?.[0]?.employee_name || '');
  const isReceiptSource = !!record.receipt && !record.assignment;

  type FieldName = 'category' | 'assignment_id' | 'receipt_id' | 'amount' | 'other_source' | 'total_amount' | 'expense_date' | 'other_category' | 'payment_method';

  const validationRules: Record<FieldName, ValidationRule> = {
    expense_date: { required: true, label: "Expense Date" },
    category: { required: true, label: "Category" },
    amount: { required: true, min: 0.01, label: "Amount" },
    assignment_id: { required: false, label: "Assignment" },
    receipt_id: { required: false, label: "Receipt" },
    other_source: { required: false, label: "Other Source", minLength: 2, maxLength: 50 },
    other_category: { required: record.category.name === 'Other', label: "Other Category", minLength: 2, maxLength: 50 },
    total_amount: { required: false, label: "Total Amount" },
    payment_method: { required: false, label: "Payment Method" },
  };

  const [errors, setErrors] = useState<Record<FieldName, string[]>>({
      category: [],
      assignment_id: [],
      receipt_id: [],
      amount: [],
      other_source: [],
      total_amount: [],
      expense_date: [],
      other_category: [],
      payment_method: [],
    });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
  
      // Prepare the new value for formData
      let newValue: string | number = value;
  
      if (name === 'total_amount') {
        newValue = parseFloat(value) || 0;
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
      if (record.assignment && record.assignment.assignment_id) {
        try {
          const assignmentData = await getAssignmentById(record.assignment.assignment_id);
          if (assignmentData?.trip_fuel_expense) {
            setOriginalTripExpense(assignmentData.trip_fuel_expense);
            const deviation = Math.abs((record.total_amount - assignmentData.trip_fuel_expense) / assignmentData.trip_fuel_expense * 100);
            setDeviationPercentage(deviation);
            setShowDeviationWarning(deviation > 10);
          }
        } catch (error) {
          console.error('Error fetching assignment data:', error);
        }
      }
    };
    fetchOriginalAmount();
  }, [record.assignment, record.total_amount]);

  useEffect(() => {
    if (isReceiptSource) {
      getAllEmployees().then((emps) => setEmployeeList(emps || []));
    }
  }, [isReceiptSource]);

  useEffect(() => {
    if (selectedEmployeeId && employeeList.length > 0) {
      const emp = employeeList.find(e => e.employee_id === selectedEmployeeId);
      setEmployeeName(emp?.name || '');
    }
  }, [selectedEmployeeId, employeeList]);

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

    if (record.category.name === 'Other' && !otherCategory) {
      await showError('Please specify the category', 'Error');
      return;
    }

    if (isReceiptSource && paymentMethod === 'REIMBURSEMENT') {
      if (!selectedEmployeeId) {
        await showError('Please select an employee for reimbursement.', 'Error');
        return;
      }
      if (!reimbursableAmount || isNaN(Number(reimbursableAmount)) || Number(reimbursableAmount) < 1) {
        await showError('Please enter a valid reimbursable amount.', 'Error');
        return;
      }
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
      let updatedReimbursements = record.reimbursements?.map(r => ({
        reimbursement_id: r.reimbursement_id,
        amount: reimbursementEdits[r.reimbursement_id] ? Number(reimbursementEdits[r.reimbursement_id]) : r.amount
      }));
      if (isReceiptSource && paymentMethod === 'REIMBURSEMENT') {
        updatedReimbursements = [{
          reimbursement_id: record.reimbursements?.[0]?.reimbursement_id || '',
          amount: Number(reimbursableAmount),
        }];
      }
      onSave({
        expense_id: record.expense_id,
        expense_date: expenseDate,
        total_amount: amount,
        reimbursements: updatedReimbursements,
        other_source: record.other_source,
        other_category: record.other_category,
        payment_method: paymentMethod,
        ...(isReceiptSource && paymentMethod === 'REIMBURSEMENT' ? {
          reimbursable_amount: Number(reimbursableAmount),
          employee_id: selectedEmployeeId,
        } : {}),
      });
    }
  };

  // Only allow reimbursement editing for operations-sourced expenses
  const isOperationsSource = !!record.assignment;

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
                      value={record.category.name === 'Other' ? record.other_category || 'Other' : record.category.name}
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
                      value={record.assignment ? 'Operations' : record.receipt ? 'Receipt' : 'Other'}
                      readOnly
                      className="formInput"
                    />
                  </div>
                </div>

                {record.category.name === 'Other' && (
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

                <div className="formField">
                  {isReceiptSource && (
                    <>
                  <label htmlFor="payment_method">Payment Method<span className='requiredTags'> *</span></label>
                  <select
                    id="payment_method"
                    name="payment_method"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as 'CASH' | 'REIMBURSEMENT')}
                    required
                    className="formSelect"
                  >
                    <option value="CASH">Company Paid (CASH)</option>
                    <option value="REIMBURSEMENT">Employee Reimbursement</option>
                  </select>
                    </>
                  )}
                  {/* Only show for receipt-based and if toggled to reimbursement */}
                  {isReceiptSource && paymentMethod === 'REIMBURSEMENT' && (
                    <>
                  <div className="formField">
                        <label htmlFor="employee_id">Employee<span className='requiredTags'> *</span></label>
                        <select
                          id="employee_id"
                          name="employee_id"
                          value={selectedEmployeeId}
                          onChange={e => setSelectedEmployeeId(e.target.value)}
                          required
                          className='formSelect'
                        >
                          <option value="">Select Employee</option>
                          {employeeList.map(emp => (
                            <option key={emp.employee_id} value={emp.employee_id}>{emp.name} {emp.job_title ? `(${emp.job_title})` : ''}</option>
                          ))}
                        </select>
                    </div>
                      <div className="formField">
                        <label htmlFor="reimbursable_amount">Reimbursable Amount<span className='requiredTags'> *</span></label>
                        <input
                          type="number"
                          id="reimbursable_amount"
                          name="reimbursable_amount"
                          value={reimbursableAmount}
                          onChange={e => setReimbursableAmount(e.target.value)}
                          min="1"
                          className="formInput"
                          required
                        />
                  </div>
                    </>
                  )}
                  {/* Show badge if reimbursement exists */}
                  {isReceiptSource && record.reimbursements && record.reimbursements.length > 0 && (
                    <span className={`reimb-status-badge ${record.reimbursements[0].status?.name?.toLowerCase()}`}>{record.reimbursements[0].status?.name}</span>
                )}
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

                <div className="mainDetails">
                  <div className="detailRow">
                    <span className="label">Category:</span>
                    <span className="value">
                      {record.category.name === 'Other' ? record.other_category || 'Other' : formatDisplayText(record.category.name)}
                      <span className="locked-label">Auto-filled from Operations (locked)</span>
                    </span>
                  </div>
                  <div className="detailRow">
                    <span className="label">Amount:</span>
                    <span className="value">₱{Number(record.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="locked-label">Auto-filled from Operations (locked)</span>
                    </span>
                  </div>
                  <div className="detailRow">
                    <span className="label">Date:</span>
                    <span className="value">{formatDate(record.expense_date)}
                      <span className="locked-label">Auto-filled from Operations (locked)</span>
                    </span>
                  </div>
                  <div className="detailRow">
                    <span className="label">Payment Method:</span>
                    <span className="value">{record.payment_method === 'REIMBURSEMENT' ? 'Employee Reimbursement' : 'Company Paid (CASH)'}
                      <span className="locked-label">Auto-filled from Operations (locked)</span>
                    </span>
                  </div>
                  {isOperationsSource && (
                    <div className="detailRow">
                      <span className="label">Reimbursement:</span>
                      {record.payment_method !== 'REIMBURSEMENT' && !reimbEditMode ? (
                        <button type="button" onClick={() => setReimbEditMode(true)} className="addReimbBtn">Add Reimbursement</button>
                      ) : (
                        <>
                          <select
                            value={record.reimbursements?.[0]?.employee_id || ''}
                            onChange={e => setReimbursementEdits(edits => ({ ...edits, employee_id: e.target.value }))}
                            disabled={!reimbEditMode}
                          >
                            {/* Populate with driver/conductor options from assignment */}
                            <option value={record.assignment?.driver_id}>{record.assignment?.driver_name} (Driver)</option>
                            <option value={record.assignment?.conductor_id}>{record.assignment?.conductor_name} (Conductor)</option>
                          </select>
                          <input
                            type="number"
                            min="1"
                            value={reimbursementEdits.reimbursable_amount || record.reimbursements?.[0]?.amount || ''}
                            onChange={e => setReimbursementEdits(edits => ({ ...edits, reimbursable_amount: e.target.value }))}
                            placeholder={record.reimbursements?.[0]?.amount?.toString() || ''}
                            disabled={!reimbEditMode}
                          />
                          <button type="button" onClick={() => setReimbEditMode(false)} className="cancelReimbBtn">Cancel</button>
                        </>
                      )}
                      {/* Show status badge if reimbursement exists */}
                      {record.reimbursements && record.reimbursements.length > 0 && (
                        <span className={`reimb-status-badge ${record.reimbursements[0].status?.name?.toLowerCase()}`}>{record.reimbursements[0].status?.name}</span>
                      )}
                    </div>
                  )}
                </div>
                {record.assignment && (
                  <div className="operationsDetails">
                    <h3>Operations Details</h3>
                    <div className="detailRow">
                      <span className="label">Bus Plate Number:</span>
                      <span className="value">{record.assignment.bus_plate_number} <span className="locked-label">Auto-filled from Operations (locked)</span></span>
                    </div>
                    <div className="detailRow">
                      <span className="label">Bus Route:</span>
                      <span className="value">{record.assignment.bus_route} <span className="locked-label">Auto-filled from Operations (locked)</span></span>
                    </div>
                    <div className="detailRow">
                      <span className="label">Bus Type:</span>
                      <span className="value">{record.assignment.bus_type} <span className="locked-label">Auto-filled from Operations (locked)</span></span>
                    </div>
                    <div className="detailRow">
                      <span className="label">Driver:</span>
                      <span className="value">{record.assignment.driver_name || record.assignment.driver_id} <span className="locked-label">Auto-filled from Operations (locked)</span></span>
                    </div>
                    <div className="detailRow">
                      <span className="label">Conductor:</span>
                      <span className="value">{record.assignment.conductor_name || record.assignment.conductor_id} <span className="locked-label">Auto-filled from Operations (locked)</span></span>
                    </div>
                    <div className="detailRow">
                      <span className="label">Date Assigned:</span>
                      <span className="value">{formatDate(record.assignment.date_assigned)} <span className="locked-label">Auto-filled from Operations (locked)</span></span>
                    </div>
                    <div className="detailRow">
                      <span className="label">Trip Fuel Expense:</span>
                      <span className="value">₱{record.assignment.trip_fuel_expense.toLocaleString()} <span className="locked-label">Auto-filled from Operations (locked)</span></span>
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