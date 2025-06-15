'use client';
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import '../../styles/editReceipt.css';
import { formatDisplayText } from '@/app/utils/formatting';

type ReceiptItem = {
  receipt_item_id: string;
  item_id: string;
  item: {
    item_id: string;
    item_name: string;
    unit: string;
    category: string;
    other_category?: string;
    other_unit?: string;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
  ocr_confidence?: number;
};

type ItemField = 'item_name' | 'unit' | 'category' | 'other_category' | 'other_unit' | 'quantity' | 'unit_price';

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
    items: Array<{
      receipt_item_id: string;
      item_name: string;
      unit: string;
      other_unit?: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      category: string;
      other_category?: string;
    }>;
  }) => void;
};

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
  const [categoryOverride, setCategoryOverride] = useState(false);

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
      setCategoryOverride(false);
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

    // Filter out empty items
    const validItems = items.filter(item => 
      item.item.item_name && item.item.unit && item.quantity > 0 && item.unit_price > 0
    );

    if (validItems.length === 0) {
      Swal.fire('Error', 'Please add at least one item', 'error');
      return;
    }

    // Validate that all items have a valid category
    const invalidItems = validItems.filter(item => 
      !item.item.category || 
      (item.item.category === 'Other' && !item.item.other_category)
    );

    if (invalidItems.length > 0) {
      Swal.fire('Error', 'Please specify a category for all items. If "Other" is selected, please provide a custom category.', 'error');
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
        // Prepare the data with proper category handling
        const submitData = {
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
          category: EXPENSE_CATEGORIES.includes(category) 
            ? category 
            : 'Other',
          other_category: EXPENSE_CATEGORIES.includes(category)
            ? undefined
            : category,
          remarks: remarks || undefined,
          items: validItems.map(item => ({
            receipt_item_id: item.receipt_item_id,
            item_name: item.item.item_name,
            unit: ITEM_UNITS.includes(item.item.unit)
              ? item.item.unit
              : 'Other',
            other_unit: item.item.unit === 'Other' ? item.item.other_unit : undefined,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            category: EXPENSE_CATEGORIES.includes(item.item.category)
              ? item.item.category
              : 'Other',
            other_category: item.item.category === 'Other' ? item.item.other_category : undefined
          }))
        };

        await onSave(submitData);
        Swal.fire('Success', 'Receipt updated successfully', 'success');
        onClose();
      } catch (error) {
        console.error('Error updating receipt:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        Swal.fire('Error', 'Failed to update receipt: ' + errorMessage, 'error');
      }
    }
  };

  const computeSummaryCategory = (items: ReceiptItem[]): string => {
    if (items.length === 0) return 'Fuel';
    // Get unique categories
    const uniqueCategories = Array.from(new Set(items.map(item => {
      // Resolve the actual category value
      return item.item.category === 'Other' && item.item.other_category 
        ? item.item.other_category 
        : item.item.category;
    }).filter(Boolean)));
    if (uniqueCategories.length === 0) return 'Fuel';
    if (uniqueCategories.length === 1) {
      return uniqueCategories[0];
    }
    // Multiple different categories
    return 'Multiple_Categories';
  };

  const isCategoryEditable = (items: ReceiptItem[]) => {
    if (categoryOverride) return true;
    if (items.length === 0) return true;
    return false;
  };

  const getDisplayCategory = (category: string, otherCategory?: string) => {
    if (category === 'Other' && otherCategory) {
      return otherCategory;
    }
    return formatDisplayText(category);
  };

  useEffect(() => {
    if (!categoryOverride) {
      const summaryCategory = computeSummaryCategory(items);
      setCategory(summaryCategory);
      if (summaryCategory === 'Other') {
        setOtherCategory(otherCategory || '');
      }
    }
  }, [items, categoryOverride, otherCategory]);

  const handleItemChange = (
    index: number, 
    field: ItemField,
    value: string | number
  ) => {
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      const item = { ...updatedItems[index] };
      
      if (field === 'quantity' || field === 'unit_price') {
        let numValue: number;
        if (typeof value === 'string') {
          const cleaned = value.replace(/^0+(?!\.|$)/, '');
          numValue = Number(cleaned) || 0;
        } else {
          numValue = value;
        }
        item[field] = numValue;
        item.total_price = Number(item.quantity || 0) * Number(item.unit_price || 0);
        updatedItems[index] = item;
        const newTotalAmount = updatedItems.reduce((sum, currentItem) => sum + Number(currentItem.total_price || 0), 0);
        setTotalAmount(newTotalAmount);
        setTotalAmountDue(Number(newTotalAmount) + Number(vatAmount || 0));
      } else if (field === 'category') {
        if (value === 'Other') {
          item.item.category = 'Other';
          item.item.other_category = '';
        } else {
          item.item.category = value as string;
          item.item.other_category = undefined;
        }
        updatedItems[index] = item;
      } else if (field === 'other_category') {
        item.item.other_category = value as string;
        updatedItems[index] = item;
      } else if (field === 'unit') {
        if (value === 'Other') {
          item.item.unit = 'Other';
          item.item.other_unit = '';
        } else {
          item.item.unit = value as string;
          item.item.other_unit = undefined;
        }
        updatedItems[index] = item;
      } else if (field === 'other_unit') {
        item.item.other_unit = value as string;
        updatedItems[index] = item;
      } else if (field === 'item_name') {
        item.item.item_name = value as string;
        updatedItems[index] = item;
      }
      
      // Only auto-set summary category if not overridden
      if (!categoryOverride) {
        setCategory(computeSummaryCategory(updatedItems));
      }
      return updatedItems;
    });
  };

  const addNewItem = () => {
    const temporaryId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newItem: ReceiptItem = {
      receipt_item_id: temporaryId,
      item_id: '',
      item: {
        item_id: '',
        item_name: '',
        unit: '',
        category: '',
      },
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
              disabled={paymentStatus === 'Pending' || paymentStatus === 'Cancelled'}
              className="formInput"
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
              <option value="Net_15">{formatDisplayText('Net_15')}</option>
              <option value="Net_30">{formatDisplayText('Net_30')}</option>
              <option value="Net_60">{formatDisplayText('Net_60')}</option>
              <option value="Net_90">{formatDisplayText('Net_90')}</option>
            </select>
          </div>
        </div>

        <div className="formRow">
          <div className="formGroup">
            <label>Category</label>
            {isCategoryEditable(items) ? (
              !isOtherCategory ? (
                <div className="categoryField">
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
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{formatDisplayText(cat)}</option>
                    ))}
                  </select>
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCategoryOverride(!categoryOverride)}
                      className="overrideBtn"
                      title={categoryOverride ? "Disable manual override" : "Enable manual override"}
                    >
                      <i className={categoryOverride ? "ri-lock-line" : "ri-lock-unlock-line"} />
                    </button>
                  )}
                </div>
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
              )
            ) : (
              <div className="readOnlyCategory">
                <input
                  type="text"
                  value={formatDisplayText(getDisplayCategory(category, otherCategory))}
                  readOnly
                />
                <div className="categoryTooltip">
                  <i className="ri-information-line" />
                  <span className="tooltipText">
                    {category === 'Multiple_Categories' 
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
                      value={item.item.item_name}
                      onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                      required
                      placeholder="Enter item name"
                    />
                  </td>
                  <td>
                    {item.item.unit === 'Other' ? (
                      <div className="otherUnitInput">
                        <input
                          type="text"
                          value={item.item.other_unit || ''}
                          onChange={(e) => handleItemChange(index, 'other_unit', e.target.value)}
                          placeholder="Specify unit"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => handleItemChange(index, 'unit', 'piece(s)')}
                          className="clearUnitBtn"
                        >
                          <i className="ri-close-line" />
                        </button>
                      </div>
                    ) : (
                      <select
                        value={item.item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        required
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
                      type="text"
                      inputMode="decimal"
                      value={item.quantity || ''}
                      onChange={(e) => {
                        const value = e.target.value;
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
                    {item.item.category === 'Other' ? (
                      <div className="otherCategoryInput">
                        <input
                          type="text"
                          value={item.item.other_category || ''}
                          onChange={(e) => handleItemChange(index, 'other_category', e.target.value)}
                          placeholder="Specify category"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => handleItemChange(index, 'category', 'Fuel')}
                          className="clearCategoryBtn"
                        >
                          <i className="ri-close-line" />
                        </button>
                      </div>
                    ) : (
                      <select
                        value={item.item.category}
                        onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                        required
                      >
                        {EXPENSE_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{formatDisplayText(cat)}</option>
                        ))}
                      </select>
                    )}
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