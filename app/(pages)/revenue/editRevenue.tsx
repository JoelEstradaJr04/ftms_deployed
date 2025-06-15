import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import "../../styles/editRevenue.css";
import { getAssignmentById } from '@/lib/supabase/assignments';
import { formatDate } from '../../utility/dateFormatter';

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
  const [amount, setAmount] = useState(record.amount);
  const [otherSource, setOtherSource] = useState(record.other_source || '');
  const [originalTripRevenue, setOriginalTripRevenue] = useState<number | null>(null);
  const [deviationPercentage, setDeviationPercentage] = useState<number>(0);
  const [showDeviationWarning, setShowDeviationWarning] = useState(false);

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

  const handleAmountChange = (newAmount: number) => {
    setAmount(newAmount);
    if (originalTripRevenue) {
      const deviation = Math.abs((newAmount - originalTripRevenue) / originalTripRevenue * 100);
      setDeviationPercentage(deviation);
      setShowDeviationWarning(deviation > 10);
    }
  };

  const handleSave = async () => {
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
                    <label htmlFor="category">Category</label>
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
                    <label htmlFor="source">Source</label>
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
                    <label htmlFor="collection_date">Collection Date</label>
                    <input
                      type="date"
                      id="collection_date"
                      name="collection_date"
                      value={collection_date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="formInput"
                    />
                  </div>

                  {/* AMOUNT */}
                  <div className="formField">
                    <label htmlFor="amount">Amount</label>
                    <input
                      type="number"
                      id="amount"
                      name="amount"
                      value={amount}
                      onChange={(e) => handleAmountChange(parseFloat(e.target.value))}
                      min="0"
                      step="0.01"
                      required
                      className="formInput"
                    />
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
                      <label htmlFor="other_source">Source Detail</label>
                      <input
                        type="text"
                        id="other_source"
                        name="other_source"
                        value={otherSource}
                        onChange={(e) => setOtherSource(e.target.value)}
                        placeholder="Specify source"
                        className="formInput"
                      />
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