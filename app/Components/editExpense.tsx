/* ──────────────────────────────────────────────────────────────
   File: app/Components/editExpense.tsx
   Desc: Edit-Expense modal – mirrors Add-Expense UI/logic
   ──────────────────────────────────────────────────────────── */
'use client';

'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import '../styles/editExpense.css';
import { getAssignmentById } from '@/lib/supabase/assignments';

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
  const [expenseDate, setExpenseDate] = useState(record.expense_date);
  const [amount, setAmount] = useState(record.amount);
  const [otherSource, setOtherSource] = useState(record.other_source || '');
  const [otherCategory, setOtherCategory] = useState(record.other_category || '');
  const [originalAmount] = useState(record.amount);
  const [showDeviationWarning, setShowDeviationWarning] = useState(false);
  const [deviationPercentage, setDeviationPercentage] = useState(0);

  useEffect(() => {
    const fetchOriginalAmount = async () => {
      if (record.assignment_id) {
        try {
          const assignmentData = await getAssignmentById(record.assignment_id);
          if (assignmentData?.trip_fuel_expense) {
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
    if (originalAmount) {
      const deviation = Math.abs((newAmount - originalAmount) / originalAmount * 100);
      setDeviationPercentage(deviation);
      setShowDeviationWarning(deviation > 10);
    }
  };

  const handleSave = () => {
    if (!expenseDate) {
      Swal.fire('Error', 'Please fill in all required fields', 'error');
      return;
    }

    if (record.category === 'Other' && !otherCategory) {
      Swal.fire('Error', 'Please specify the category', 'error');
      return;
    }

    onSave({
      expense_id: record.expense_id,
      expense_date: expenseDate,
      total_amount: amount,
      other_source: record.category === 'Other' ? otherSource : undefined,
      other_category: record.category === 'Other' ? otherCategory : undefined
    });
  };

  return (
    <div className="modalOverlay">
      <div className="modalContent">
        <div className="modalHeader">
          <h2>Edit Expense</h2>
          <p><strong>Category:</strong> {record.category === 'Other' ? record.other_category || 'Other' : record.category}</p>
          <p><strong>Source:</strong> {record.source}</p>
        </div>

        <div className="formGroup">
          <label>Expense Date</label>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />
        </div>

        {record.category === 'Other' && (
          <>
            <div className="formGroup">
              <label>Category</label>
              <input
                type="text"
                value={otherCategory}
                onChange={(e) => setOtherCategory(e.target.value)}
                placeholder="Specify category"
                required
              />
            </div>
            <div className="formGroup">
              <label>Source</label>
              <input
                type="text"
                value={otherSource}
                onChange={(e) => setOtherSource(e.target.value)}
                placeholder="Specify source"
                required
              />
            </div>
          </>
        )}

        <div className="formGroup">
          <label>Amount</label>
          <div className="amountInputGroup">
            <input
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(parseFloat(e.target.value))}
              min="0"
              step="0.01"
            />
            {originalAmount !== null && (
              <div className="amountReference">
                Original Amount: ₱{originalAmount.toLocaleString()}
                {showDeviationWarning && (
                  <div className="deviationWarning">
                    Deviation: {deviationPercentage.toFixed(2)}%
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="modalButtons">
          <button onClick={onClose} className="cancelBtn">Cancel</button>
          <button onClick={handleSave} className="saveBtn">Save</button>
        </div>
      </div>
    </div>
  );
};

export default EditExpenseModal;
