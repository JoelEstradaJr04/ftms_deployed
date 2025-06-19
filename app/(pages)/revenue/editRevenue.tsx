// app\Components\editRevenue.tsx
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import "../../styles/editRevenue.css";
import { getAssignmentById } from '@/lib/supabase/assignments';
import { formatDate } from '../../utility/dateFormatter';
import { validateField, ValidationRule, isValidAmount } from "../../utility/validation";

type EditProps = {
  record: {
    revenue_id: string;
    collection_date: string;
    category: string;
    source: string;
    amount: number;
    assignment_id?: string;
    other_source?: string;
  };
  onClose: () => void;
  onSave: (updatedRecord: {
    revenue_id: string;
    collection_date: string;
    total_amount: number;
    other_source?: string;
  }) => void;
};

const EditRevenueModal: React.FC<EditProps> = ({ record, onClose, onSave }) => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [collection_date, setDate] = useState(record.collection_date);
  const today = new Date().toISOString().split('T')[0];
  const [amount, setAmount] = useState(record.amount);
  const [otherSource, setOtherSource] = useState(record.other_source || '');
  const [originalTripRevenue, setOriginalTripRevenue] = useState<number | null>(null);
  const [deviationPercentage, setDeviationPercentage] = useState<number>(0);
  const [showDeviationWarning, setShowDeviationWarning] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({
    amount: [],
    other_source: [],
    collection_date: []
  });

  // Add validation rules
  const validationRules: Record<string, ValidationRule> = {
    amount: { 
      required: true, 
      min: 0.01, 
      label: "Amount",
      custom: (v: number) => isValidAmount(Number(v)) ? null : "Amount must be greater than 0"
    },
    other_source: { 
      required: record.category === 'Other', 
      label: "Source Detail",
      minLength: 2,
      maxLength: 50
    },
    collection_date: { required: true, label: "Collection Date" }
  };

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

  useEffect(() => {
    const fetchAssignmentData = async () => {
      if (record.assignment_id) {
        try {
          const assignmentData = await getAssignmentById(record.assignment_id);
          if (assignmentData?.trip_revenue) {
            setOriginalTripRevenue(assignmentData.trip_revenue);
            // Calculate initial deviation
            const deviation = Math.abs((record.amount - assignmentData.trip_revenue) / assignmentData.trip_revenue * 100);
            setDeviationPercentage(deviation);
            setShowDeviationWarning(deviation > 10);
          }
        } catch (error) {
          console.error('Error fetching assignment data:', error);
        }
      }
    };

    fetchAssignmentData();
  }, [record.assignment_id, record.amount]);

  const validateAmount = (value: number): string => {
    if (!value || value === 0 || isNaN(value)) {
      return 'Amount is required and must be greater than 0.';
    }
    if (value < 0.01) {
      return 'Amount must be at least 0.01.';
    }
    return '';
  };

  const handleAmountChange = (newAmount: number) => {
    if (!newAmount && newAmount !== 0) {
      setErrors(prev => ({
        ...prev,
        amount: ['Amount is required.']
      }));
      setAmount(0);
      return;
    }

    setAmount(newAmount);
    setErrors(prev => ({
      ...prev,
      amount: validateField(newAmount, validationRules.amount)
    }));

    if (originalTripRevenue) {
      const deviation = Math.abs((newAmount - originalTripRevenue) / originalTripRevenue * 100);
      setDeviationPercentage(deviation);
      setShowDeviationWarning(deviation > 10);
    }
  };

  const handleSave = async () => {
    // Validate all fields
    const newErrors: Record<string, string[]> = {};
    Object.keys(validationRules).forEach(fieldName => {
      const value = fieldName === 'amount' ? amount :
                    fieldName === 'collection_date' ? collection_date :
                    fieldName === 'other_source' ? otherSource : '';
      newErrors[fieldName] = validateField(value, validationRules[fieldName]);
    });

    setErrors(newErrors);

    // Check if there are any errors
    const hasErrors = Object.values(newErrors).some(fieldErrors => fieldErrors.length > 0);
    if (hasErrors) {
      await Swal.fire({
        title: 'Validation Error',
        text: 'Please correct all errors before saving',
        icon: 'error',
        confirmButtonColor: '#961C1E',
        background: 'white',
      });
      return;
    }

    let confirmMessage = 'Do you want to save the changes to this record?';
    if (showDeviationWarning) {
      confirmMessage = `Warning: The amount deviates by ${deviationPercentage.toFixed(2)}% from the original trip revenue. Do you want to proceed?`;
    }

    const result = await Swal.fire({
      title: 'Save Changes?',
      text: confirmMessage,
      icon: showDeviationWarning ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#961C1E',
      confirmButtonText: 'Yes, save it!',
      cancelButtonText: 'Cancel',
      background: 'white',
    });

    if (result.isConfirmed) {
      onSave({
        revenue_id: record.revenue_id,
        collection_date,
        total_amount: amount,
        other_source: record.category === 'Other' ? otherSource : undefined
      });
    }
  };

  return (
    <div className="modalOverlay">
      <div className="editRevenueModal">
        {/* Close Button */}
        <button type="button" className="closeButton" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>

        <div className="modalHeader">
          <h1>Edit Revenue</h1>
          <div className="timeDate">
            <div className="currTime">{currentTime}</div>
            <div className="currDate">{currentDate}</div>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="modalContent">
            <div className="formFieldsHorizontal">
              <div className="formInputs">

                <div className="formRow">
                  {/* CATEGORY */}
                  <div className="formField">
                    <label htmlFor="category">Category<span className='requiredTags'> *</span></label>
                    <input
                      type="text"
                      id="category"
                      name="category"
                      value={record.category === 'Other' ? record.other_source || 'Other' : record.category}
                      readOnly
                      className="formInput"
                    />
                  </div>

                  {/* SOURCE */}
                  <div className="formField">
                    <label htmlFor="source">Source<span className='requiredTags'> *</span></label>
                    <input
                      type="text"
                      id="source"
                      name="source"
                      value={record.source}
                      readOnly
                      className="formInput"
                    />
                  </div>
                </div>

                <div className="formRow">
                  {/* COLLECTION DATE */}
                  <div className="formField">
                    <label htmlFor="collection_date">Collection Date <span className='requiredTags'> *</span></label>
                    <input
                      type="date"
                      id="collection_date"
                      name="collection_date"
                      value={collection_date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="formInput"
                      max={today}
                    />
                  </div>

                  {/* AMOUNT */}
                  <div className="formField">
                    <label htmlFor="amount">Amount<span className='requiredTags'> *</span></label>
                    <input
                      type="number"
                      id="amount"
                      name="amount"
                      value={amount}
                      onChange={(e) => handleAmountChange(parseFloat(e.target.value))}
                      min="0"
                      step="0.01"
                      required
                      className={`formInput${errors.amount?.length ? ' input-error' : ''}`}
                    />
                    {errors.amount?.map((msg, i) => (
                      <div key={i} className="error-message">{msg}</div>
                    ))}
                  </div>
                </div>

                {/* Original Trip Revenue Section - Moved below the form fields */}
                {originalTripRevenue !== null && (
                  <div className="originalRevenueSection">
                    <div className="originalRevenueBox">
                      <span className="originalRevenueLabel">Original Trip Revenue:</span>
                      <span className="originalRevenueAmount">₱{originalTripRevenue.toLocaleString()}</span>
                      {showDeviationWarning && (
                        <div className="deviationWarning">
                          Deviation: {deviationPercentage.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {record.category === 'Other' && (
                  <div className="formRow">
                    <div className="formField">
                      <label htmlFor="other_source">Source Detail<span className='requiredTags'> *</span></label>
                      <input
                        type="text"
                        id="other_source"
                        name="other_source"
                        value={otherSource}
                        onChange={(e) => {
                          setOtherSource(e.target.value);
                          setErrors(prev => ({
                            ...prev,
                            other_source: validateField(e.target.value, validationRules.other_source)
                          }));
                        }}
                        placeholder="Specify source"
                        required
                        className={`formInput${errors.other_source?.length ? ' input-error' : ''}`}
                      />
                      {errors.other_source?.map((msg, i) => (
                        <div key={i} className="error-message">{msg}</div>
                      ))}
                    </div>
                    <div className="formField">
                      {/* Empty field for spacing */}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          <div className="modalButtons">
            <button type="button" onClick={onClose} className="cancelButton">
              <i className="ri-close-line" /> Cancel
            </button>
            <button type="submit" className="saveButton">
              <i className="ri-save-line" /> Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRevenueModal;