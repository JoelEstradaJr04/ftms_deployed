// AddExpenseModal.tsx
'use client';

//---------------------IMPORTS HERE----------------------//
import React, { useState, useEffect } from 'react';
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
  category?: string;
  other_category?: string;
  other_unit?: string;
};

type ExpenseRecord = {
  expense_id: string;
  category: string;
  total_amount: number;
  expense_date: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  is_deleted: boolean;
  other_source?: string;
  other_category?: string;
  receipt_id?: string;
  assignment_id?: string;
};

type Receipt = {
  receipt_id: string;
  supplier: string;
  transaction_date: string;
  vat_reg_tin?: string;
  terms?: string;
  date_paid?: string;
  payment_status: 'Paid' | 'Pending' | 'Cancelled' | 'Dued';
  record_status: 'Active' | 'Inactive';
  total_amount: number;
  vat_amount?: number;
  total_amount_due: number;
  category: 'Fuel' | 'Vehicle_Parts' | 'Tools' | 'Equipment' | 'Supplies' | 'Other' | 'Multiple_Categories';
  other_category?: string;
  items: ReceiptItem[];
  expense?: ExpenseRecord;
  source: 'Manual_Entry' | 'OCR_Camera' | 'OCR_File';
  is_deleted: boolean;
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

const AddExpense: React.FC<AddExpenseProps> = ({ 
  onClose, 
  onAddExpense,
  assignments,
  currentUser 
}) => {
  const [formData, setFormData] = useState({
    category: '',
    assignment_id: '',
    receipt_id: '',
    total_amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    other_source: '',
    other_category: ''
  });
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'operations' | 'receipt' | 'other'>('operations');

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        setReceiptLoading(true);
        setError(null);
        const response = await fetch('/api/receipts?limit=1000')
        if (!response.ok) {
          throw new Error('Failed to fetch receipts')
        }
        const data = await response.json()
        // Filter out receipts that are already linked to expenses or are inactive
        const availableReceipts = data.receipts.filter((receipt: Receipt) => 
          !receipt.expense && 
          receipt.record_status === 'Active' &&
          !receipt.is_deleted
        )
        setReceipts(availableReceipts)
      } catch (error) {
        console.error('Error fetching receipts:', error)
        setError('Failed to fetch receipts')
      } finally {
        setReceiptLoading(false);
      }
    }

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
    
    if (name === 'source') {
      setSource(value as 'operations' | 'receipt' | 'other');
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onAddExpense({
        ...formData,
        created_by: currentUser
      });
      onClose();
    } catch (error) {
      console.error('Error adding expense:', error);
      setError('Failed to add expense');
    }
  };

  // Format assignment for display
  const formatAssignment = (assignment: typeof assignments[0]) => {
    const busType = assignment.bus_type === 'Airconditioned' ? 'A' : 'O';
    return `₱ ${assignment.trip_fuel_expense} | ${busType} | ${assignment.bus_bodynumber} - ${assignment.bus_route} | ${assignment.driver_name.split(' ').pop()} & ${assignment.conductor_name.split(' ').pop()} | ${formatDate(assignment.date_assigned)}`;
  };

  // Format receipt for display
  const formatReceipt = (receipt: Receipt) => {
    return `${receipt.supplier} - ${new Date(receipt.transaction_date).toLocaleDateString()} - ₱${receipt.total_amount_due} (${receipt.payment_status})`
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Add New Expense</h3>
          {error && (
            <div className="mt-2 px-7 py-3">
              <div className="text-sm text-red-500">{error}</div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-4">
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
                      {filteredAssignments.map((assignment) => (
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
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">Select Receipt</label>
                      {receiptLoading ? (
                        <div className="mt-1 text-sm text-gray-500">Loading receipts...</div>
                      ) : (
                        <select
                          name="receipt_id"
                          value={formData.receipt_id}
                          onChange={handleInputChange}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                          required
                        >
                          <option value="">Select a receipt</option>
                          {receipts.map((receipt) => (
                            <option key={receipt.receipt_id} value={receipt.receipt_id}>
                              {formatReceipt(receipt)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
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
                        value={formData.other_category || ''}
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
    </div>
  );
};

export default AddExpense;
