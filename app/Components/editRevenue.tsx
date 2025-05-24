import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import "../styles/editRevenue.css";
import { getAssignmentById } from '@/lib/supabase/assignments';
import { formatDate } from '../utility/dateFormatter';

type EditProps = {
  record: {
    revenue_id: string;
    date: string;
    category: string;
    source: string;
    amount: number;
    assignment_id?: string;
    other_source?: string;
  };
  onClose: () => void;
  onSave: (updatedRecord: {
    revenue_id: string;
    date: string;
    total_amount: number;
    other_source?: string;
  }) => void;
};

const EditRevenueModal: React.FC<EditProps> = ({ record, onClose, onSave }) => {
  const [date, setDate] = useState(record.date);
  const [amount, setAmount] = useState(record.amount);
  const [otherSource, setOtherSource] = useState(record.other_source || '');
  const [originalTripRevenue, setOriginalTripRevenue] = useState<number | null>(null);
  const [deviationPercentage, setDeviationPercentage] = useState<number>(0);
  const [showDeviationWarning, setShowDeviationWarning] = useState(false);

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
        date,
        total_amount: amount,
        other_source: record.category === 'Other' ? otherSource : undefined
      });
    }
  };

  return (
    <div className="modalOverlay">
      <div className="modalContent">
        <div className="modalHeader">
          <h2>Edit Revenue</h2>
          <p><strong>Category:</strong> {record.category}</p>
          <p><strong>Collection Date:</strong> {formatDate(record.date)}</p>
        </div>

        <div className="formGroup">
          <label>Collection Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {record.category === 'Other' && (
          <div className="formGroup">
            <label>Source</label>
            <input
              type="text"
              value={otherSource}
              onChange={(e) => setOtherSource(e.target.value)}
              placeholder="Specify source"
            />
          </div>
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
            {originalTripRevenue !== null && (
              <div className="tripRevenueReference">
                Original Trip Revenue: ₱{originalTripRevenue.toLocaleString()}
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

export default EditRevenueModal;
