// AddExpenseModal.tsx
'use client';

//---------------------IMPORTS HERE----------------------//
import React, { useState, useEffect } from 'react';
import '../../styles/addExpense.css';
import { formatDate } from '../../utility/dateFormatter';
import { showSuccess, showError, showConfirmation } from '../../utility/Alerts';
import { validateField, isValidAmount, ValidationRule } from "../../utility/validation";
import type { Receipt as OriginalReceipt } from '../../types/receipt';
import { formatDisplayText } from '../../utils/formatting';
import BusSelector from '../../Components/busSelector';


type Receipt = OriginalReceipt & {
  category_name?: string;
  category_id?: string;
  terms_name?: string;
};

//---------------------DECLARATIONS HERE----------------------//
// Uncomment and use these types
// type ExpenseData = {
//   expense_id: string;
//   date: string;
//   department_from: string;
//   category: string;
//   total_amount: number;
//   receipt?: Receipt;
// };

// Employee types based on Supabase tables
type Employee = {
  employee_id: string;
  name: string;
  job_title: string;
};

type AddExpenseProps = {
  onClose: () => void;
  onAddExpense: (formData: {
    category?: string;
    category_id?: string;
    assignment_id?: string;
    receipt_id?: string;
    total_amount: number;
    expense_date: string;
    created_by: string;
    other_source?: string;
    payment_method: string;
    employee_id?: string;
    employee_name?: string;
    driver_reimbursement?: number;
    conductor_reimbursement?: number;
  }) => void;
  assignments: {
    assignment_id: string;
    bus_plate_number: string;
    bus_route: string;
    bus_type: string;
    driver_id: string;
    conductor_id: string;
    date_assigned: string;
    trip_fuel_expense: number;
    is_expense_recorded: boolean;
    payment_method: string;
  }[];
  currentUser: string;
};

type FieldName = 'category' | 'assignment_id' | 'receipt_id' | 'other_source' | 'total_amount' | 'expense_date' | 'other_category';

const AddExpense: React.FC<AddExpenseProps> = ({ 
  onClose, 
  onAddExpense,
  assignments,
  currentUser 
}) => {
  const [showBusSelector, setShowBusSelector] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [source, setSource] = useState<'operations' | 'receipt' | 'other'>('operations');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [receiptLoading, setReceiptLoading] = useState(true);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [errors, setErrors] = useState<Record<FieldName, string[]>>({
    category: [],
    assignment_id: [],
    receipt_id: [],
    other_source: [],
    total_amount: [],
    expense_date: [],
    other_category: [],
  });

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'REIMBURSEMENT'>('CASH');

  const [formData, setFormData] = useState({
    category: 'Fuel',
    category_id: '',
    assignment_id: '',
    receipt_id: '',
    total_amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    created_by: currentUser,
    other_source: '',
    other_category: '',
  });

  // New state for driver/conductor reimbursement amounts
  const [driverReimb, setDriverReimb] = useState('');
  const [conductorReimb, setConductorReimb] = useState('');
  const [reimbError, setReimbError] = useState('');

  // Add state for selected employee for 'other' reimbursement
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // --- Reimbursement fields for receipt-sourced expenses ---
  type ReimbursementEntry = {
    employee_id: string;
    job_title: string;
    amount: string;
    error?: string;
  };
  const [reimbursementRows, setReimbursementRows] = useState<ReimbursementEntry[]>([{
    employee_id: '',
    job_title: '',
    amount: '',
    error: '',
  }]);

  // Helper: get available employees for a row (exclude already selected)
  const getAvailableEmployees = (rowIdx: number) => {
    const selectedIds = reimbursementRows.map((row, idx) => idx === rowIdx ? null : row.employee_id).filter(Boolean);
    return allEmployees.filter(emp => !selectedIds.includes(emp.employee_id));
  };

  // Handler: update a reimbursement row
  const handleReimbRowChange = (idx: number, field: 'employee_id' | 'amount') => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setReimbursementRows(prev => {
      const updated = [...prev];
      if (field === 'employee_id') {
        const emp = allEmployees.find(emp => emp.employee_id === value);
        updated[idx] = {
          ...updated[idx],
          employee_id: value,
          job_title: emp ? emp.job_title : '',
          error: '',
        };
      } else if (field === 'amount') {
        updated[idx] = {
          ...updated[idx],
          amount: value,
          error: '',
        };
      }
      return updated;
    });
  };

  // Handler: add a new reimbursement row
  const handleAddReimbRow = () => {
    setReimbursementRows(prev => ([...prev, { employee_id: '', job_title: '', amount: '', error: '' }]));
  };

  // Handler: remove a reimbursement row
  const handleRemoveReimbRow = (idx: number) => {
    setReimbursementRows(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
  };

  // Validation for reimbursement rows
  const validateReimbRows = () => {
    let valid = true;
    setReimbursementRows(prev => prev.map(row => {
      let error = '';
      if (!row.employee_id) error = 'Select employee';
      else if (!row.job_title) error = 'Job title missing';
      else if (!row.amount || isNaN(Number(row.amount)) || Number(row.amount) <= 0) error = 'Enter positive amount';
      if (error) valid = false;
      return { ...row, error };
    }));
    return valid;
  };

  // Prevent adding new row if any current row is invalid
  const canAddRow = reimbursementRows.every(row => row.employee_id && row.job_title && row.amount && !isNaN(Number(row.amount)) && Number(row.amount) > 0);

  // Prevent duplicate employees
  const hasDuplicateEmployees = () => {
    const ids = reimbursementRows.map(r => r.employee_id).filter(Boolean);
    return new Set(ids).size !== ids.length;
  };

  const validationRules: Record<FieldName, ValidationRule> = {
    category: { required: true, label: "Category"},
    assignment_id: { required: source === 'operations', label: "Assignment" },
    receipt_id: { required: source === 'receipt', label: "Receipt" },
    other_source: { required: source === 'other', label: "Source", minLength: 2, maxLength: 50 },
    total_amount: { 
      required: true, 
      min: 0.01, 
      label: "Amount", 
      custom: (v: unknown) => {
        // Type guard to ensure v is a number
        const numValue = typeof v === 'number' ? v : Number(v);
        return isValidAmount(numValue) ? null : "Amount must be greater than 0.";
      }
    },
    expense_date: { required: true, label: "Expense Date" },
    other_category: { required: formData.category === 'Other', label: "Other Category", minLength: 2, maxLength: 50 },
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

  // Fetch all employees from the new endpoint
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees');
        if (!response.ok) throw new Error('Failed to fetch employees');
        const data = await response.json();
        setAllEmployees(data);
      } catch (error) {
        console.error('Error fetching employees:', error);
        showError('Error', 'Failed to load employees list');
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        setReceiptLoading(true);
        const response = await fetch('/api/receipts?isExpenseRecorded=false&fetchAll=true');
        if (!response.ok) throw new Error('Failed to fetch receipts');
        const { receipts } = await response.json();
        // Sort by transaction_date
        const sortedReceipts = receipts.sort((a: Receipt, b: Receipt) => 
          new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
        );
        setReceipts(sortedReceipts);
      } catch (error) {
        console.error('Error fetching receipts:', error);
        showError('Error', 'Failed to load receipts');
      } finally {
        setReceiptLoading(false);
      }
    };

    fetchReceipts();
  }, []);

  useEffect(() => {
    // Reset form when source changes
    setFormData(prev => ({
      ...prev,
      assignment_id: '',
      receipt_id: '',
      total_amount: 0,
      category: source === 'operations' ? 'Fuel' : '',
      other_source: '',
      other_category: '',
      expense_date: new Date().toISOString().split('T')[0],
    }));
    setPaymentMethod('CASH');
  }, [source]);

  useEffect(() => {
    if (formData.assignment_id) {
      const selectedAssignment = assignments.find(a => a.assignment_id === formData.assignment_id);
      if (selectedAssignment) {
        setFormData(prev => ({
          ...prev,
          total_amount: selectedAssignment.trip_fuel_expense,
          category: 'Fuel', // Always set to Fuel for operations
          expense_date: selectedAssignment.date_assigned.split('T')[0],
        }));
      }
    } else if (formData.receipt_id) {
      const selectedReceipt = receipts.find(r => r.receipt_id === formData.receipt_id);
      if (selectedReceipt) {
        setFormData(prev => ({
          ...prev,
          total_amount: selectedReceipt.total_amount_due,
          category: selectedReceipt.category_name || '',
          category_id: selectedReceipt.category_id || '',
          expense_date: selectedReceipt.transaction_date.split('T')[0],
        }));
      }
    }
  }, [formData.assignment_id, formData.receipt_id, assignments, receipts]);

  // Filter assignments based on is_expense_recorded
  const filteredAssignments = assignments
    .filter(a => !a.is_expense_recorded)
    .sort((a, b) => new Date(a.date_assigned).getTime() - new Date(b.date_assigned).getTime());

  // When assignment changes, auto-fill and lock fields
  useEffect(() => {
    if (source === 'operations' && formData.assignment_id) {
      const assignment = assignments.find(a => a.assignment_id === formData.assignment_id);
      if (assignment) {
        // Normalize payment_method from Supabase to match form values
        let normalizedPaymentMethod = 'CASH';
        if (assignment.payment_method && assignment.payment_method.toUpperCase() === 'REIMBURSEMENT') {
          normalizedPaymentMethod = 'REIMBURSEMENT';
        }
        setFormData(prev => ({
          ...prev,
          category: 'Fuel',
          total_amount: assignment.trip_fuel_expense,
          expense_date: assignment.date_assigned.split('T')[0],
          payment_method: normalizedPaymentMethod,
        }));
        setPaymentMethod(normalizedPaymentMethod as 'CASH' | 'REIMBURSEMENT');
      }
    }
  }, [source, formData.assignment_id, assignments]);

  // Update reimbursement validation logic
  useEffect(() => {
    if (paymentMethod === 'REIMBURSEMENT' && source === 'operations') {
      const assignment = assignments.find(a => a.assignment_id === formData.assignment_id);
      if (assignment) {
        const total = parseFloat(driverReimb || '0') + parseFloat(conductorReimb || '0');
        const max = Number(assignment.trip_fuel_expense);
        if (total < 1) {
          setReimbError('The total reimbursement must be at least 1.');
        } else if (total > max) {
          setReimbError('The total reimbursement must not exceed the trip fuel expense.');
        } else {
          setReimbError('');
        }
      }
    } else {
      setReimbError('');
    }
  }, [driverReimb, conductorReimb, paymentMethod, source, formData.assignment_id, assignments]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'category' && value === '__add_new__') {
      return;
    }

    // Prepare the new value for formData
    let newValue: string | number = value;

    if (name === 'source') {
      setSource(value as 'operations' | 'receipt' | 'other');
    }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { category, assignment_id, receipt_id, total_amount, expense_date, other_source, other_category } = formData;

    if (!category || !expense_date || !currentUser) {
      await showError('Please fill in all required fields', 'Error');
      return;
    }

    if (source === 'operations' && !assignment_id) {
      await showError('Please select an assignment', 'Error');
      return;
    }

    if (source === 'receipt' && !receipt_id) {
      await showError('Please select a receipt', 'Error');
      return;
    }

    if (source === 'other' && !other_source) {
      await showError('Please specify the source', 'Error');
      return;
    }

    if (category === 'Other' && !other_category) {
      await showError('Please specify the category', 'Error');
      return;
    }

    if (
      paymentMethod === 'REIMBURSEMENT' &&
      source === 'other' &&
      !selectedEmployeeId
    ) {
      await showError('Please select an employee for reimbursement', 'Error');
      return;
    }

    if (paymentMethod === 'REIMBURSEMENT' && source === 'operations') {
      const assignment = assignments.find(a => a.assignment_id === formData.assignment_id);
      if (!assignment) {
        await showError('Please select an assignment', 'Error');
        return;
      }
      // Find driver and conductor employee IDs
      const driver = allEmployees.find(e => e.employee_id === assignment.driver_id);
      const conductor = allEmployees.find(e => e.employee_id === assignment.conductor_id);
      if (!driver || !conductor) {
        await showError('Both driver and conductor must be valid employees for reimbursement.', 'Error');
        return;
      }
      if (!driver.employee_id || !conductor.employee_id) {
        await showError('Missing employee ID for driver or conductor.', 'Error');
        return;
      }
      // Validate reimbursement amounts
      if (!driverReimb || isNaN(Number(driverReimb)) || Number(driverReimb) < 1) {
        await showError('Please enter a valid reimbursement amount for the driver.', 'Error');
        return;
      }
      if (!conductorReimb || isNaN(Number(conductorReimb)) || Number(conductorReimb) < 1) {
        await showError('Please enter a valid reimbursement amount for the conductor.', 'Error');
        return;
      }
    }

    if (source === 'receipt' && paymentMethod === 'REIMBURSEMENT') {
      if (!validateReimbRows() || hasDuplicateEmployees()) {
        await showError('Please fix reimbursement entries (no duplicates, all fields required, positive amounts).', 'Error');
        return;
      }
    }

    const result = await showConfirmation(
      'Are you sure you want to add this expense record?',
      'Confirm Add'
    );

    if (result.isConfirmed) {
      try {
        const standardCategories = ["Fuel", "Vehicle_Parts", "Tools", "Equipment", "Supplies", "Other"];
        const isCustomCategory = !standardCategories.includes(category);
        const payload = {
          // For receipt-sourced expenses, send category_id instead of category
          ...(source === 'receipt' ? { category_id: formData.category_id } : { category: isCustomCategory ? "Other" : category }),
          total_amount,
          expense_date,
          created_by: currentUser,
          ...(source === 'operations' ? { assignment_id } : {}),
          ...(source === 'receipt' ? { receipt_id } : {}),
          ...(source === 'other' ? { other_source } : {}),
          ...(category === 'Other' ? { other_category } : {}),
          payment_method: paymentMethod,
          driver_reimbursement: paymentMethod === 'REIMBURSEMENT' && source === 'operations' ? Number(driverReimb) : undefined,
          conductor_reimbursement: paymentMethod === 'REIMBURSEMENT' && source === 'operations' ? Number(conductorReimb) : undefined,
          ...(source === 'other' && paymentMethod === 'REIMBURSEMENT' ? { employee_id: selectedEmployeeId } : {}),
          ...(source === 'receipt' && paymentMethod === 'REIMBURSEMENT' ? {
            reimbursements: reimbursementRows.map(row => ({
              employee_id: row.employee_id,
              job_title: row.job_title,
              amount: Number(row.amount),
            }))
          } : {}),
          source,
        };
        console.log('Submitting expense payload:', payload);
        await onAddExpense(payload);
        await showSuccess('Expense added successfully', 'Success');
        onClose();
      } catch (error: unknown) {
        console.error('Error adding expense:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        await showError('Failed to add expense: ' + errorMessage, 'Error');
      }
    }
  };

  // Format assignment for display
  const formatAssignment = (assignment: typeof assignments[0]) => {
    const busType = assignment.bus_type === 'Airconditioned' ? 'A' : 'O';
    const driver = allEmployees.find(e => e.employee_id === assignment.driver_id);
    const conductor = allEmployees.find(e => e.employee_id === assignment.conductor_id);
    return `${formatDate(assignment.date_assigned)} | ₱ ${assignment.trip_fuel_expense} | ${assignment.bus_plate_number} (${busType}) - ${assignment.bus_route} | ${driver?.name || 'N/A'} & ${conductor?.name || 'N/A'}`;
  };

  // Format receipt for display
  const formatReceipt = (receipt: Receipt) => {
    return `₱ ${receipt.total_amount_due} | ${formatDisplayText(receipt.terms_name || 'N/A')} | ${receipt.supplier} | ${formatDate(receipt.transaction_date)}`;
  };

  return (
    <div className="modalOverlay">
      <div className="addExpenseModal">
        {/* Close Button */}
        <button type="button" className="closeButton" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>

        <div className="modalHeader">
          <h1>Add Expense</h1>
          <div className="timeDate">
            <div className="currTime">{currentTime}</div>
            <div className="currDate">{currentDate}</div>
          </div>
        </div>

      <form onSubmit={handleSubmit}>
        <div className="modalContent">
          
            <div className="formFieldsHorizontal">
              <div className="formInputs">

                {/* SOURCE TYPE */}
                <div className="formRow">
                  <div className="formField">
                    <label htmlFor="source">Source Type<span className='requiredTags'> *</span></label>
                  <select
                    id="source"
                    name="source"
                    value={source}
                    onChange={handleInputChange}
                    required
                    className='formSelect'
                  >
                    <option value="operations">{formatDisplayText('Operations')}</option>
                    <option value="receipt">{formatDisplayText('Receipt')}</option>
                  </select>
                  </div>

                  {/* SOURCE */}
                  <div className="formField">
                    <label htmlFor="sourceDetail">Source<span className='requiredTags'> *</span></label>
                    {source === 'operations' && (
                      <>
                        <button
                          type="button"
                          className="formSelect"
                          id='busSelector'
                          style={{ textAlign: 'left', width: '100%' }}
                          onClick={() => setShowBusSelector(true)}
                        >
                          {formData.assignment_id
                            ? formatAssignment(assignments.find(a => a.assignment_id === formData.assignment_id)!)
                            : 'Select Assignment'}
                        </button>
                        {errors.assignment_id.map((msg, i) => (
                          <div className="error-message" key={i}>{msg}</div>
                        ))}
                        {showBusSelector && (
                          <BusSelector
                            assignments={filteredAssignments}
                            onSelect={assignment => {
                              setFormData(prev => ({ ...prev, assignment_id: assignment.assignment_id }));
                              setShowBusSelector(false);
                            }}
                            isOpen={showBusSelector}
                            allEmployees={allEmployees}
                            onClose={() => setShowBusSelector(false)}
                          />
                        )}
                      </>
                                      )}
                    {source === 'receipt' && (
                      <>
                        <select
                          id="sourceDetail"
                          name="receipt_id"
                          value={formData.receipt_id}
                          onChange={handleInputChange}
                          required
                          className={`formSelect${errors.receipt_id.length ? ' input-error' : ''}`}
                          disabled={receiptLoading}
                        >
                          <option value="">Select Receipt</option>
                          {receipts.map((receipt) => (
                            <option key={receipt.receipt_id} value={receipt.receipt_id}>
                              {formatReceipt(receipt)}
                            </option>
                          ))}
                        </select>
                        {errors.receipt_id.map((msg, i) => (
                          <div className="error-message" key={i}>{msg}</div>
                        ))}
                      </>
                    )}
                    {source === 'other' && (
                      <>
                        <input
                          type="text"
                          id="sourceDetail"
                          name="other_source"
                          value={formData.other_source}
                          onChange={handleInputChange}
                          placeholder="Specify source"
                          required
                          className={`formInput${errors.other_source.length ? ' input-error' : ''}`}
                        />
                        {errors.other_source.map((msg, i) => (
                          <div className="error-message" key={i}>{msg}</div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
                

                <div className="formRow">
                  {/* CATEGORY */}
                  <div className="formField">
                    <label htmlFor="category">Category<span className='requiredTags'> *</span></label>
                    <input
                      type="text"
                      id="category"
                      name="category"
                      value={formatDisplayText(formData.category)}
                      readOnly
                      className="formInput"
                    />
                    {source === 'receipt' && formData.receipt_id && (
                      <span className="autofill-note">Autofilled from Receipt</span>
                    )}
                  </div>

                  
                     {/* AMOUNT */}
                    <div className="formField">
                      <label htmlFor="amount">Amount<span className='requiredTags'> *</span></label>
                      <input
                        type="number"
                        id="amount"
                        name="total_amount"
                        value={formData.total_amount}
                        readOnly
                        className="formInput"
                      />
                    </div>
                </div>

              
                {/* DATE */}
                <div className="formField">
                  <label htmlFor="expense_date">Expense Date<span className='requiredTags'> *</span></label>
                  <input
                    type="date"
                    id="expense_date"
                    name="expense_date"
                    value={formData.expense_date}
                    readOnly
                    className="formInput"
                  />
                  {source === 'receipt' && formData.receipt_id && (
                    <span className="autofill-note">Autofilled from Receipt</span>
                  )}
                </div>

                {/* PAYMENT METHOD */}
                <div className="formField">
                  <label htmlFor="payment_method">Payment Method<span className='requiredTags'> *</span></label>
                  {source === 'receipt' ? (
                    <select
                      id="payment_method"
                      name="payment_method"
                      value={paymentMethod}
                      onChange={e => {
                        setPaymentMethod(e.target.value as 'CASH' | 'REIMBURSEMENT');
                        if (e.target.value === 'REIMBURSEMENT') setReimbursementRows([{ employee_id: '', job_title: '', amount: '', error: '' }]);
                      }}
                      required
                      className="formSelect"
                    >
                      <option value="CASH">Company Paid (CASH)</option>
                      <option value="REIMBURSEMENT">Employee Reimbursement</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      id="payment_method"
                      name="payment_method"
                      value={paymentMethod}
                      readOnly
                      className="formInput"
                    />
                  )}
                </div>

                {/* EMPLOYEE FIELDS for REIMBURSEMENT (Operations) */}
                {paymentMethod === 'REIMBURSEMENT' && source === 'operations' && formData.assignment_id && (() => {
                  const assignment = assignments.find(a => a.assignment_id === formData.assignment_id);
                  if (!assignment) return null;
                  const driver = assignment ? allEmployees.find(e => e.employee_id === assignment.driver_id) : undefined;
                  const conductor = assignment ? allEmployees.find(e => e.employee_id === assignment.conductor_id) : undefined;
                  return (
                    <div className="reimbBox">
                      <div className="reimbHeader">Reimbursement Breakdown</div>
                      <div className="reimbGrid">
                        <div className="reimbField">
                          <label>Driver Name</label>
                          <input type="text" value={driver?.name || ''} readOnly className="formInput" />
                        </div>
                        <div className="reimbField">
                          <label>Job Title</label>
                          <input type="text" value="Driver" readOnly className="formInput" />
                        </div>
                        <div className="reimbField">
                          <label>Driver Reimbursement Amount<span className='requiredTags'> *</span></label>
                          <input type="number" value={driverReimb || ''} onChange={e => setDriverReimb(e.target.value)} min="1" max={assignment.trip_fuel_expense} className="formInput" required />
                        </div>
                        <div className="reimbField">
                          <label>Conductor Name</label>
                          <input type="text" value={conductor?.name || ''} readOnly className="formInput" />
                        </div>
                        <div className="reimbField">
                          <label>Job Title</label>
                          <input type="text" value="Conductor" readOnly className="formInput" />
                        </div>
                        <div className="reimbField">
                          <label>Conductor Reimbursement Amount<span className='requiredTags'> *</span></label>
                          <input type="number" value={conductorReimb || ''} onChange={e => setConductorReimb(e.target.value)} min="1" max={assignment.trip_fuel_expense} className="formInput" required />
                        </div>
                      </div>
                      <div className="reimbHelper">The total reimbursement must be at least 1 and must not exceed the trip fuel expense (₱{assignment.trip_fuel_expense}).</div>
                      {reimbError && <div className="error-message">{reimbError}</div>}
                    </div>
                  );
                })()}

                {/* EMPLOYEE FIELDS for REIMBURSEMENT (Other) */}
                {paymentMethod === 'REIMBURSEMENT' && source === 'other' && (
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
                      {allEmployees.map(emp => (
                        <option key={emp.employee_id} value={emp.employee_id}>{emp.name} ({emp.job_title})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* --- Reimbursement fields for receipt-sourced expenses --- */}
                {source === 'receipt' && paymentMethod === 'REIMBURSEMENT' && (
                  <div className="reimb-multi-rows">
                    <h3>Employee Reimbursement Details</h3>
                    {reimbursementRows.map((row, idx) => (
                      <div className="employee-reimb-container" key={idx}>
                        <div className="employee-section">
                          <div className="employee-labels">
                            <div className="employee-label-group">
                              <label>Employee Name<span className='requiredTags'> *</span></label>
                              <label>Job Title</label>
                              <label>Reimbursement Amount<span className='requiredTags'> *</span></label>
                            </div>
                          </div>
                          <div className="employee-inputs">
                            <select
                              value={row.employee_id}
                              onChange={handleReimbRowChange(idx, 'employee_id')}
                              className={`formSelect${row.error && !row.employee_id ? ' input-error' : ''}`}
                              required
                            >
                              <option value="">Select Employee</option>
                              {getAvailableEmployees(idx).map(emp => (
                                <option key={emp.employee_id} value={emp.employee_id}>{emp.name}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={row.job_title}
                              readOnly
                              className="formInput"
                              placeholder="Job Title"
                            />
                            <input
                              type="number"
                              value={row.amount}
                              onChange={handleReimbRowChange(idx, 'amount')}
                              min="1"
                              className={`formInput${row.error && (!row.amount || isNaN(Number(row.amount)) || Number(row.amount) <= 0) ? ' input-error' : ''}`}
                              placeholder="Enter amount"
                              required
                            />
                          </div>
                          <div className="employee-actions">
                            <button
                              type="button"
                              className="removeRowBtn"
                              onClick={() => handleRemoveReimbRow(idx)}
                              title="Remove Employee"
                              disabled={reimbursementRows.length === 1}
                            >
                              <i className="ri-delete-bin-line" />
                            </button>
                          </div>
                        </div>
                        {row.error && <div className="employee-error">{row.error}</div>}
                      </div>
                    ))}
                    <div className="add-employee-section">
                      <button
                        type="button"
                        className="addRowBtn"
                        onClick={handleAddReimbRow}
                        disabled={!canAddRow}
                      >
                        <i className="ri-add-line" /> Add Another Employee
                      </button>
                    </div>
                    {hasDuplicateEmployees() && <div className="error-message">Duplicate employees not allowed.</div>}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modalButtons">
            <button type="submit" className="addButton">
              <i className="ri-add-line" /> Add Expense
            </button>
          </div>
      </form>
    </div>
  </div>
  );
};

export default AddExpense;
