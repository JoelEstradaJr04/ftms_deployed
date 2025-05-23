import React from 'react';
import '../styles/confirmationModal.css';

type ConfirmationModalProps = {
  isOpen: boolean;
  action?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  action = "ADD",
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="confirmationOverlay">
      <div className="confirmationModal">
        <div className="confirmationHeader">
          <h2>Confirmation</h2>
        </div>
        
        <div className="confirmationContent">
          <div className="confirmationMessage">
            Are you sure you want to {action} this record?
          </div>
        </div>
        
        <div className="confirmationButtons">
          <button 
            type="button" 
            className="confirmButton" 
            onClick={onConfirm}
          >
            Confirm
          </button>
          <button 
            type="button" 
            className="cancelButton" 
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;