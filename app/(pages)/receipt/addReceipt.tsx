'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import '../../styles/receipt.css';
import { formatDate } from '../../utility/dateFormatter';
import OCRUpload from '../../Components/OCRUpload';
import OCRCamera from '../../Components/OCRCamera';

const EXPENSE_CATEGORIES = [
  'Fuel',
  'Vehicle_Parts',
  'Tools',
  'Equipment',
  'Supplies',
  'Other'
];

const ITEM_UNITS = [
  'piece(s)',
  'box(es)',
  'pack(s)',
  'gallon(s)',
  'liter(s)',
  'milliliter(s)',
  'kilogram(s)',
  'gram(s)',
  'pound(s)',
  'meter(s)',
  'foot/feet',
  'roll(s)',
  'set(s)',
  'pair(s)',
  'Other'
];

type ExpenseCategory = 'Fuel' | 'Vehicle_Parts' | 'Tools' | 'Equipment' | 'Supplies' | 'Other' | 'Multiple_Categories';

type ReceiptItem = {
  receipt_item_id?: string;
  item_name: string;
  unit: string;
  other_unit?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category: ExpenseCategory;
  other_category?: string;
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
    category: ExpenseCategory;
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
  const [categoryOverride, setCategoryOverride] = useState(false);
  const [source, setSource] = useState<'Manual_Entry' | 'OCR_Camera' | 'OCR_File'>('Manual_Entry');
  
  const [formData, setFormData] = useState<{
    supplier: string;
    transaction_date: string;
    vat_reg_tin: string;
    terms: 'Cash';
    date_paid: string;
    payment_status: 'Paid' | 'Pending' | 'Cancelled' | 'Dued';
    total_amount: number;
    vat_amount: number;
    total_amount_due: number;
    category: ExpenseCategory;
    other_category?: string;
    remarks: string;
    source: 'Manual_Entry' | 'OCR_Camera' | 'OCR_File';
    created_by: string;
  }>({
    supplier: '',
    transaction_date: new Date().toISOString().split('T')[0],
    vat_reg_tin: '',
    terms: 'Cash',
    date_paid: '',
    payment_status: 'Pending',
    total_amount: 0,
    vat_amount: 0,
    total_amount_due: 0,
    category: 'Fuel',
    other_category: undefined,
    remarks: '',
    source: 'Manual_Entry',
    created_by: currentUser,
  });

  const [items, setItems] = useState<ReceiptItem[]>([{
    item_name: '',
    unit: '',
    other_unit: '',
    quantity: 0,
    unit_price: 0,
    total_price: 0,
    category: 'Fuel',
    other_category: ''
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

  const computeSummaryCategory = (items: ReceiptItem[]): ExpenseCategory => {
    if (items.length === 0) return 'Fuel';
    
    // Get unique categories and their totals
    const categoryTotals: Record<string, number> = {};
    
    items.forEach(item => {
      // Resolve the actual category value
      const resolvedCategory = item.category === 'Other' && item.other_category 
        ? item.other_category 
        : item.category;
      
      if (resolvedCategory) {
        categoryTotals[resolvedCategory] = (categoryTotals[resolvedCategory] || 0) + item.total_price;
      }
    });

    // Get unique resolved categories
    const uniqueCategories = Object.keys(categoryTotals);
    
    if (uniqueCategories.length === 0) return 'Fuel';
    if (uniqueCategories.length === 1) {
      const singleCategory = uniqueCategories[0];
      // If the single category is a standard category, return it
      if (EXPENSE_CATEGORIES.includes(singleCategory as ExpenseCategory)) {
        return singleCategory as ExpenseCategory;
      }
      // If it's a custom category, return it directly
      return singleCategory as ExpenseCategory;
    }
    
    // Multiple different categories
    return 'Multiple_Categories';
  };

  const isCategoryEditable = (items: ReceiptItem[]) => {
    if (categoryOverride) return true;
    if (items.length === 0) return true;
    return false;
  };

  const getDisplayCategory = (category: ExpenseCategory, otherCategory?: string) => {
    if (category === 'Other' && otherCategory) {
      return otherCategory;
    }
    if (category === 'Multiple_Categories') {
      return 'Multiple Categories';
    }
    return category.replace('_', ' ');
  };

  useEffect(() => {
    if (!categoryOverride) {
      const summaryCategory = computeSummaryCategory(items);
      setFormData(prev => ({
        ...prev,
        category: summaryCategory,
        other_category: summaryCategory === 'Other' ? otherCategory : undefined
      }));
    }
  }, [items, categoryOverride, otherCategory]);

  const handleItemChange = (index: number, field: keyof ReceiptItem, value: string | number) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index] };

    if (field === 'quantity' || field === 'unit_price') {
      const numValue = Number(value);
      item[field] = numValue;
      item.total_price = item.quantity * item.unit_price;
    } else if (field === 'unit') {
      if (value === 'Other') {
        item.unit = 'Other';
        item.other_unit = '';
      } else {
        item.unit = value as string;
        item.other_unit = undefined;
      }
    } else if (field === 'other_unit') {
      item.other_unit = value as string;
    } else if (field === 'category') {
      if (value === 'Other') {
        item.category = 'Other';
        item.other_category = '';
      } else {
        item.category = value as ExpenseCategory;
        item.other_category = undefined;
      }
    } else if (field === 'other_category') {
      item.other_category = value as string;
    } else if (field === 'item_name') {
      item.item_name = value as string;
    }

    updatedItems[index] = item;
    setItems(updatedItems);

    // Update total amounts
    const newTotalAmount = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
    setFormData(prev => ({
      ...prev,
      total_amount: newTotalAmount,
      total_amount_due: newTotalAmount + (prev.vat_amount || 0),
      category: categoryOverride ? prev.category : (computeSummaryCategory(updatedItems) as ExpenseCategory),
    }));

    // Add a new row if it's the last row and not empty
    if (
      index === items.length - 1 &&
      (item.item_name || item.unit || item.quantity > 0 || item.unit_price > 0)
    ) {
      setItems([...updatedItems, {
        item_name: '',
        unit: '',
        other_unit: '',
        quantity: 0,
        unit_price: 0,
        total_price: 0,
        category: 'Fuel' as ExpenseCategory,
        other_category: ''
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { supplier, transaction_date, payment_status } = formData;

    if (!supplier || !transaction_date || !payment_status) {
      Swal.fire('Error', 'Please fill in all required fields', 'error');
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

    // Validate that all items have a valid category
    const invalidItems = validItems.filter(item => 
      !item.category || (item.category === 'Other' && !item.other_category)
    );

    if (invalidItems.length > 0) {
      Swal.fire('Error', 'Please specify a category for all items', 'error');
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
        // Prepare the data with proper category handling
        const submitData = {
          ...formData,
          // If the category is not a standard one, use 'Other' and store the custom value
          category: EXPENSE_CATEGORIES.includes(formData.category as ExpenseCategory) 
            ? formData.category 
            : 'Other',
          other_category: EXPENSE_CATEGORIES.includes(formData.category as ExpenseCategory)
            ? undefined
            : formData.category,
          items: validItems.map(item => ({
            ...item,
            // For items, if the category is not a standard one, use 'Other' and store the custom value
            category: EXPENSE_CATEGORIES.includes(item.category as ExpenseCategory)
              ? item.category
              : 'Other',
            other_category: item.category === 'Other' ? item.other_category : undefined,
            // For units, if it's 'Other', store the custom value
            unit: ITEM_UNITS.includes(item.unit)
              ? item.unit
              : 'Other',
            other_unit: item.unit === 'Other' ? item.other_unit : undefined
          }))
        };

        await onAddReceipt(submitData);
        Swal.fire('Success', 'Receipt added successfully', 'success');
        onClose();
      } catch (error: unknown) {
        console.error('Error adding receipt:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        Swal.fire('Error', 'Failed to add receipt: ' + errorMessage, 'error');
      }
    }
  };

  // Add a button to toggle category override
  const toggleCategoryOverride = () => {
    setCategoryOverride(!categoryOverride);
    if (!categoryOverride) {
      // When enabling override, keep the current category
      setFormData(prev => ({
        ...prev,
        category: prev.category || 'Fuel',
        other_category: prev.category === 'Other' ? otherCategory : undefined
      }));
    } else {
      // When disabling override, recompute from items
      const summaryCategory = computeSummaryCategory(items);
      setFormData(prev => ({
        ...prev,
        category: summaryCategory,
        other_category: summaryCategory === 'Other' ? otherCategory : undefined
      }));
    }
  };

  const handleOCRComplete = (data: {
    supplier: string;
    transaction_date: string;
    vat_reg_tin?: string;
    total_amount: number;
    vat_amount?: number;
    items: Array<{
      item_name: string;
      unit: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
  }) => {
    // Update form data with OCR results
    setFormData(prev => ({
      ...prev,
      supplier: data.supplier || prev.supplier,
      transaction_date: data.transaction_date || prev.transaction_date,
      vat_reg_tin: data.vat_reg_tin || prev.vat_reg_tin,
      total_amount: data.total_amount || prev.total_amount,
      vat_amount: data.vat_amount || prev.vat_amount,
      total_amount_due: (data.total_amount || 0) + (data.vat_amount || 0),
      source: source
    }));

    // Update items with OCR results
    if (data.items.length > 0) {
      const newItems = data.items.map(item => ({
        ...item,
        category: 'Fuel' as ExpenseCategory,
        other_category: ''
      }));
      setItems(newItems);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="receiptModal">
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
            {/* Source Selection */}
            <div className="source-selection">
              <div 
                className={`source-option ${source === 'Manual_Entry' ? 'active' : ''}`}
                onClick={() => setSource('Manual_Entry')}
              >
                <i className="ri-edit-line"></i>
                <p>Manual Entry</p>
              </div>
              <div 
                className={`source-option ${source === 'OCR_Camera' ? 'active' : ''}`}
                onClick={() => setSource('OCR_Camera')}
              >
                <i className="ri-camera-line"></i>
                <p>Camera Scan</p>
              </div>
              <div 
                className={`source-option ${source === 'OCR_File' ? 'active' : ''}`}
                onClick={() => setSource('OCR_File')}
              >
                <i className="ri-upload-line"></i>
                <p>File Upload</p>
              </div>
            </div>

            {/* OCR Components */}
            {source === 'OCR_File' && (
              <OCRUpload onOCRComplete={handleOCRComplete} />
            )}
            {source === 'OCR_Camera' && (
              <OCRCamera onOCRComplete={handleOCRComplete} />
            )}

            {/* Manual Entry Form */}
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
                      {isCategoryEditable(items) ? (
                        !isOtherCategory ? (
                          <div className="categoryField">
                            <select
                              id="category"
                              name="category"
                              value={formData.category || 'Fuel'}
                              onChange={(e) => {
                                if (e.target.value === 'Other') {
                                  setIsOtherCategory(true);
                                }
                                handleInputChange(e);
                              }}
                              required
                              className="formSelect"
                            >
                              <option value="Fuel">Fuel</option>
                              <option value="Vehicle_Parts">Vehicle Parts</option>
                              <option value="Tools">Tools</option>
                              <option value="Equipment">Equipment</option>
                              <option value="Supplies">Supplies</option>
                              <option value="Other">Other</option>
                              <option value="Multiple_Categories">Multiple Categories</option>
                            </select>
                            {items.length > 0 && (
                              <button
                                type="button"
                                onClick={toggleCategoryOverride}
                                className="overrideBtn"
                                title={categoryOverride ? "Disable manual override" : "Enable manual override"}
                              >
                                <i className={categoryOverride ? "ri-lock-line" : "ri-lock-unlock-line"} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="customInputWrapper">
                            <input
                              type="text"
                              value={otherCategory}
                              onChange={(e) => setOtherCategory(e.target.value)}
                              placeholder="Enter custom category"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setIsOtherCategory(false);
                                setOtherCategory('');
                                setFormData(prev => ({ 
                                  ...prev, 
                                  category: 'Fuel'
                                }));
                              }}
                              className="clearCustomBtn"
                              title="Clear custom category"
                            >
                              <i className="ri-close-line" />
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="readOnlyCategory">
                          <input
                            type="text"
                            value={getDisplayCategory(formData.category || 'Fuel', formData.other_category)}
                            readOnly
                            className="formInput"
                          />
                          <div className="categoryTooltip">
                            <i className="ri-information-line" />
                            <span className="tooltipText">
                              {formData.category === 'Multiple_Categories' 
                                ? "Multiple categories detected in items. Click the lock icon to override."
                                : "Category is automatically determined by item categories. Click the lock icon to override."}
                            </span>
                          </div>
                        </div>
                      )}
                      {!isCategoryEditable(items) && (
                        <small className="categoryNote"></small>
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
                        <th>Category</th>
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
                            {item.unit === 'Other' ? (
                              <div className="customInputWrapper">
                                <input
                                  type="text"
                                  value={item.other_unit || ''}
                                  onChange={(e) => handleItemChange(idx, 'other_unit', e.target.value)}
                                  placeholder="Enter custom unit"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleItemChange(idx, 'unit', '')}
                                  className="clearCustomBtn"
                                  title="Clear custom unit"
                                >
                                  <i className="ri-close-line" />
                                </button>
                              </div>
                            ) : (
                              <select
                                value={item.unit}
                                onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                                required
                                className="formSelect"
                              >
                                <option value="">Select Unit</option>
                                {ITEM_UNITS.map(unit => (
                                  <option key={unit} value={unit}>{unit}</option>
                                ))}
                              </select>
                            )}
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
                            {item.category === 'Other' ? (
                              <div className="customInputWrapper">
                                <input
                                  type="text"
                                  value={item.other_category || ''}
                                  onChange={(e) => handleItemChange(idx, 'other_category', e.target.value)}
                                  placeholder="Enter custom category"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleItemChange(idx, 'category', '')}
                                  className="clearCustomBtn"
                                  title="Clear custom category"
                                >
                                  <i className="ri-close-line" />
                                </button>
                              </div>
                            ) : (
                              <select
                                value={item.category}
                                onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                                required
                                className="formSelect"
                              >
                                <option value="">Select Category</option>
                                {EXPENSE_CATEGORIES.map(cat => (
                                  <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                                ))}
                              </select>
                            )}
                          </td>
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