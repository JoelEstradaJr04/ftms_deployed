'use client';

import React, { useState } from 'react';
import Swal from 'sweetalert2';
import '../../styles/editReceipt.css';

type ReceiptItem = {
  receipt_item_id: string;
  item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  ocr_confidence?: number;
};

type EditReceiptModalProps = {
  record: {
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
    category: string;
    remarks?: string;
    items: ReceiptItem[];
  };
  onClose: () => void;
  onSave: (updatedRecord: {
    receipt_id: string;
    supplier: string;
    transaction_date: string;
    vat_reg_tin?: string;
    terms?: string;
    date_paid?: string;
    payment_status: string;
    total_amount: number;
    vat_amount?: number;
    total_amount_due: number;
    category: string;
    remarks?: string;
    items: ReceiptItem[];
  }) => void;
};

const EditReceiptModal: React.FC<EditReceiptModalProps> = ({
  record,
  onClose,
  onSave
}) => {
  const [supplier, setSupplier] = useState(record.supplier);
  const [transactionDate, setTransactionDate] = useState(record.transaction_date);
  const [vatRegTin, setVatRegTin] = useState(record.vat_reg_tin || '');
  const [terms, setTerms] = useState(record.terms || '');
  const [datePaid, setDatePaid] = useState(record.date_paid || '');
  const [paymentStatus, setPaymentStatus] = useState(record.payment_status);
  const [totalAmount, setTotalAmount] = useState(record.total_amount);
  const [vatAmount, setVatAmount] = useState(record.vat_amount || 0);
  const [totalAmountDue, setTotalAmountDue] = useState(record.total_amount_due);
  const [category, setCategory] = useState(record.category);
  const [remarks, setRemarks] = useState(record.remarks || '');
  const [items, setItems] = useState<ReceiptItem[]>(record.items);

  const handleSave = () => {
    if (!supplier || !transactionDate || !paymentStatus || !category) {
      Swal.fire('Error', 'Please fill in all required fields', 'error');
      return;
    }

    onSave({
      receipt_id: record.receipt_id,
      supplier,
      transaction_date: transactionDate,
      vat_reg_tin: vatRegTin || undefined,
      terms: terms || undefined,
      date_paid: datePaid || undefined,
      payment_status: paymentStatus,
      total_amount: totalAmount,
      vat_amount: vatAmount || undefined,
      total_amount_due: totalAmountDue,
      category,
      remarks: remarks || undefined,
      items
    });
  };

  const handleItemChange = (index: number, field: keyof Omit<ReceiptItem, 'receipt_item_id' | 'total_price' | 'ocr_confidence'>, value: string | number) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index] };

    if (field === 'quantity' || field === 'unit_price') {
      const numValue = Number(value);
      item[field] = numValue;
      item.total_price = item.quantity * item.unit_price;
    } else {
      item[field] = value as string;
    }

    updatedItems[index] = item;
    setItems(updatedItems);

    // Update total amounts
    const newTotalAmount = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
    setTotalAmount(newTotalAmount);
    setTotalAmountDue(newTotalAmount + (vatAmount || 0));
  };

  const addNewItem = () => {
    setItems([...items, {
      receipt_item_id: `new-${items.length}`,
      item_name: '',
      unit: '',
      quantity: 0,
      unit_price: 0,
      total_price: 0
    }]);
  };

  const removeItem = (index: number) => {
    const updatedItems = items.filter((_, idx) => idx !== index);
    setItems(updatedItems);

    // Update total amounts
    const newTotalAmount = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
    setTotalAmount(newTotalAmount);
    setTotalAmountDue(newTotalAmount + (vatAmount || 0));
  };

  return (
    <div className="editReceiptModalOverlay">
      <div className="editReceiptModalContent">
        <button type="button" className="closeButton" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>

        <div className="modalHeader">
          <h2>Edit Receipt</h2>
          <p><strong>Receipt ID:</strong> {record.receipt_id}</p>
        </div>

        <div className="formGroup">
          <label>Supplier</label>
          <input
            type="text"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            required
          />
        </div>

        <div className="formRow">
          <div className="formGroup">
            <label>Transaction Date</label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
            />
          </div>

          <div className="formGroup">
            <label>Date Paid</label>
            <input
              type="date"
              value={datePaid}
              onChange={(e) => setDatePaid(e.target.value)}
            />
          </div>
        </div>

        <div className="formRow">
          <div className="formGroup">
            <label>VAT Reg TIN</label>
            <input
              type="text"
              value={vatRegTin}
              onChange={(e) => setVatRegTin(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="formGroup">
            <label>Terms</label>
            <input
              type="text"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="formRow">
          <div className="formGroup">
            <label>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">Select Category</option>
              <option value="Fuel">Fuel</option>
              <option value="Vehicle_Parts">Vehicle Parts</option>
              <option value="Tools">Tools</option>
              <option value="Equipment">Equipment</option>
              <option value="Supplies">Supplies</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="formGroup">
            <label>Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as 'Paid' | 'Pending' | 'Cancelled' | 'Dued')}
              required
            >
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Dued">Dued</option>
            </select>
          </div>
        </div>

        <div className="formGroup">
          <label>Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional"
            rows={3}
          />
        </div>

        <div className="itemsSection">
          <div className="sectionHeader">
            <h3>Items</h3>
            <button type="button" onClick={addNewItem} className="addItemBtn">
              <i className="ri-add-line" /> Add Item
            </button>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Unit</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total Price</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.receipt_item_id}>
                  <td>
                    <input
                      type="text"
                      value={item.item_name}
                      onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      min="0"
                      step="0.01"
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                      min="0"
                      step="0.01"
                      required
                    />
                  </td>
                  <td>₱{item.total_price.toLocaleString()}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="removeItemBtn"
                      title="Remove Item"
                    >
                      <i className="ri-delete-bin-line" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="totalsSection">
          <div className="formRow">
            <div className="formGroup">
              <label>Total Amount</label>
              <input
                type="text"
                value={`₱${totalAmount.toLocaleString()}`}
                readOnly
              />
            </div>

            <div className="formGroup">
              <label>VAT Amount</label>
              <input
                type="number"
                value={vatAmount}
                onChange={(e) => {
                  const newVatAmount = Number(e.target.value);
                  setVatAmount(newVatAmount);
                  setTotalAmountDue(totalAmount + newVatAmount);
                }}
                min="0"
                step="0.01"
              />
            </div>

            <div className="formGroup">
              <label>Total Amount Due</label>
              <input
                type="text"
                value={`₱${totalAmountDue.toLocaleString()}`}
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="editReceiptModalButtons">
          <button onClick={onClose} className="cancelBtn">Cancel</button>
          <button onClick={handleSave} className="saveBtn">Save</button>
        </div>
      </div>
    </div>
  );
};

export default EditReceiptModal; 