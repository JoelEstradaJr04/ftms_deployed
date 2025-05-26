'use client';

import React from 'react';
import { formatDate } from '../utility/dateFormatter';
import '../styles/viewExpense.css';

type ReceiptItem = {
  receipt_item_id: string;
  item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type Receipt = {
  receipt_id: string;
  supplier: string;
  transaction_date: string;
  vat_reg_tin?: string;
  terms?: string;
  date_paid?: string;
  status: string;
  total_amount: number;
  vat_amount?: number;
  total_amount_due: number;
  items: ReceiptItem[];
};

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

  const renderReceiptDetails = () => {
    if (!record.receipt) return null;
    return (
      <div className="receiptDetails">
        <h3>Receipt Details</h3>
        <div className="detailRow">
          <span className="label">Supplier:</span>
          <span className="value">{record.receipt.supplier}</span>
        </div>
        <div className="detailRow">
          <span className="label">Transaction Date:</span>
          <span className="value">{formatDate(record.receipt.transaction_date)}</span>
        </div>
        <div className="detailRow">
          <span className="label">VAT Reg TIN:</span>
          <span className="value">{record.receipt.vat_reg_tin || 'N/A'}</span>
        </div>
        <div className="detailRow">
          <span className="label">Terms:</span>
          <span className="value">{record.receipt.terms || 'N/A'}</span>
        </div>
        <div className="detailRow">
          <span className="label">Date Paid:</span>
          <span className="value">{record.receipt.date_paid ? formatDate(record.receipt.date_paid) : 'N/A'}</span>
        </div>
        <div className="detailRow">
          <span className="label">Status:</span>
          <span className="value">{record.receipt.status}</span>
        </div>
        <div className="detailRow">
          <span className="label">Total Amount:</span>
          <span className="value">₱{Number(record.receipt.total_amount).toLocaleString()}</span>
        </div>
        <div className="detailRow">
          <span className="label">VAT Amount:</span>
          <span className="value">₱{record.receipt.vat_amount ? Number(record.receipt.vat_amount).toLocaleString() : 'N/A'}</span>
        </div>
        <div className="detailRow">
          <span className="label">Total Amount Due:</span>
          <span className="value">₱{Number(record.receipt.total_amount_due).toLocaleString()}</span>
        </div>

        {record.receipt.items && record.receipt.items.length > 0 && (
          <div className="itemsSection">
            <h4>Items</h4>
            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Unit</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total Price</th>
                </tr>
              </thead>
              <tbody>
                {record.receipt.items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.item_name}</td>
                    <td>{item.unit}</td>
                    <td>{Number(item.quantity).toLocaleString()}</td>
                    <td>₱{Number(item.unit_price).toLocaleString()}</td>
                    <td>₱{Number(item.total_price).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
              {record.category === 'Other' ? record.other_category || 'Other' : record.category.replace('_', ' ')}
            </span>
          </div>
          <div className="detailRow">
            <span className="label">Amount:</span>
            <span className="value">₱{record.total_amount.toLocaleString()}</span>
          </div>
          <div className="detailRow">
            <span className="label">Date:</span>
            <span className="value">{formatDate(record.expense_date)}</span>
          </div>
        </div>

        {record.assignment && renderOperationsDetails()}
        {record.receipt && renderReceiptDetails()}
        {!record.assignment && !record.receipt && (
          <div className="otherDetails">
            <h3>Other Expense Details</h3>
            <div className="detailRow">
              <span className="label">Source Description:</span>
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
