// AddExpenseModal.tsx
'use client';

//---------------------IMPORTS HERE----------------------//
import React, { useState, useEffect } from 'react';
import '../../styles/addExpense.css';
import { formatDate } from '../../utility/dateFormatter';
import { showSuccess, showError, showConfirmation } from '../../utility/Alerts';
import { validateField, isValidAmount, ValidationRule } from "../../utility/validation";

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
  is_expense_recorded: boolean;
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
    is_expense_recorded: boolean;
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
  const today = new Date().toISOString().split('T')[0];
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [source, setSource] = useState<'operations' | 'receipt' | 'other'>('operations');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [receiptLoading, setReceiptLoading] = useState(true);
  // Add Categories
  const [customCategories, setCustomCategories] = useState<string[]>([]); // Store custom categories
  const [isAddingCategory, setIsAddingCategory] = useState(false); // Track if in "add mode"
  const [newCategory, setNewCategory] = useState(''); // Track the new category being entered

  
  
  const [errors, setErrors] = useState<Record<FieldName, string[]>>({
    category: [],
    assignment_id: [],
    receipt_id: [],
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
    created_by: currentUser,
    other_source: '',
    other_category: '',
  });


  const validationRules: Record<FieldName, ValidationRule> = {
    category: { required: true, label: "Category"},
    assignment_id: { required: source === 'operations', label: "Assignment" },
    receipt_id: { required: source === 'receipt', label: "Receipt" },
    other_source: { required: source === 'other', label: "Source", minLength: 2, maxLength: 50 },
    total_amount: { required: true, min: 0.01, label: "Amount", custom: (v: number) => isValidAmount(Number(v)) ? null : "Amount must be greater than 0." },
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

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        setReceiptLoading(true);
        const response = await fetch('/api/receipts?isExpenseRecorded=false');
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

  // Filter assignments based on is_expense_recorded
  const filteredAssignments = assignments
    .filter(a => !a.is_expense_recorded)
    .sort((a, b) => new Date(a.date_assigned).getTime() - new Date(b.date_assigned).getTime());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'category' && value === '__add_new__') {
      setIsAddingCategory(true);
      return;
    }

    // Prepare the new value for formData
    let newValue: any = value;

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

    const result = await showConfirmation(
      'Are you sure you want to add this expense record?',
      'Confirm Add'
    );

    if (result.isConfirmed) {
      try {
        const standardCategories = ["Fuel", "Vehicle_Parts", "Tools", "Equipment", "Supplies", "Other"];
        const isCustomCategory = !standardCategories.includes(category);

        await onAddExpense({
          // For custom categories, send "Other" as the category
          category: isCustomCategory ? "Other" : category,
          total_amount,
          expense_date,
          created_by: currentUser,
          ...(source === 'operations' ? { assignment_id } : {}),
          ...(source === 'receipt' ? { receipt_id } : {}),
          ...(source === 'other' ? { other_source } : {}),
          // Include other_category for both "Other" and custom categories
          ...((category === 'Other' || isCustomCategory) ? 
            { other_category: isCustomCategory ? category : other_category } : {})
        });

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
    return `₱ ${assignment.trip_fuel_expense} | ${busType} | ${assignment.bus_bodynumber} - ${assignment.bus_route} | ${assignment.driver_name.split(' ').pop()} & ${assignment.conductor_name.split(' ').pop()} | ${formatDate(assignment.date_assigned)}`;
  };

  // Format receipt for display
  const formatReceipt = (receipt: Receipt) => {
    return `₱ ${receipt.total_amount_due} | ${receipt.terms || 'N/A'} | ${receipt.supplier} | ${formatDate(receipt.transaction_date)}`;
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
                      <option value="operations">Operations</option>
                      <option value="receipt">Receipt</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* SOURCE */}
                  <div className="formField">
                    <label htmlFor="sourceDetail">Source<span className='requiredTags'> *</span></label>
                    {source === 'operations' && (
                      <>
                        <select
                          id="sourceDetail"
                          name="assignment_id"
                          value={formData.assignment_id}
                          onChange={handleInputChange}
                          required
                          className={`formSelect${errors.assignment_id.length ? ' input-error' : ''}`}
                        >
                          <option value="">Select Assignment</option>
                          {filteredAssignments.map((assignment) => (
                            <option 
                              key={assignment.assignment_id} 
                              value={assignment.assignment_id}
                            >
                              {formatAssignment(assignment)}
                            </option>
                          ))}
                        </select>
                        {errors.assignment_id.map((msg, i) => (
                          <div className="error-message" key={i}>{msg}</div>
                        ))}
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
                    {formData.category === 'Other' ? (
                      // Your existing Other handling
                      <>
                        <div className="categoryInputWrapper">
                          <input
                            type="text"
                            id="category"
                            name="other_category"
                            value={formData.other_category || ''}
                            onChange={handleInputChange}
                            placeholder="Specify category"
                            required
                            className={`formInput${errors.other_category.length ? ' input-error' : ''}`}
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
                        {errors.other_category.map((msg, i) => (
                            <div className="error-message" key={i}>{msg}</div>
                        ))}
                      </>
                    ) : isAddingCategory ? (
                      // Add category mode - show input field with confirm/cancel buttons
                      <div className="categoryInputWrapper">
                        <input
                          type="text"
                          id="newCategory"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder="New category name"
                          className="formInput"
                          autoFocus
                        />
                        <div className="categoryActionBtns">
                          <button 
                            type="button"
                            className="confirmCategoryBtn"
                            onClick={() => {
                              if (newCategory.trim()) {
                                setCustomCategories(prev => [...prev, newCategory.trim()]);
                                setFormData(prev => ({...prev, category: newCategory.trim()}));
                                setNewCategory('');
                                setIsAddingCategory(false);
                              }
                            }}
                          >
                            <i className="ri-check-line"></i>
                          </button>
                          <button 
                            type="button"
                            className="cancelCategoryBtn"
                            onClick={() => {
                              setNewCategory('');
                              setIsAddingCategory(false);
                            }}
                          >
                            <i className="ri-close-line"></i>
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Regular select mode with added "Add Custom" option
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                        className="formSelect"
                        disabled={source === 'operations'}
                      >
                        <option value="">Select Category</option>
                        <option value="Fuel">Fuel</option>
                        <option value="Vehicle_Parts">Vehicle Parts</option>
                        <option value="Tools">Tools</option>
                        <option value="Equipment">Equipment</option>
                        <option value="Supplies">Supplies</option>
                        {/* Render custom categories */}
                        {customCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat} {/* Deleting happens outside the select */}
                          </option>
                        ))}
                        <option value="Other">Other</option>
                        <option value="__add_new__">+ Add Custom Category</option>
                      </select>
                    )}
                    
                    {/* Display custom categories with delete option */}
                    {customCategories.length > 0 && !isAddingCategory && (
                      <div className="customCategoriesList">
                        <p className="customCategoriesTitle">Custom Categories:</p>
                        <div className="customCategoriesChips">
                          {customCategories.map((cat) => (
                            <div key={cat} className="categoryChip">
                              <span>{cat}</span>
                              <button 
                                type="button" 
                                className="deleteCategoryBtn"
                                onClick={() => {
                                  setCustomCategories(prev => prev.filter(c => c !== cat));
                                  // If the current category is being deleted, reset to default
                                  if (formData.category === cat) {
                                    setFormData(prev => ({...prev, category: ''}));
                                  }
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  
                     {/* AMOUNT */}
                    <div className="formField">
                      <label htmlFor="amount">Amount<span className='requiredTags'> *</span></label>
                      <input
                        type="number"
                        id="amount"
                        name="total_amount"
                        value={formData.total_amount || ''}
                        onChange={handleInputChange}
                        placeholder="Enter amount"
                        required
                        className={`formInput${errors.total_amount.length ? ' input-error' : ''}`}
                        min="0"
                        step="0.01"
                        readOnly={source !== 'other'}
                      />
                      {errors.total_amount.map((msg, i) => (
                        <div className="error-message" key={i}>{msg}</div>
                      ))}
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
                    onChange={handleInputChange}
                    required
                    className={`formInput${errors.expense_date.length ? ' input-error' : ''}`}
                    max={today}
                  />
                  {errors.expense_date.map((msg, i) => (
                    <div className="error-message" key={i}>{msg}</div>
                  ))}
                </div>
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
