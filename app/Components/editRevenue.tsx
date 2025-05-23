import React from "react";
import Swal from "sweetalert2";
import "../styles/editRevenue.css";

type EditProps = {
  record: {
    id: number;
    date: string;
    category: string;
    source: string;
    amount: number;
  };
  onClose: () => void;
  onSave: (updatedRecord: any) => void;
};

const EditRevenueModal: React.FC<EditProps> = ({ record, onClose, onSave }) => {
  const [category, setCategory] = React.useState(record.category);
  const [source, setSource] = React.useState(record.source);
  const [amount, setAmount] = React.useState(record.amount);

  const handleSave = async () => {
    const result = await Swal.fire({
      title: 'Save Changes?',
      text: 'Do you want to save the changes to this record?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#961C1E',
      confirmButtonText: 'Yes, save it!',
      cancelButtonText: 'Cancel',
      background: 'white',
    });

    if (result.isConfirmed) {
      onSave({ ...record, category, source, amount });

      await Swal.fire({
        icon: 'success',
        title: 'Saved!',
        text: 'The record has been updated.',
        confirmButtonColor: '#961C1E',
        background: 'white',
      });
    }
  };

  return (
    <div className="modalOverlay">
      <div className="modalContent">
        <div className="modalHeader">
          <h2>Edit Revenue</h2>
          <p><strong>Date:</strong> {record.date}</p>
        </div>

        <div className="row">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="Boundary">Boundary</option>
            <option value="Percentage">Percentage</option>
            <option value="Other">Other</option>
          </select>
        </div>

        
        <div className="editRevenue_row">
          <input
            type="text"
            placeholder="Source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />

          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
          />
        </div>
        

        <div className="modalButtons">
          <div className="buttonContainer">
            <button onClick={onClose} className="cancelBtn">Cancel</button>
            <button onClick={handleSave} className="saveBtn">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditRevenueModal;
