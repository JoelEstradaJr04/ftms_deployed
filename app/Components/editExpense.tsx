/* ──────────────────────────────────────────────────────────────
   File: app/Components/editExpense.tsx
   Desc: Edit-Expense modal – mirrors Add-Expense UI/logic
   ──────────────────────────────────────────────────────────── */
'use client';

/* ───── imports ─────────────────────────────────────────────── */
import React, { useEffect, useState } from 'react';
import '../styles/addExpense.css';
import ItemList from '../Components/addExpense_itemList';
import { Item, calcAmount } from '../utility/calcAmount';
import {
  showEmptyFieldWarning,
  showAddConfirmation,
  showSuccess,
  showError,
} from '../utility/Alerts';
import { isValidSource } from '../utility/validation';

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
  receipt_date: string;
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
  record: ExpenseData;
  onSave: (updated: ExpenseData) => void;
  onClose: () => void;
};

/* ───── component ──────────────────────────────────────────── */
const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  record,
  onSave,
  onClose,
}) => {
  /* ——— header clock ——— */
  const [clock, setClock] = useState({ t: '', d: '' });
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock({
        t: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        d: now.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' }),
      });
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  /* ——— editable state ——— */
  const [department, setDepartment] = useState(record.department_from);
  const [category, setCategory] = useState(record.category);
  const [items, setItems] = useState<Item[]>(
    record.receipt?.items.map(item => ({
      name: item.item_name,
      quantity: item.quantity.toString(),
      unitPrice: item.unit_price.toString()
    })) ?? [{ name: '', quantity: '', unitPrice: '' }]
  );

  /* ——— handlers ——— */
  const handleSave = async () => {
    if (!category.trim() || !isValidSource(category)) {
      await showEmptyFieldWarning();
      return;
    }

    const total = calcAmount(items);

    const confirm = await showAddConfirmation();
    if (!confirm.isConfirmed) return;

    try {
      const updated: ExpenseData = {
        ...record,
        department_from: department,
        category,
        total_amount: Number(total),
        receipt: record.receipt ? {
          ...record.receipt,
          items: items.map((item, index) => ({
            receipt_item_id: record.receipt?.items[index]?.receipt_item_id ?? `new-${index}`,
            item_name: item.name,
            unit: 'piece', // Default unit since it's not in the Item type
            quantity: parseFloat(item.quantity),
            unit_price: parseFloat(item.unitPrice),
            total_price: parseFloat(item.quantity) * parseFloat(item.unitPrice)
          }))
        } : undefined
      };
      onSave(updated);
      await showSuccess('Expense updated successfully!');
      onClose();
    } catch {
      showError('Failed to update expense.');
    }
  };

  /* ——— render ——— */
  return (
    <div className="modalOverlay">
      <div className="addExpenseModal">
        {/* header */}
        <div className="modalHeader">
          <h2>Edit Expense</h2>
          <div className="timeDate">
            <div className="currTime">{clock.t}</div>
            <div className="currDate">{clock.d}</div>
          </div>
        </div>

        {/* form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <div className="row">
            <div className="formFields">
              {/* Category / Department */}
              <div className="formField">
                <label htmlFor="dept">Category</label>
                <select
                  id="dept"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="Others">Other Expenses</option>
                </select>
              </div>

              {/* Description */}
              <div className="formField">
                <label htmlFor="desc">Category</label>
                <input
                  type="text"
                  id="desc"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Expense category"
                />
              </div>
            </div>
          </div>

          {/* Item list (re-usable component, editable) */}
          <div className="itemList">
            <ItemList items={items} setItems={setItems} />
          </div>

          {/* action buttons */}
          <div className="buttonRow">
            <div className="buttonContainer">
              <button type="button" className="cancelButton" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="addButton">
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditExpenseModal;
