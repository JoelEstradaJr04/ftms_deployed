'use client';
import React, { useState, useEffect } from 'react';
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
    other_category?: string;
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
    other_category?: string;
    remarks?: string;
    items: ReceiptItem[];
  }) => void;
};

const EditReceiptModal: React.FC<EditReceiptModalProps> = ({
  record,
  onClose,
  onSave
}) => {
  // Update state initializations to use record values
  const [supplier, setSupplier] = useState(record.supplier || '');
  const [transactionDate, setTransactionDate] = useState(() => {
    // Format date string to YYYY-MM-DD for input[type="date"]
    const date = record.transaction_date ? new Date(record.transaction_date) : new Date();
    return date.toISOString().split('T')[0];
  });
  const [vatRegTin, setVatRegTin] = useState(record.vat_reg_tin || '');
  const [terms, setTerms] = useState(record.terms || 'Cash');
  const [datePaid, setDatePaid] = useState(() => {
    // Format date paid if it exists
    if (record.date_paid) {
      const date = new Date(record.date_paid);
      return date.toISOString().split('T')[0];
    }
    return '';
  });
  const [paymentStatus, setPaymentStatus] = useState(record.payment_status);
  const [totalAmount, setTotalAmount] = useState(record.total_amount || 0);
  const [vatAmount, setVatAmount] = useState(record.vat_amount || 0);
  const [totalAmountDue, setTotalAmountDue] = useState(record.total_amount_due || 0);
  const [category, setCategory] = useState(record.category || '');
  const [remarks, setRemarks] = useState(record.remarks || '');
  const [items, setItems] = useState<ReceiptItem[]>(() => {
    // Ensure all items have a stable receipt_item_id
    return (record.items || []).map((item, index) => ({
      ...item,
      receipt_item_id: item.receipt_item_id || `existing-${index}-${record.receipt_id}`
    }));
  });
  const [isOtherCategory, setIsOtherCategory] = useState(record.category === 'Other');
  const [otherCategory, setOtherCategory] = useState(record.other_category || '');

  // Add useEffect to update state when record changes
  useEffect(() => {
    if (record) {
      setSupplier(record.supplier || '');
      setTransactionDate(new Date(record.transaction_date).toISOString().split('T')[0]);
      setVatRegTin(record.vat_reg_tin || '');
      setTerms(record.terms || 'Cash');
      if (record.date_paid) {
        setDatePaid(new Date(record.date_paid).toISOString().split('T')[0]);
      }
      setPaymentStatus(record.payment_status);
      setTotalAmount(record.total_amount || 0);
      setVatAmount(record.vat_amount || 0);
      setTotalAmountDue(record.total_amount_due || 0);
      setCategory(record.category || '');
      setRemarks(record.remarks || '');
      // Ensure stable IDs for items
      setItems((record.items || []).map((item, index) => ({
        ...item,
        receipt_item_id: item.receipt_item_id || `existing-${index}-${record.receipt_id}`
      })));
      setIsOtherCategory(record.category === 'Other');
      setOtherCategory(record.other_category || '');
    }
  }, [record]);

  // Add useEffect to handle VAT amount changes
  useEffect(() => {
    setTotalAmountDue(Number(totalAmount) + Number(vatAmount || 0));
  }, [vatAmount, totalAmount]);

  // Utility for formatting numbers
  const formatMoney = (amount: number) => {
    return Number(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleSave = async () => {
    if (!supplier || !transactionDate || !paymentStatus || !category) {
      Swal.fire('Error', 'Please fill in all required fields', 'error');
      return;
    }
    try {
      await onSave({
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
        items,
        other_category: isOtherCategory ? otherCategory : undefined
      });
    } catch (error) {
      console.error('Error saving receipt:', error);
      Swal.fire('Error', 'Failed to save receipt', 'error');
    }
  };

  const handleItemChange = (
    index: number, 
    field: keyof Omit<ReceiptItem, 'receipt_item_id' | 'total_price' | 'ocr_confidence'>, 
    value: string | number
  ) => {
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      const item = { ...updatedItems[index] };
      if (field === 'quantity' || field === 'unit_price') {
        let numValue: number;
        if (typeof value === 'string') {
          // Remove leading zeros from string
          const cleaned = value.replace(/^0+(?!\.|$)/, '');
          numValue = Number(cleaned) || 0;
        } else {
          numValue = value;
        }
        item[field] = numValue;
        // Calculate total_price as number
        item.total_price = Number(item.quantity || 0) * Number(item.unit_price || 0);
        updatedItems[index] = item;
        // Update total amount as number
        const newTotalAmount = updatedItems.reduce((sum, currentItem) => sum + Number(currentItem.total_price || 0), 0);
        setTotalAmount(newTotalAmount);
        setTotalAmountDue(Number(newTotalAmount) + Number(vatAmount || 0));
      } else {
        item[field] = value as string;
        updatedItems[index] = item;
      }
      return updatedItems;
    });
  };

  const addNewItem = () => {
    const temporaryId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newItem: ReceiptItem = {
      receipt_item_id: temporaryId,
      item_name: '',
      unit: '',
      quantity: 0,
      unit_price: 0,
      total_price: 0
    };
    setItems(prevItems => [...prevItems, newItem]);
  };

  const removeItem = (index: number) => {
    const updatedItems = items.filter((_, idx) => idx !== index);
    const newTotalAmount = updatedItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0);
    Promise.resolve().then(() => {
      setItems(updatedItems);
      setTotalAmount(newTotalAmount);
      setTotalAmountDue(Number(newTotalAmount) + Number(vatAmount || 0));
    });
  };

  return (
    <div className="editReceiptModalOverlay">
      <div className="editReceiptModalContent">
        <button type="button" className="closeButton" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>
        
        <div className="modalHeader">
          <h2>Edit Receipt</h2>
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
            <select
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="formSelect"
            >
              <option value="Cash">Cash</option>
              <option value="Net_15">Net 15</option>
              <option value="Net_30">Net 30</option>
              <option value="Net_60">Net 60</option>
              <option value="Net_90">Net 90</option>
            </select>
          </div>
        </div>

        <div className="formRow">
          <div className="formGroup">
            <label>Category</label>
            {!isOtherCategory ? (
              <select
                value={category}
                onChange={(e) => {
                  if (e.target.value === 'Other') {
                    setIsOtherCategory(true);
                  }
                  setCategory(e.target.value);
                }}
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
            ) : (
              <div className="otherCategoryInput">
                <input
                  type="text"
                  value={otherCategory}
                  onChange={(e) => setOtherCategory(e.target.value)}
                  placeholder="Enter category"
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsOtherCategory(false);
                    setOtherCategory('');
                    setCategory('Fuel');
                  }}
                  className="clearCategoryBtn"
                >
                  <i className="ri-close-line" />
                </button>
              </div>
            )}
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
                      type="text"
                      inputMode="decimal"
                      value={item.quantity || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty string, numbers, and decimal points
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          handleItemChange(index, 'quantity', value);
                        }
                      }}
                      min="0"
                      step="0.01"
                      required
                      placeholder="0"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.unit_price || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty string, numbers, and decimal points
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          handleItemChange(index, 'unit_price', value);
                        }
                      }}
                      min="0"
                      step="0.01"
                      required
                      placeholder="0"
                    />
                  </td>
                  <td>₱{formatMoney(item.total_price)}</td>
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
                value={`₱${formatMoney(totalAmount)}`}
                readOnly
              />
            </div>
            <div className="formGroup">
              <label>VAT Amount</label>
              <input
                type="number"
                value={vatAmount || ''}
                onChange={(e) => {
                  const newVatAmount = Number(e.target.value) || 0;
                  setVatAmount(newVatAmount);
                  setTotalAmountDue(Number(totalAmount) + newVatAmount);
                }}
                min="0"
                step="0.01"
                placeholder="0"
              />
            </div>
            <div className="formGroup">
              <label>Total Amount Due</label>
              <input
                type="text"
                value={`₱${formatMoney(totalAmountDue)}`}
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