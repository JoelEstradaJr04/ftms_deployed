/* ──────────────────────────────────────────────────────────────
   File: app/Components/editExpense.tsx
   Desc: Edit-Expense modal – mirrors Add-Expense UI/logic
   ──────────────────────────────────────────────────────────── */
'use client';

/* ───── imports ─────────────────────────────────────────────── */
import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

import '../styles/addExpense.css';          // ← same CSS as Add/View modals
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
export type ExpenseData = {
  id: number;
  date: string;
  department: string;
  description: string;
  amount: number;
  items?: Item[];
};

type EditExpenseModalProps = {
  record:   ExpenseData;           // record to edit (pre-filled)
  onSave:   (updated: ExpenseData) => void;
  onClose:  () => void;
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
  const [department, setDepartment]   = useState(record.department);
  const [description, setDescription] = useState(record.description);
  const [items, setItems]             = useState<Item[]>(
    record.items?.length ? record.items : [{ name: '', quantity: '', unitPrice: '' }]
  );

  /* ——— handlers ——— */
  const handleSave = async () => {
    if (!description.trim() || !isValidSource(description)) {
      await showEmptyFieldWarning();               // reuse existing alert helpers
      return;
    }

    const total = calcAmount(items);

    const confirm = await showAddConfirmation();   // confirmation SweetAlert
    if (!confirm.isConfirmed) return;

    try {
      const updated: ExpenseData = {
        ...record,
        department,
        description,
        items,
        amount: total,
      };
      onSave(updated);                             // push update to parent
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
                <label htmlFor="desc">Expense</label>
                <input
                  type="text"
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Expense title"
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
