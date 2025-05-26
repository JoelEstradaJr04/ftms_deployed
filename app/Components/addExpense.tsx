// AddExpenseModal.tsx
'use client';

//---------------------IMPORTS HERE----------------------//
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import '../styles/addExpense.css';
import { formatDate } from '../utility/dateFormatter';

//---------------------DECLARATIONS HERE----------------------//
// Uncomment and use these types
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
  total_amount_due: number;
  items: ReceiptItem[];
};

// type ExpenseData = {
//   expense_id: string;
//   date: string;
//   department_from: string;
//   category: string;
//   total_amount: number;
//   receipt?: Receipt;
// };

type AddExpenseProps = {
  onClose: () => void;
  onAddExpense: (formData: {
    category: string;
    assignment_id?: string;
    receipt_id?: string;
    total_amount: number;
    expense_date: string;
    created_by: string;
    other_source?: string;
  }) => void;
  assignments: {
    assignment_id: string;
    bus_bodynumber: string;
    bus_route: string;
    bus_type: string;
    driver_name: string;
    conductor_name: string;
    date_assigned: string;
    trip_fuel_expense: number;
  }[];
  currentUser: string;
};

const AddExpense: React.FC<AddExpenseProps> = ({ 
  onClose, 
  onAddExpense,
  assignments,
  currentUser 
}) => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [source, setSource] = useState<'operations' | 'receipt' | 'other'>('operations');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [receiptLoading, setReceiptLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    category: 'Fuel',
    assignment_id: '',
    receipt_id: '',
    total_amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    created_by: currentUser,
    other_source: '',
    other_category: '',
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

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        setReceiptLoading(true);
        const response = await fetch('/api/receipts');
        if (!response.ok) throw new Error('Failed to fetch receipts');
        const data = await response.json();
        setReceipts(data);
      } catch (error) {
        console.error('Error fetching receipts:', error);
        Swal.fire('Error', 'Failed to load receipts', 'error');
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
    }));
  }, [source]);

  useEffect(() => {
    if (formData.assignment_id) {
      const selectedAssignment = assignments.find(a => a.assignment_id === formData.assignment_id);
      if (selectedAssignment) {
        setFormData(prev => ({
          ...prev,
          total_amount: selectedAssignment.trip_fuel_expense,
          category: 'Fuel' // Always set to Fuel for operations
        }));
      }
    } else if (formData.receipt_id) {
      const selectedReceipt = receipts.find(r => r.receipt_id === formData.receipt_id);
      if (selectedReceipt) {
        setFormData(prev => ({
          ...prev,
          total_amount: selectedReceipt.total_amount_due
        }));
      }
    }
  }, [formData.assignment_id, formData.receipt_id, assignments, receipts]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'source') {
      setSource(value as 'operations' | 'receipt' | 'other');
    } else if (name === 'total_amount' && source === 'other') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { category, assignment_id, receipt_id, total_amount, expense_date, other_source } = formData;

    if (!category || !expense_date || !currentUser) {
      Swal.fire('Error', 'Please fill in all required fields', 'error');
      return;
    }

    if (source === 'operations' && !assignment_id) {
      Swal.fire('Error', 'Please select an assignment', 'error');
      return;
    }

    if (source === 'receipt' && !receipt_id) {
      Swal.fire('Error', 'Please select a receipt', 'error');
      return;
    }

    if (source === 'other' && !other_source) {
      Swal.fire('Error', 'Please specify the source', 'error');
      return;
    }

    const result = await Swal.fire({
      title: 'Confirm Add',
      text: 'Are you sure you want to add this expense record?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#961C1E',
      confirmButtonText: 'Yes, add it!',
      background: 'white',
    });

    if (result.isConfirmed) {
      try {
        await onAddExpense({
          category,
          total_amount,
          expense_date,
          created_by: currentUser,
          ...(source === 'operations' ? { assignment_id } : {}),
          ...(source === 'receipt' ? { receipt_id } : {}),
          ...(source === 'other' ? { other_source } : {})
        });

        Swal.fire('Success', 'Expense added successfully', 'success');
        onClose();
      } catch (error: unknown) {
        console.error('Error adding expense:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        Swal.fire('Error', 'Failed to add expense: ' + errorMessage, 'error');
      }
    }
  };

  // Format assignment for display
  const formatAssignment = (assignment: typeof assignments[0]) => {
    const busType = assignment.bus_type === 'Airconditioned' ? 'A' : 'O';
    return `${busType} | ${assignment.bus_bodynumber} - ${assignment.bus_route} | ${assignment.driver_name.split(' ').pop()} & ${assignment.conductor_name.split(' ').pop()} | ${formatDate(assignment.date_assigned)}`;
  };

  // Format receipt for display
  const formatReceipt = (receipt: Receipt) => {
    return `${receipt.terms || 'N/A'} | ${receipt.supplier} | ${formatDate(receipt.transaction_date)}`;
  };

  return (
    <div className="modalOverlay">
      <div className="addExpenseModal">
        <div className="modalHeader">
          <h2>Add Expense</h2>
          <div className="timeDate">
            <div className="currTime">{currentTime}</div>
            <div className="currDate">{currentDate}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="formFieldsHorizontal">
            <div className="formLabels">
              <div className="formLabel">Source Type</div>
              <div className="formLabel">Source</div>
              <div className="formLabel">Category</div>
              <div className="formLabel">Amount</div>
              <div className="formLabel">Expense Date</div>
            </div>
            
            <div className="formInputs">
              {/* SOURCE TYPE */}
              <div className="formField">
                <select
                  name="source"
                  value={source}
                  onChange={handleInputChange}
                  required
                  className="formSelect"
                >
                  <option value="operations">Operations</option>
                  <option value="receipt">Receipt</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* SOURCE */}
              <div className="formField">
                {source === 'operations' && (
                  <select
                    name="assignment_id"
                    value={formData.assignment_id}
                    onChange={handleInputChange}
                    required
                    className="formSelect"
                  >
                    <option value="">Select Assignment</option>
                    {assignments.map((assignment) => (
                      <option 
                        key={assignment.assignment_id} 
                        value={assignment.assignment_id}
                      >
                        {formatAssignment(assignment)}
                      </option>
                    ))}
                  </select>
                )}

                {source === 'receipt' && (
                  <select
                    name="receipt_id"
                    value={formData.receipt_id}
                    onChange={handleInputChange}
                    required
                    className="formSelect"
                    disabled={receiptLoading}
                  >
                    <option value="">Select Receipt</option>
                    {receipts.map((receipt) => (
                      <option 
                        key={receipt.receipt_id} 
                        value={receipt.receipt_id}
                      >
                        {formatReceipt(receipt)}
                      </option>
                    ))}
                  </select>
                )}

                {source === 'other' && (
                  <input
                    type="text"
                    name="other_source"
                    value={formData.other_source}
                    onChange={handleInputChange}
                    placeholder="Specify source"
                    required
                    className="formInput"
                  />
                )}
              </div>

              {/* CATEGORY */}
              <div className="formField">
                {formData.category === 'Other' ? (
                  <div className="categoryInputWrapper">
                    <input
                      type="text"
                      name="other_category"
                      value={formData.other_category}
                      onChange={handleInputChange}
                      placeholder="Specify category"
                      required
                      className="formInput"
                    />
                    <button 
                      type="button"
                      className="clearCategoryBtn"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        category: 'Fuel',
                        other_category: ''
                      }))}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className="formSelect"
                    disabled={source === 'operations'} // Disabled for operations as it's always Fuel
                  >
                    <option value="">Select Category</option>
                    <option value="Fuel">Fuel</option>
                    <option value="Vehicle_Parts">Vehicle Parts</option>
                    <option value="Tools">Tools</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Supplies">Supplies</option>
                    <option value="Other">Other</option>
                  </select>
                )}
              </div>

              {/* AMOUNT */}
              <div className="formField">
                <input
                  type="number"
                  name="total_amount"
                  value={formData.total_amount || ''}
                  onChange={handleInputChange}
                  placeholder="Enter amount"
                  required
                  className="formInput"
                  min="0"
                  step="0.01"
                  readOnly={source !== 'other'} // Only editable for 'other' source
                />
              </div>

              {/* DATE */}
              <div className="formField">
                <input
                  type="date"
                  name="expense_date"
                  value={formData.expense_date}
                  onChange={handleInputChange}
                  required
                  className="formInput"
                />
              </div>
            </div>
          </div>

          <div className="modalButtons">
            <button type="button" className="cancelButton" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="addButton">
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;
