// AddExpenseModal.tsx
'use client';

//---------------------IMPORTS HERE----------------------//
import React, { useState, useEffect } from 'react';
import '../styles/addExpense.css';
import { Item, calcAmount } from '../utility/calcAmount';
import {
  showEmptyFieldWarning,
  showAddConfirmation,
  showSuccess,
  showError
} from '../utility/Alerts';
import { isValidSource } from '../utility/validation';
import ItemList from '../Components/addExpense_itemList';

//---------------------DECLARATIONS HERE----------------------//
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

type AddExpenseModalProps = {
  onClose: () => void;
  onAddSuccess: (newRecord: ExpenseData) => void;
};

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ onClose, onAddSuccess }) => {
  //----------------set the current date and time----------------//
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  //Get the current date and time
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' }));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    category: 'Other',
    expense: '',
  });

  // Items for dynamic item list
  const [items, setItems] = useState<Item[]>([{ name: '', quantity: '', unitPrice: '' }]);

  //-------------------EVENT HANDLER------------------//
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { category, expense } = formData;

    if (!category || !expense) {
      await showEmptyFieldWarning();
      return;
    }

    if (!isValidSource(expense)) {
      await showEmptyFieldWarning();
      return;
    }

    const total = calcAmount(items);

    const confirm = await showAddConfirmation();
    if (!confirm.isConfirmed) return;

    try {
      const newRecord: ExpenseData = {
        expense_id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        department_from: category,
        category: expense,
        total_amount: Number(total),
        receipt: {
          receipt_id: `REC-${Date.now()}`,
          supplier: 'Direct Purchase',
          receipt_date: new Date().toISOString(),
          status: 'Paid',
          total_amount: Number(total),
          items: items.map((item, index) => ({
            receipt_item_id: `ITEM-${Date.now()}-${index}`,
            item_name: item.name,
            unit: 'piece',
            quantity: parseFloat(item.quantity),
            unit_price: parseFloat(item.unitPrice),
            total_price: parseFloat(item.quantity) * parseFloat(item.unitPrice)
          }))
        }
      };

      onAddSuccess(newRecord);
      await showSuccess('Expense added successfully');
      onClose();
    } catch {
      showError('Failed to add expense');
    }
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
          <div className='row'>
            <div className="formFields">
              {/*CATEGORY*/}
              <div className="formField">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  disabled
                >
                  <option value="Others">Other Expenses</option>
                </select>
              </div>

              {/*EXPENSE TITLE*/}
              <div className="formField">
                <label htmlFor="expense">Category</label>
                <input
                  type="text"
                  id="expense"
                  name="expense"
                  value={formData.expense}
                  onChange={handleInputChange}
                  placeholder="Expense category"
                  required
                />
              </div>
            </div>
          </div>

          {/*Item List table Here*/}
          <div className="itemList">
            <ItemList items={items} setItems={setItems} />
          </div>

          {/*BUTTONS*/}
          <div className='buttonRow'>
            <div className="buttonContainer">
              <button type="button" className="cancelButton" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="addButton">
                Add
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpenseModal;
