'use client';
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import '../../styles/editReceipt.css';
import { formatDisplayText } from '@/app/utils/formatting';

// Global types, aligned with schema
interface GlobalCategory { category_id: string; name: string; }
interface GlobalTerm { id: string; name: string; }
interface GlobalPaymentStatus { id: string; name: string; }
interface GlobalItemUnit { id: string; name: string; }

// Prop type for a single receipt item, as it comes from the parent component
type ReceiptItemProp = {
  receipt_item_id: string;
  item_id: string;
  item: {
    item_id: string;
    item_name: string;
    unit: { id: string, name: string };
    category: { category_id: string, name: string };
    other_unit?: string | null;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
};

// Type for the receipt object prop
type ReceiptProp = {
    receipt_id: string;
    supplier: string;
    transaction_date: string;
    vat_reg_tin?: string | null;
    terms_id: string;
    date_paid?: string | null;
    payment_status_id: string;
    total_amount: number;
    vat_amount?: number | null;
    total_amount_due: number;
    category_id: string;
    remarks?: string | null;
    items: ReceiptItemProp[];
};

// Type for items being edited in the modal's state
type EditReceiptItem = {
    receipt_item_id: string; // For key prop
    item_id: string; // To identify existing items
    item_name: string;
    unit_id: string;
    other_unit?: string;
    category_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
};

export type UpdatedReceiptData = {
  receipt_id: string;
  supplier: string;
  transaction_date: string;
  vat_reg_tin?: string | null;
  terms_id: string;
  date_paid?: string | null;
  payment_status_id: string;
  category_id: string;
  remarks?: string | null;
  total_amount: number;
  vat_amount: number;
  total_amount_due: number;
  items: {
    item_name: string;
    unit_id: string;
    other_unit?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    category_id: string;
  }[];
  updated_by: string;
};


type EditReceiptModalProps = {
  receipt: ReceiptProp;
  onClose: () => void;
  onSave: (updatedRecord: UpdatedReceiptData) => void;
  categories: GlobalCategory[];
  terms: GlobalTerm[];
  paymentStatuses: GlobalPaymentStatus[];
  itemUnits: GlobalItemUnit[];
};

const EXPENSE_CATEGORIES = [
  'Other'
];

const ITEM_UNITS = [
  'Other'
];

const EditReceiptModal: React.FC<EditReceiptModalProps> = ({
  receipt,
  onClose,
  onSave,
  categories,
  terms: globalTerms,
  paymentStatuses,
  itemUnits,
}) => {
  const [supplier, setSupplier] = useState(receipt?.supplier || '');
  const [transactionDate, setTransactionDate] = useState(() => {
    const date = receipt?.transaction_date ? new Date(receipt.transaction_date) : new Date();
    return date.toISOString().slice(0, 16); // Include time (YYYY-MM-DDTHH:mm)
  });
  const [vatRegTin, setVatRegTin] = useState(receipt?.vat_reg_tin || '');
  const [termsId, setTermsId] = useState(receipt?.terms_id || '');
  const [datePaid, setDatePaid] = useState(() => {
    if (receipt?.date_paid) {
      const date = new Date(receipt.date_paid);
      return date.toISOString().split('T')[0];
    }
    return '';
  });
  const [paymentStatusId, setPaymentStatusId] = useState(receipt?.payment_status_id || '');
  const [totalAmount, setTotalAmount] = useState(receipt?.total_amount || 0);
  const [vatAmount, setVatAmount] = useState(receipt?.vat_amount || 0);
  const [totalAmountDue, setTotalAmountDue] = useState(receipt?.total_amount_due || 0);
  const [categoryId, setCategoryId] = useState(receipt?.category_id || '');
  const [remarks, setRemarks] = useState(receipt?.remarks || '');
  const [items, setItems] = useState<EditReceiptItem[]>(() => {
    return (receipt?.items || []).map(item => ({
      receipt_item_id: item.receipt_item_id,
      item_id: item.item_id,
      item_name: item.item.item_name,
      unit_id: item.item.unit.id,
      other_unit: item.item.other_unit || undefined,
      category_id: item.item.category.category_id,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      total_price: Number(item.total_price),
    }));
  });

  useEffect(() => {
    if (receipt) {
      setSupplier(receipt.supplier || '');
      setTransactionDate(new Date(receipt.transaction_date).toISOString().slice(0, 16)); // Include time
      setVatRegTin(receipt.vat_reg_tin || '');
      setTermsId(receipt.terms_id || '');
      if (receipt.date_paid) {
        setDatePaid(new Date(receipt.date_paid).toISOString().split('T')[0]);
      } else {
        setDatePaid('');
      }
      setPaymentStatusId(receipt.payment_status_id);
      setTotalAmount(receipt.total_amount || 0);
      setVatAmount(receipt.vat_amount || 0);
      setTotalAmountDue(receipt.total_amount_due || 0);
      setCategoryId(receipt.category_id || '');
      setRemarks(receipt.remarks || '');
      setItems((receipt.items || []).map(item => ({
        receipt_item_id: item.receipt_item_id,
        item_id: item.item_id,
        item_name: item.item.item_name,
        unit_id: item.item.unit.id,
        other_unit: item.item.other_unit || undefined,
        category_id: item.item.category.category_id,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price),
      })));
    }
  }, [receipt]);

  useEffect(() => {
    const newTotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    setTotalAmount(newTotal);
  }, [items]);

  useEffect(() => {
    setTotalAmountDue(totalAmount + vatAmount);
  }, [totalAmount, vatAmount]);

  if (!receipt) {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'supplier') setSupplier(value);
    else if (name === 'transaction_date') setTransactionDate(value);
    else if (name === 'vat_reg_tin') setVatRegTin(value);
    else if (name === 'terms_id') setTermsId(value);
    else if (name === 'date_paid') setDatePaid(value);
    else if (name === 'payment_status_id') setPaymentStatusId(value);
    else if (name === 'category_id') setCategoryId(value);
    else if (name === 'remarks') setRemarks(value);
  };

  const handleItemChange = (index: number, field: keyof EditReceiptItem, value: string | number) => {
    const updatedItems = [...items];
    const currentItem = { ...updatedItems[index] };
    
    if (field === 'quantity' || field === 'unit_price') {
        const numericValue = Number(value) || 0;
        if(field === 'quantity') currentItem.quantity = numericValue;
        if(field === 'unit_price') currentItem.unit_price = numericValue;
        currentItem.total_price = (currentItem.quantity || 0) * (currentItem.unit_price || 0);
    } else if (field === 'unit_id') {
      if(value === 'Other') {
        currentItem.unit_id = 'Other';
        currentItem.other_unit = '';
      } else {
        currentItem.unit_id = value as string;
        delete currentItem.other_unit;
      }
    } else if (field === 'item_name' || field === 'category_id' || field === 'other_unit') {
        currentItem[field] = value as string;
    }
    
    updatedItems[index] = currentItem;
    setItems(updatedItems);
  };
  
  const addNewItem = () => {
    setItems([...items, {
      receipt_item_id: `temp-${Date.now()}`,
      item_id: '',
      item_name: '',
      unit_id: '',
      other_unit: '',
      quantity: 0,
      unit_price: 0,
      total_price: 0,
      category_id: '',
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };
  
  const handleSave = async () => {
    if (!supplier || !transactionDate || !paymentStatusId || !categoryId) {
      Swal.fire('Error', 'Please fill in all required fields', 'error');
      return;
    }

    const validItems = items.filter(item => 
      item.item_name && item.unit_id && item.quantity > 0 && item.unit_price > 0 && item.category_id
    );

    if (validItems.length === 0) {
      Swal.fire('Error', 'Please add at least one valid item', 'error');
      return;
    }

    const result = await Swal.fire({
      title: 'Confirm Update',
      text: 'Are you sure you want to update this receipt?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#961C1E',
      confirmButtonText: 'Yes, update it!',
      background: 'white',
    });

    if (result.isConfirmed) {
      try {
        const updatedData: UpdatedReceiptData = {
          receipt_id: receipt.receipt_id,
          supplier,
          transaction_date: transactionDate,
          vat_reg_tin: vatRegTin,
          terms_id: termsId,
          date_paid: datePaid,
          payment_status_id: paymentStatusId,
          category_id: categoryId,
          remarks,
          total_amount: totalAmount,
          vat_amount: vatAmount,
          total_amount_due: totalAmountDue,
          items: validItems.map(item => ({
            item_name: item.item_name,
            unit_id: item.unit_id,
            other_unit: item.other_unit,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            category_id: item.category_id,
          })),
          updated_by: 'ftms_user'
        };
        
        onSave(updatedData);
      } catch (error) {
        console.error('Error updating receipt:', error);
        Swal.fire('Error', 'An error occurred while updating the receipt', 'error');
      }
    }
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
            name="supplier"
            value={supplier}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="formRow">
          <div className="formGroup">
            <label>Transaction Date & Time</label>
            <input
              type="datetime-local"
              name="transaction_date"
              value={transactionDate}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="formGroup">
            <label>Date Paid</label>
            <input
              type="date"
              name="date_paid"
              value={datePaid}
              onChange={handleInputChange}
              className="formInput"
            />
          </div>
        </div>

        <div className="formRow">
          <div className="formGroup">
            <label>VAT Reg TIN</label>
            <input
              type="text"
              name="vat_reg_tin"
              value={vatRegTin}
              onChange={handleInputChange}
              placeholder="Optional"
            />
          </div>
          <div className="formGroup">
            <label>Terms</label>
            <select
              name="terms_id"
              value={termsId}
              onChange={handleInputChange}
              className="formSelect"
            >
              {globalTerms.map(t => <option key={t.id} value={t.id}>{formatDisplayText(t.name)}</option>)}
            </select>
          </div>
        </div>

        <div className="formRow">
          <div className="formGroup">
            <label>Category</label>
            <select
                name="category_id"
                value={categoryId}
                onChange={handleInputChange}
                required
              >
              <option value="">Select Category</option>
              {categories.map(cat => (
                  <option key={cat.category_id} value={cat.category_id}>{formatDisplayText(cat.name)}</option>
              ))}
            </select>
          </div>
          <div className="formGroup">
            <label>Payment Status</label>
            <select
              name="payment_status_id"
              value={paymentStatusId}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Status</option>
              {paymentStatuses.map(ps => <option key={ps.id} value={ps.id}>{formatDisplayText(ps.name)}</option>)}
            </select>
          </div>
        </div>

        <div className="formGroup">
          <label>Remarks</label>
          <textarea
            name="remarks"
            value={remarks}
            onChange={handleInputChange}
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
                <th>Category</th>
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
                      placeholder="Enter item name"
                    />
                  </td>
                  <td>
                    {item.unit_id === 'Other' ? (
                      <div className="otherUnitInput">
                        <input
                          type="text"
                          value={item.other_unit || ''}
                          onChange={(e) => handleItemChange(index, 'other_unit', e.target.value)}
                          placeholder="Specify unit"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => handleItemChange(index, 'unit_id', itemUnits[0]?.id || '')}
                          className="clearUnitBtn"
                        >
                          <i className="ri-close-line" />
                        </button>
                      </div>
                    ) : (
                      <select
                        value={item.unit_id}
                        onChange={(e) => handleItemChange(index, 'unit_id', e.target.value)}
                        required
                      >
                        <option value="">Select Unit</option>
                        {itemUnits.map(unit => (
                          <option key={unit.id} value={unit.id}>{unit.name}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                    )}
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.quantity || ''}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      min="0"
                      step="any"
                      required
                      placeholder="0"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.unit_price || ''}
                      onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                      min="0"
                      step="any"
                      required
                      placeholder="0"
                    />
                  </td>
                  <td>₱{(item.total_price || 0).toLocaleString()}</td>
                  <td>
                    <select
                      value={item.category_id}
                      onChange={(e) => handleItemChange(index, 'category_id', e.target.value)}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.category_id} value={cat.category_id}>{formatDisplayText(cat.name)}</option>
                      ))}
                    </select>
                  </td>
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
                onChange={(e) => setVatAmount(Number(e.target.value))}
                min="0"
                step="any"
                placeholder="0"
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