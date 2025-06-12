'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import '../../styles/receipt.css';
import { formatDate } from '../../utility/dateFormatter';

type ReceiptItem = {
  receipt_item_id?: string;
  item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type AddReceiptFormData = {
  onClose: () => void;
  onAddReceipt: (formData: {
    supplier: string;
    transaction_date: string;
    vat_reg_tin?: string;
    terms?: string;
    date_paid?: string;
    payment_status: 'Paid' | 'Pending' | 'Cancelled' | 'Dued';
    total_amount: number;
    vat_amount?: number;
    total_amount_due: number;
    category: 'Fuel' | 'Vehicle_Parts' | 'Tools' | 'Equipment' | 'Supplies' | 'Other';
    other_category?: string;
    remarks?: string;
    source: 'Manual_Entry' | 'OCR_Camera' | 'OCR_File';
    items: ReceiptItem[];
    created_by: string;
  }) => void;
  currentUser: string;
};

const AddReceipt: React.FC<AddReceiptFormData> = ({ 
  onClose, 
  onAddReceipt,
  currentUser 
}) => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const [otherCategory, setOtherCategory] = useState('');
  
  const [formData, setFormData] = useState({
    supplier: '',
    transaction_date: new Date().toISOString().split('T')[0],
    vat_reg_tin: '',
    terms: 'Cash' as const,
    date_paid: '',
    payment_status: 'Pending' as 'Paid' | 'Pending' | 'Cancelled' | 'Dued',
    total_amount: 0,
    vat_amount: 0,
    total_amount_due: 0,
    category: '' as 'Fuel' | 'Vehicle_Parts' | 'Tools' | 'Equipment' | 'Supplies' | 'Other',
    remarks: '',
    source: 'Manual_Entry' as const,
    created_by: currentUser,
  });

  const [items, setItems] = useState<ReceiptItem[]>([{
    item_name: '',
    unit: '',
    quantity: 0,
    unit_price: 0,
    total_price: 0
  }]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'vat_amount') {
      const newVatAmount = Number(value);
      setFormData(prev => ({
        ...prev,
        vat_amount: newVatAmount,
        total_amount_due: prev.total_amount + newVatAmount
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleItemChange = (index: number, field: keyof ReceiptItem, value: string | number) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index] };

    if (field === 'quantity' || field === 'unit_price') {
      const numValue = Number(value);
      item[field] = numValue;
      item.total_price = item.quantity * item.unit_price;
    } else if (field === 'item_name' || field === 'unit') {
      item[field] = value as string;
    }

    updatedItems[index] = item;
    setItems(updatedItems);

    // Update total amounts
    const newTotalAmount = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
    setFormData(prev => ({
      ...prev,
      total_amount: newTotalAmount,
      total_amount_due: newTotalAmount + (prev.vat_amount || 0)
    }));

    // Add a new row if it's the last row and not empty
    if (
      index === items.length - 1 &&
      (item.item_name || item.unit || item.quantity > 0 || item.unit_price > 0)
    ) {
      setItems([...updatedItems, {
        item_name: '',
        unit: '',
        quantity: 0,
        unit_price: 0,
        total_price: 0
      }]);
    }
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const updatedItems = items.filter((_, idx) => idx !== index);
      setItems(updatedItems);

      // Update total amounts
      const newTotalAmount = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
      setFormData(prev => ({
        ...prev,
        total_amount: newTotalAmount,
        total_amount_due: newTotalAmount + (prev.vat_amount || 0)
      }));
    }
  };

  // Inside the handleSubmit function
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { supplier, transaction_date, category, payment_status } = formData;

    if (!supplier || !transaction_date || !category || !payment_status) {
      Swal.fire('Error', 'Please fill in all required fields', 'error');
      return;
    }

    if (formData.category === 'Other' && !otherCategory) {
      Swal.fire('Error', 'Please specify the category name', 'error');
      return;
    }
    
    // Filter out empty items
    const validItems = items.filter(item => 
      item.item_name && item.unit && item.quantity > 0 && item.unit_price > 0
    );

    if (validItems.length === 0) {
      Swal.fire('Error', 'Please add at least one item', 'error');
      return;
    }

    const result = await Swal.fire({
      title: 'Confirm Add',
      text: 'Are you sure you want to add this receipt?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#961C1E',
      confirmButtonText: 'Yes, add it!',
      background: 'white',
    });

    if (result.isConfirmed) {
      try {
        await onAddReceipt({
          ...formData,
          other_category: formData.category === 'Other' ? otherCategory : undefined,
          items: validItems
        });

        Swal.fire('Success', 'Receipt added successfully', 'success');
        onClose();
      } catch (error: unknown) {
        console.error('Error adding receipt:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        Swal.fire('Error', 'Failed to add receipt: ' + errorMessage, 'error');
      }
    }
  };

  return (
    <div className="modalOverlay">
      <div className="receiptModal">
        {/* Close Button */}
        <button type="button" className="closeButton" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>

        <div className="modalHeader">
          <h1>Add Receipt</h1>
          <div className="timeDate">
            <div className="currTime">{currentTime}</div>
            <div className="currDate">{currentDate}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modalContent">
            <div className="formFieldsHorizontal">
              <div className="formInputs">
                <div className="formRow">
                  <div className="formField">
                    <label htmlFor="supplier">Supplier</label>
                    <input
                      type="text"
                      id="supplier"
                      name="supplier"
                      value={formData.supplier}
                      onChange={handleInputChange}
                      placeholder="Enter supplier name"
                      required
                      className="formInput"
                    />
                  </div>

                    <div className="formField">
                      <label htmlFor="category">Category</label>
                      {!isOtherCategory ? (
                        <select
                          id="category"
                          name="category"
                          value={formData.category}
                          onChange={(e) => {
                            if (e.target.value === 'Other') {
                              setIsOtherCategory(true);
                            }
                            handleInputChange(e);
                          }}
                          required
                          className="formSelect"
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
                              setFormData(prev => ({ 
                                ...prev, 
                                category: 'Fuel' // Set to a default valid category instead of empty string
                              }));
                            }}
                            className="clearCategoryBtn"
                          >
                            <i className="ri-close-line" />
                          </button>
                        </div>
                      )}
                    </div>
                </div>

                <div className="formRow">
                  <div className="formField">
                    <label htmlFor="transaction_date">Transaction Date</label>
                    <input
                      type="date"
                      id="transaction_date"
                      name="transaction_date"
                      value={formData.transaction_date}
                      onChange={handleInputChange}
                      required
                      className="formInput"
                    />
                  </div>

                  <div className="formField">
                    <label htmlFor="date_paid">Date Paid</label>
                    <input
                      type="date"
                      id="date_paid"
                      name="date_paid"
                      value={formData.date_paid}
                      onChange={handleInputChange}
                      disabled={formData.payment_status === 'Cancelled' || formData.payment_status === 'Pending'}
                      className="formInput"
                    />
                  </div>
                </div>

                <div className="formRow">
                  <div className="formField">
                    <label htmlFor="vat_reg_tin">VAT Reg TIN</label>
                    <input
                      type="text"
                      id="vat_reg_tin"
                      name="vat_reg_tin"
                      value={formData.vat_reg_tin}
                      onChange={handleInputChange}
                      placeholder="Optional"
                      className="formInput"
                    />
                  </div>
                    <div className="formField">
                      <label htmlFor="terms">Terms</label>
                      <select
                        id="terms"
                        name="terms"
                        value={formData.terms}
                        onChange={handleInputChange}
                        required
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
                  <div className="formField">
                    <label htmlFor="payment_status">Payment Status</label>
                    <select
                      id="payment_status"
                      name="payment_status"
                      value={formData.payment_status}
                      onChange={handleInputChange}
                      required
                      className="formSelect"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Dued">Dued</option>
                    </select>
                  </div>

                  <div className="formField">
                    <label htmlFor="vat_amount">VAT Amount</label>
                    <input
                      type="number"
                      id="vat_amount"
                      name="vat_amount"
                      value={formData.vat_amount || ''} // Use empty string when 0
                      onChange={handleInputChange}
                      placeholder="0"  // Add placeholder
                      min="0"
                      step="0.01"
                      className="formInput"
                    />
                  </div>
                </div>

                <div className="formField">
                  <label htmlFor="remarks">Remarks</label>
                  <textarea
                    id="remarks"
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    placeholder="Optional"
                    className="formInput"
                    rows={3}
                  />
                </div>

                <div className="itemsSection">
                  <h3>Items</h3>
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
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <input
                              type="text"
                              value={item.item_name}
                              onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                              placeholder="Enter item name"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                              placeholder="Unit"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={item.quantity || ''}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={item.unit_price || ''}
                              onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td>₱{item.total_price.toLocaleString()}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
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
                    <div className="formField">
                      <label>Total Amount</label>
                      <input
                        type="text"
                        value={`₱${formData.total_amount.toLocaleString()}`}
                        readOnly
                        className="formInput"
                      />
                    </div>

                    <div className="formField">
                      <label>Total Amount Due</label>
                      <input
                        type="text"
                        value={`₱${formData.total_amount_due.toLocaleString()}`}
                        readOnly
                        className="formInput"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="modalButtons">
            <button type="submit" className="addButton">
              <i className="ri-add-line" /> Add Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddReceipt; 