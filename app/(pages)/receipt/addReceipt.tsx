'use client';

import React, { useState, useEffect, useCallback } from 'react';
import OCRUpload from '../../Components/OCRUpload';
import OCRCamera from '../../Components/OCRCamera';
import Swal from 'sweetalert2';
import { formatDate } from '../../utility/dateFormatter';
import { formatDisplayText } from '@/app/utils/formatting';


const EXPENSE_CATEGORIES = [
  'Fuel',
  'Vehicle_Parts',
  'Tools',
  'Equipment',
  'Supplies',
  'Other'
];

type ReceiptItem = {
  receipt_item_id?: string;
  item_id: string;
  unit_id: string;
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
};

type AddReceiptSubmitData = Omit<FormDataState, 'other_category' | 'created_by'> & {
  items: Array<{
    item_name: string;
    unit_id: string;
    unit: string;
    other_unit?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    category_id: string;
    other_category?: string;
  }>;
  created_by: string;
}

type AddReceiptFormData = {
  onClose: () => void;
  onAddReceipt: (formData: AddReceiptSubmitData) => void;
  currentUser: string;
  categories: GlobalCategory[];
  sources: GlobalSource[];
  terms: GlobalTerm[];
  paymentStatuses: GlobalPaymentStatus[];
  itemUnits: GlobalItemUnit[];
  created_by: string;
}

type OCRData = {
  supplier: string;
  transaction_date: string;
  payment_terms?: string;  // ADDED
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
}

// Add types for global values
interface GlobalCategory { category_id: string; name: string; }
interface GlobalTerm { id: string; name: string; }
interface GlobalPaymentStatus { id: string; name: string; }
interface GlobalSource { source_id: string; name: string; }
interface GlobalItemUnit { id: string; name: string; }

type FormDataState = {
  supplier: string;
  transaction_date: string; // Will be in YYYY-MM-DDTHH:mm format
  vat_reg_tin: string;
  terms_id: string;
  payment_terms?: string;  // ADDED: Optional payment terms from OCR
  date_paid: string;
  payment_status_id: string;
  total_amount: number;
  vat_amount: number;
  total_amount_due: number;
  category_id: string;
  other_category?: string;
  remarks: string;
  source_id: string;
  created_by: string;
}

const AddReceipt: React.FC<AddReceiptFormData> = ({ 
  onClose, 
  onAddReceipt,
  currentUser,
  categories,
  sources,
  terms,
  paymentStatuses,
  itemUnits
}) => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const [otherCategory, setOtherCategory] = useState('');
  const [categoryOverride, setCategoryOverride] = useState(false);
  const [sourceOption, setSourceOption] = useState<'Manual_Entry' | 'OCR_Camera' | 'OCR_File'>('Manual_Entry');
  
  const [formData, setFormData] = useState<FormDataState>({
    supplier: '',
    transaction_date: new Date().toISOString().slice(0, 16),
    vat_reg_tin: '',
    terms_id: '',
    payment_terms: undefined,  // ADDED
    date_paid: '',
    payment_status_id: '',
    total_amount: 0,
    vat_amount: 0,
    total_amount_due: 0,
    category_id: '',
    other_category: undefined,
    remarks: '',
    source_id: '',
    created_by: currentUser,
  });

  const [items, setItems] = useState<ReceiptItem[]>([{
    item_id: '',
    unit_id: '',
    item: {
      item_id: '',
      item_name: '',
      unit: '',
      category: '',
    },
    quantity: 0,
    unit_price: 0,
    total_price: 0,
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

  const computeSummaryCategory = useCallback((items: ReceiptItem[]): string => {
    if (items.length === 0) return '';
    
    const categoryTotals: Record<string, number> = {};
    
    items.forEach(item => {
      const resolvedCategory = item.item.category === 'Other' && item.item.other_category 
        ? item.item.other_category 
        : item.item.category;
      
      if (resolvedCategory && resolvedCategory.trim() !== '') {
        categoryTotals[resolvedCategory] = (categoryTotals[resolvedCategory] || 0) + item.total_price;
      }
    });

    const uniqueCategories = Object.keys(categoryTotals);
    
    if (uniqueCategories.length === 0) return '';
    if (uniqueCategories.length === 1) {
      const singleCategoryName = uniqueCategories[0];
      const category = categories.find(c => c.name === singleCategoryName);
      return category ? category.category_id : (categories.find(c => c.name === 'Other')?.category_id || '');
    }
    
    return categories.find(c => c.name === 'Multiple_Categories')?.category_id || '';
  }, [categories]); // Add categories as dependency since it's used inside the function

  const isCategoryEditable = (items: ReceiptItem[]) => {
    if (categoryOverride) return true;
    if (items.length === 0) return true;
    return false;
  };

  const getDisplayCategory = (categoryId: string, otherCategory?: string) => {
    const category = categories.find(c => c.category_id === categoryId);
    if (!category) return 'N/A';
    if (category.name === 'Other' && otherCategory) {
      return otherCategory;
    }
    return formatDisplayText(category.name);
  };

  useEffect(() => {
    if (!categoryOverride) {
      const summaryCategoryId = computeSummaryCategory(items);
      setFormData(prev => ({
        ...prev,
        category_id: summaryCategoryId,
        other_category: categories.find(c => c.category_id === summaryCategoryId)?.name === 'Other' ? otherCategory : undefined
      }));
    }
  }, [items, categoryOverride, otherCategory, categories, computeSummaryCategory]); // Add computeSummaryCategory to dependencies


  const handleItemChange = (index: number, field: string, value: string | number) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index] };

    if (field === 'quantity' || field === 'unit_price') {
      const numValue = Number(value);
      (item as unknown as Record<string, number>)[field] = numValue;
      item.total_price = item.quantity * item.unit_price;
    } else if (field === 'item_name') {
      item.item = {
        ...item.item,
        item_name: value as string
      };
    } else if (field === 'unit') {
      // value is the unit_id
      if (value === 'Other') {
        item.item.unit = 'Other';
        item.unit_id = '';
        item.item.other_unit = '';
      } else {
        const selectedUnit = itemUnits.find(u => u.id === value);
        if (selectedUnit) {
          item.item.unit = selectedUnit.name;
          item.unit_id = selectedUnit.id;
          item.item.other_unit = undefined;
        }
      }
    } else if (field === 'other_unit') {
      item.item.other_unit = value as string;
    } else if (field === 'category') {
      if (value === 'Other') {
        item.item.category = 'Other';
        item.item.other_category = '';
      } else {
        item.item.category = value as string;
        item.item.other_category = undefined;
      }
    } else if (field === 'other_category') {
      item.item.other_category = value as string;
    }

    updatedItems[index] = item;
    setItems(updatedItems);

    const newTotalAmount = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
    setFormData(prev => ({
      ...prev,
      total_amount: newTotalAmount,
      total_amount_due: newTotalAmount + (prev.vat_amount || 0),
      category_id: categoryOverride ? prev.category_id : computeSummaryCategory(updatedItems),
    }));

    if (
      index === items.length - 1 &&
      (item.item.item_name || item.item.unit || item.quantity > 0 || item.unit_price > 0)
    ) {
      setItems([...updatedItems, {
        item_id: '',
        unit_id: '',
        item: {
          item_id: '',
          item_name: '',
          unit: '',
          category: '',
        },
        quantity: 0,
        unit_price: 0,
        total_price: 0,
      }]);
    }
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const updatedItems = items.filter((_, idx) => idx !== index);
      setItems(updatedItems);

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

    const { supplier, transaction_date, payment_status_id, category_id, terms_id } = formData;

    if (!supplier || !transaction_date || !payment_status_id || !category_id || !terms_id) {
      Swal.fire('Error', 'Please fill in all required fields', 'error');
      return;
    }

    const validItems = items
    .filter((item, idx) => {
      // Exclude the last row if it's empty (all main fields blank/zero)
      const isLast = idx === items.length - 1;
      const isEmpty =
        !item.item.item_name &&
        !item.unit_id &&
        !item.item.unit &&
        (!item.quantity || item.quantity === 0) &&
        (!item.unit_price || item.unit_price === 0);
      return !isLast || !isEmpty;
    })
    .filter(item =>
      item.item.item_name &&
      item.unit_id &&
      item.item.unit &&
      item.quantity > 0 &&
      item.unit_price > 0
    );

    if (validItems.length === 0) {
      Swal.fire('Error', 'Please add at least one item', 'error');
      return;
    }

    const invalidItems = validItems.filter(item => 
      !item.item.category || 
      (item.item.category === 'Other' && !item.item.other_category)
    );

    if (invalidItems.length > 0) {
      Swal.fire('Error', 'Please specify a category for all items.', 'error');
      return;
    }

    // Check for missing unit_id
    const missingUnit = validItems.find(item => !item.unit_id);
    if (missingUnit) {
      Swal.fire('Error', 'Please select a valid unit for all items.', 'error');
      return;
    }

    const result = await Swal.fire({
      title: 'Confirm Add',
      text: 'Are you sure you want to add this receipt?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#961C1E',
      cancelButtonColor: '#FEB71F',
      reverseButtons: true,
      confirmButtonText: 'Yes, add it!',
      background: 'white',
    });

    if (result.isConfirmed) {
      try {
        const sourceId = sources.find(s => s.name === sourceOption)?.source_id;
        if (!sourceId) {
          throw new Error('Invalid source option selected');
        }

        const submitData: AddReceiptSubmitData = {
          ...formData,
          source_id: sourceId,
          items: validItems.map(item => ({
            item_name: item.item.item_name,
            unit_id: item.unit_id,
            unit: item.item.unit,
            other_unit: item.item.unit === 'Other' ? item.item.other_unit : undefined,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            category_id: (() => {
              // Find the category ID for this item's category
              if (item.item.category === 'Other' && item.item.other_category) {
                // For "Other" category, find the category with name "Other"
                const otherCategory = categories.find(c => c.name === 'Other');
                return otherCategory?.category_id || '';
              } else {
                // Find the category with matching name
                const category = categories.find(c => c.name === item.item.category);
                return category?.category_id || '';
              }
            })(),
            other_category: item.item.category === 'Other' ? item.item.other_category : undefined
          })),
          created_by: currentUser,
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

  const toggleCategoryOverride = () => {
    setCategoryOverride(!categoryOverride);
    if (!categoryOverride) {
      setFormData(prev => ({
        ...prev,
        category_id: prev.category_id || '', // Remove the default to Fuel
        other_category: categories.find(c => c.category_id === prev.category_id)?.name === 'Other' ? otherCategory : undefined
      }));
    } else {
      const summaryCategoryId = computeSummaryCategory(items);
      setFormData(prev => ({
        ...prev,
        category_id: summaryCategoryId,
        other_category: categories.find(c => c.category_id === summaryCategoryId)?.name === 'Other' ? otherCategory : undefined
      }));
    }
  };

  const handleOCRComplete = async (data: any) => {
    try {
      console.log('OCR Data received:', data);
      
      // Auto-fill form fields
      setFormData(prev => ({
        ...prev,
        supplier: data.supplier || prev.supplier,
        transaction_date: data.transaction_date ? 
          new Date(data.transaction_date).toISOString().slice(0, 16) : 
          prev.transaction_date,
        payment_terms: data.payment_terms || prev.payment_terms,  // FIXED: Now properly typed
        vat_reg_tin: data.vat_reg_tin || prev.vat_reg_tin,
        total_amount: data.total_amount || prev.total_amount,
        vat_amount: data.vat_amount || prev.vat_amount,
        total_amount_due: (data.total_amount || 0) + (data.vat_amount || 0),
      }));

      // Auto-fill items if available
      if (data.items && data.items.length > 0) {
        const newItems: ReceiptItem[] = await Promise.all(
          data.items.map(async (item: any) => {
            // Try to match unit
            let unitId = '';
            const matchedUnit = itemUnits.find(u => 
              u.name.toLowerCase().includes(item.unit?.toLowerCase() || '') ||
              item.unit?.toLowerCase().includes(u.name.toLowerCase())
            );
            if (matchedUnit) {
              unitId = matchedUnit.id;
            } else {
              // Default to 'Piece' if no match found
              const defaultUnit = itemUnits.find(u => u.name === 'Piece');
              unitId = defaultUnit?.id || '';
            }

            return {
              item_id: '',
              unit_id: unitId,
              item: {
                item_id: '',
                item_name: item.item_name || '',
                unit: matchedUnit?.name || 'Piece',
                category: item.category || 'Other',
              },
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              total_price: item.total_price || 0,
            };
          })
        );

        // Add empty row at the end for additional items
        newItems.push({
          item_id: '',
          unit_id: '',
          item: {
            item_id: '',
            item_name: '',
            unit: '',
            category: '',
          },
          quantity: 0,
          unit_price: 0,
          total_price: 0,
        });

        setItems(newItems);
      }

      // Auto-suggest form selections based on OCR data
      await autoSuggestSelections(data);

      // Show success message
      Swal.fire({
        title: 'OCR Complete!',
        text: 'Receipt data has been extracted and filled automatically. Please review and adjust as needed.',
        icon: 'success',
        timer: 3000,
        showConfirmButton: false
      });

    } catch (error) {
      console.error('Error processing OCR data:', error);
      Swal.fire('Error', 'Failed to process OCR data', 'error');
    }
  };

  const autoSuggestSelections = async (ocrData: any) => {
    try {
      // Auto-select payment status
      if (ocrData.total_amount > 0) {
        const paidStatus = paymentStatuses.find(ps => ps.name === 'Paid');
        if (paidStatus) {
          setFormData(prev => ({ ...prev, payment_status_id: paidStatus.id }));
        }
      }

      // ENHANCED: Auto-select terms based on OCR payment_terms
      let selectedTermsId = '';
      
      if (ocrData.payment_terms) {
        const termsText = ocrData.payment_terms.toLowerCase();
        console.log(`Processing OCR terms: '${termsText}'`); // FIXED: Use template literals instead of f-string
        
        // Try to match OCR terms with database terms
        if (termsText.includes('net') && termsText.includes('60')) {
          const net60Terms = terms.find(t => t.name.toLowerCase().includes('net') && t.name.toLowerCase().includes('60'));
          selectedTermsId = net60Terms?.id || '';
          console.log('Matched: Net 60');
        } else if (termsText.includes('net') && termsText.includes('30')) {
          const net30Terms = terms.find(t => t.name.toLowerCase().includes('net') && t.name.toLowerCase().includes('30'));
          selectedTermsId = net30Terms?.id || '';
          console.log('Matched: Net 30');
        } else if (termsText.includes('net') && termsText.includes('15')) {
          const net15Terms = terms.find(t => t.name.toLowerCase().includes('net') && t.name.toLowerCase().includes('15'));
          selectedTermsId = net15Terms?.id || '';
          console.log('Matched: Net 15');
        } else if (termsText.includes('net') && termsText.includes('7')) {
          const net7Terms = terms.find(t => t.name.toLowerCase().includes('net') && t.name.toLowerCase().includes('7'));
          selectedTermsId = net7Terms?.id || '';
          console.log('Matched: Net 7');
        } else if (termsText.includes('net') && termsText.includes('90')) {
          const net90Terms = terms.find(t => t.name.toLowerCase().includes('net') && t.name.toLowerCase().includes('90'));
          selectedTermsId = net90Terms?.id || '';
          console.log('Matched: Net 90');
        } else if (termsText.includes('cash')) {
          const cashTerms = terms.find(t => t.name.toLowerCase().includes('cash'));
          selectedTermsId = cashTerms?.id || '';
          console.log('Matched: Cash');
        }
      }
      
      // DEFAULT: Fallback to Cash if no valid match found or no terms extracted
      if (!selectedTermsId) {
        const cashTerms = terms.find(t => t.name.toLowerCase() === 'cash');
        selectedTermsId = cashTerms?.id || terms[0]?.id || '';
        console.log('Defaulted to: Cash');
      }
      
      if (selectedTermsId) {
        setFormData(prev => ({ ...prev, terms_id: selectedTermsId }));
      }

      // Rest of the function remains the same...
    } catch (error) {
      console.error('Error auto-suggesting selections:', error);
    }
  };

  const handleOCRError = (error: string) => {
    Swal.fire('OCR Error', error, 'error');
  };

  return (
    <div className="modalOverlay">
      <div className="receiptModal">
        <div className="modalHeader">
          <h1>Add Receipt</h1>
          <div className="timeDate">
            <div className="currTime">{currentTime}</div>
            <div className="currDate">{currentDate}</div>
          </div>
          <button type="button" className="closeButton" onClick={onClose}>
            <i className="ri-close-line"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="addReceipt_modalContent">
            <div className="source-selection">
              <div 
                className={`source-option ${sourceOption === 'Manual_Entry' ? 'active' : ''}`}
                onClick={() => setSourceOption('Manual_Entry')}
              >
                <i className="ri-edit-line"></i>
                <p>Manual Entry</p>
              </div>
              <div 
                className={`source-option ${sourceOption === 'OCR_Camera' ? 'active' : ''}`}
                onClick={() => setSourceOption('OCR_Camera')}
              >
                <i className="ri-camera-line"></i>
                <p>Camera Scan</p> 
              </div>
              <div 
                 className={`source-option ${sourceOption === 'OCR_File' ? 'active' : ''}`}
                 onClick={() => setSourceOption('OCR_File')}
              >
                <i className="ri-upload-line"></i>
                <p>File Upload</p> 
              </div>
            </div>

            {sourceOption === 'OCR_File' && (
              <div>
                <OCRUpload 
                  onOCRComplete={handleOCRComplete}
                  onError={handleOCRError}
                />
              </div>
            )}
            {sourceOption === 'OCR_Camera' && (
              <div>
                <OCRCamera 
                  onOCRComplete={handleOCRComplete}
                  onError={handleOCRError}
                />
              </div>
            )}

            <div className="formFieldsHorizontal">
              <div className="formInputs">
                <div className="formRow">
                  <div className="formField">
                    <label htmlFor="supplier">Supplier<span className='requiredTags'> *</span></label>
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
                      <label htmlFor="category_id">Category<span className='requiredTags'> *</span></label>
                      {isCategoryEditable(items) ? (
                        !isOtherCategory ? (
                          <div className="categoryField">
                            <select
                              id="category_id"
                              name="category_id"
                              value={formData.category_id}
                              onChange={(e) => {
                                const cat = categories.find(c => c.category_id === e.target.value);
                                if (cat?.name === 'Other') {
                                  setIsOtherCategory(true);
                                }
                                handleInputChange(e);
                              }}
                              required
                              className="formSelect"
                            >
                              <option value="">Select Category</option>
                              {categories.map(cat => (
                                <option key={cat.category_id} value={cat.category_id}>{formatDisplayText(cat.name)}</option>
                              ))}
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
                                  category_id: ''
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
                            value={formatDisplayText(getDisplayCategory(formData.category_id, formData.other_category))}
                            readOnly
                            className="formInput"
                          />
                          <div className="categoryTooltip">
                            <i className="ri-information-line" />
                            <span className="tooltipText">
                              {categories.find(c => c.category_id === formData.category_id)?.name === 'Multiple_Categories' 
                                ? "Multiple categories detected. Click lock to override."
                                : "Category determined by items. Click lock to override."}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                </div>

                <div className="formRow">
                <div className="formField">
                  <label htmlFor="transaction_date">Transaction Date & Time<span className='requiredTags'> *</span></label>
                  <input
                    type="datetime-local"
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
                      disabled={paymentStatuses.find(ps => ps.id === formData.payment_status_id)?.name === 'Cancelled' || paymentStatuses.find(ps => ps.id === formData.payment_status_id)?.name === 'Pending'}
                      className="formInput"
                      max={new Date().toISOString().split('T')[0]}
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
                    
                    {/* ADDED: Display extracted payment terms for reference */}
                    {formData.payment_terms && (
                      <div className="formField">
                        <label>Extracted Terms (Reference)</label>
                        <input
                          type="text"
                          value={formData.payment_terms}
                          readOnly
                          className="formInput"
                          style={{ backgroundColor: '#f5f5f5', fontStyle: 'italic' }}
                          title="Terms extracted from OCR - use this to help select the correct terms below"
                        />
                      </div>
                    )}
                    
                    <div className="formField">
                      <label htmlFor="terms_id">Terms<span className='requiredTags'> *</span></label>
                      <select
                        id="terms_id"
                        name="terms_id"
                        value={formData.terms_id}
                        onChange={handleInputChange}
                        required
                        className="formSelect"
                      >
                        <option value="">Select Terms</option>
                        {terms.map(term => (
                          <option key={term.id} value={term.id}>{formatDisplayText(term.name)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                <div className="formRow">
                  <div className="formField">
                    <label htmlFor="payment_status_id">Payment Status<span className='requiredTags'> *</span></label>
                    <select
                      id="payment_status_id"
                      name="payment_status_id"
                      value={formData.payment_status_id}
                      onChange={handleInputChange}
                      required
                      className="formSelect"
                    >
                      <option value="">Select Payment Status</option>
                      {paymentStatuses.map(ps => (
                        <option key={ps.id} value={ps.id}>{formatDisplayText(ps.name)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="formField">
                    <label htmlFor="vat_amount">VAT Amount</label>
                    <input
                      type="number"
                      id="vat_amount"
                      name="vat_amount"
                      value={formData.vat_amount || ''}
                      onChange={handleInputChange}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className="formInput"
                    />
                  </div>
                </div>

                <div className="formField" id="formField_remarks">
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



                <div className="add_itemsSection">
                  <h3>Items</h3>
                  <table className="itemTable">
                    <thead className='itemTable'>
                      <tr>
                        <th>Item Name<span className='requiredTags'> *</span></th>
                        <th>Unit<span className='requiredTags'> *</span></th>
                        <th>Quantity<span className='requiredTags'> *</span></th>
                        <th>Unit Price<span className='requiredTags'> *</span></th>
                        <th>Total Price</th>
                        <th>Category<span className='requiredTags'> *</span></th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        // Check if the previous row is complete
                        const prevComplete =
                          idx === 0 ||
                          (
                            items[idx - 1].item.item_name &&
                            (items[idx - 1].unit_id || items[idx - 1].item.unit === 'Other') &&
                            (items[idx - 1].item.unit !== 'Other' || items[idx - 1].item.other_unit) &&
                            items[idx - 1].quantity > 0 &&
                            items[idx - 1].unit_price > 0 &&
                            items[idx - 1].item.category &&
                            (items[idx - 1].item.category !== 'Other' || items[idx - 1].item.other_category)
                          );

                        // If previous row is not complete, disable this row
                        const disabled = !prevComplete;

                        const isLast = idx === items.length - 1;
                        return (
                          <tr key={idx}>
                            <td>
                              <input
                                type="text"
                                value={item.item.item_name}
                                onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                                placeholder="Enter item name"
                                {...(!isLast && { required: true })}
                                disabled={disabled}
                              />
                            </td>
                            <td>
                              {item.item.unit === 'Other' ? (
                                <div className="customInputWrapper">
                                  <input
                                    type="text"
                                    value={item.item.other_unit || ''}
                                    onChange={(e) => handleItemChange(idx, 'other_unit', e.target.value)}
                                    placeholder="Enter custom unit"
                                    {...(!isLast && { required: true })}
                                    disabled={disabled}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedItems = [...items];
                                      const item = { ...updatedItems[idx] };
                                      item.item.unit = '';
                                      item.unit_id = '';
                                      updatedItems[idx] = item;
                                      setItems(updatedItems);
                                    }}
                                    className="clearCustomBtn"
                                    title="Clear custom unit"
                                    disabled={disabled}
                                  >
                                    <i className="ri-close-line" />
                                  </button>
                                </div>
                              ) : (
                                <select
                                  value={item.unit_id || ''}
                                  onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                                  className="formSelect"
                                  {...(!isLast && { required: true })}
                                  disabled={disabled}
                                >
                                  <option value="">Select Unit</option>
                                  {itemUnits.map(unit => (
                                    <option key={unit.id} value={unit.id}>{unit.name}</option>
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
                                {...(!isLast && { required: true })}
                                disabled={disabled}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.unit_price || ''}
                                onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                                min="0"
                                step="0.01"
                                {...(!isLast && { required: true })}
                                disabled={disabled}
                              />
                            </td>
                            <td>₱{item.total_price.toLocaleString()}</td>
                            <td>
                              {item.item.category === 'Other' ? (
                                <div className="customInputWrapper">
                                  <input
                                    type="text"
                                    value={item.item.other_category || ''}
                                    onChange={(e) => handleItemChange(idx, 'other_category', e.target.value)}
                                    placeholder="Enter custom category"
                                    {...(!isLast && { required: true })}
                                    disabled={disabled}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleItemChange(idx, 'category', '')}
                                    className="clearCustomBtn"
                                    title="Clear custom category"
                                    disabled={disabled}
                                  >
                                    <i className="ri-close-line" />
                                  </button>
                                </div>
                              ) : (
                                <select
                                  value={item.item.category}
                                  onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                                  className="formSelect"
                                  {...(!isLast && { required: true })}
                                  disabled={disabled}
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
                                title="Remove item"
                                disabled={disabled}
                              >
                                <i className="ri-delete-bin-line" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
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