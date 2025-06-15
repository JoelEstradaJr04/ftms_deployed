// app/Components/viewExpense.tsx
'use client';
import React from 'react';
import { formatDate } from '../utility/dateFormatter';
import '../styles/viewExpense.css';
import ViewReceiptModal from '../(pages)/receipt/viewReceipt';
import { formatDisplayText } from '../utils/formatting';

type Assignment = {
  assignment_id: string;
  bus_bodynumber: string;
  bus_platenumber: string;
  bus_route: string;
  bus_type: string;
  driver_name: string;
  conductor_name: string;
  date_assigned: string;
  trip_fuel_expense: number;
};

type ReceiptItem = {
  receipt_item_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  ocr_confidence?: number;
  item: {
    item_id: string;
    item_name: string;
    unit: string;
    category: string;
    other_unit?: string;
    other_category?: string;
  };
};

type Receipt = {
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
  created_at: string;
  updated_at?: string;
  created_by: string;
  updated_by?: string;
  source: 'Manual_Entry' | 'OCR_Camera' | 'OCR_File';
  category: 'Fuel' | 'Vehicle_Parts' | 'Tools' | 'Equipment' | 'Supplies' | 'Other' | 'Multiple_Categories';
  other_category?: string;
  remarks?: string;
  ocr_confidence?: number;
  ocr_file_path?: string;
  items: ReceiptItem[];
};

type ViewExpenseModalProps = {
  record: {
    expense_id: string;
    category: string;
    other_category?: string;
    total_amount: number;
    expense_date: string;
    assignment?: Assignment;
    receipt?: Receipt;
    other_source?: string;
  };
  onClose: () => void;
};

const ViewExpenseModal: React.FC<ViewExpenseModalProps> = ({ record, onClose }) => {
  // If the record has a receipt, use the ViewReceiptModal
  if (record.receipt) {
    // Ensure all receipt data is properly structured for ViewReceiptModal
    const receiptData: Receipt = {
      ...record.receipt,
      // Ensure items have the complete structure expected by ViewReceiptModal
      items: record.receipt.items.map(item => ({
        ...item,
        item: {
          ...item.item,
          // Provide fallbacks for required fields
          item_name: item.item?.item_name || '',
          unit: item.item?.unit || '',
          category: item.item?.category || '',
          other_unit: item.item?.other_unit || '',
          other_category: item.item?.other_category || ''
        }
      }))
    };
    
    // Pass the complete receipt data to ViewReceiptModal
    return <ViewReceiptModal record={receiptData} onClose={onClose} />;
  }

  const renderOperationsDetails = () => {
    if (!record.assignment) return null;

    return (
      <div className="operationsDetails">
        <h3>Operations Details</h3>
        <div className="detailRow">
          <span className="label">Bus Body Number:</span>
          <span className="value">{record.assignment.bus_bodynumber}</span>
        </div>
        <div className="detailRow">
          <span className="label">Bus Plate Number:</span>
          <span className="value">{record.assignment.bus_platenumber}</span>
        </div>
        <div className="detailRow">
          <span className="label">Bus Route:</span>
          <span className="value">{record.assignment.bus_route}</span>
        </div>
        <div className="detailRow">
          <span className="label">Bus Type:</span>
          <span className="value">{record.assignment.bus_type}</span>
        </div>
        <div className="detailRow">
          <span className="label">Driver:</span>
          <span className="value">{record.assignment.driver_name}</span>
        </div>
        <div className="detailRow">
          <span className="label">Conductor:</span>
          <span className="value">{record.assignment.conductor_name}</span>
        </div>
        <div className="detailRow">
          <span className="label">Date Assigned:</span>
          <span className="value">{formatDate(record.assignment.date_assigned)}</span>
        </div>
        <div className="detailRow">
          <span className="label">Trip Fuel Expense:</span>
          <span className="value">₱{record.assignment.trip_fuel_expense.toLocaleString()}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="modalOverlay">
      <div className="modalContent">
        <div className="modalHeader">
          <h2>View Expense</h2>
          <button className="closeButton" onClick={onClose}>&times;</button>
        </div>
        
        <div className="mainDetails">
          <div className="detailRow">
            <span className="label">Category:</span>
            <span className="value">
              {record.category === 'Other' ? record.other_category || 'Other' : formatDisplayText(record.category)}
            </span>
          </div>
          <div className="detailRow">
            <span className="label">Amount:</span>
            <span className="value">₱{Number(record.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="detailRow">
            <span className="label">Date:</span>
            <span className="value">{formatDate(record.expense_date)}</span>
          </div>
        </div>

        {record.assignment && renderOperationsDetails()}

        {!record.assignment && !record.receipt && (
          <div className="otherDetails">
            <h3>Expense Source Details</h3>
            <div className="detailRow">
              <span className="value">{record.other_source || 'N/A'}</span>
            </div>
          </div>
        )}

        <div className="modalFooter">
          <button className="closeBtn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ViewExpenseModal;