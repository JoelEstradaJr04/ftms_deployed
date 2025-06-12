 'use client';

import React from 'react';
import { formatDate } from '../../utility/dateFormatter';
import '../../styles/viewReceipt.css';

type ReceiptItem = {
  receipt_item_id: string;
  item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  ocr_confidence?: number;
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
  category: string;
  other_category?: string;
  remarks?: string;
  ocr_confidence?: number;
  ocr_file_path?: string;
  items: ReceiptItem[];
};

type ViewReceiptModalProps = {
  record: Receipt;
  onClose: () => void;
};

const ViewReceiptModal: React.FC<ViewReceiptModalProps> = ({ record, onClose }) => {
  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'statusBadge paid';
      case 'pending': return 'statusBadge pending';
      case 'cancelled': return 'statusBadge cancelled';
      case 'dued': return 'statusBadge dued';
      default: return 'statusBadge';
    }
  };

  const getOcrConfidenceClass = (confidence: number) => {
    if (confidence >= 0.9) return 'ocrConfidence high';
    if (confidence >= 0.7) return 'ocrConfidence medium';
    return 'ocrConfidence low';
  };

  const renderOcrConfidence = (confidence?: number) => {
    if (confidence === undefined) return null;
    const percentage = (confidence * 100).toFixed(1);
    return (
      <span className={getOcrConfidenceClass(confidence)}>
        <i className="ri-eye-line" />
        {percentage}% Confidence
      </span>
    );
  };

    return (
      <div className="viewReceipt__modalOverlay">
        <div className="viewReceipt__modalContent">
          <div className="viewReceipt__modalHeader">
            <h2>View Receipt</h2>
            <button className="closeButton" onClick={onClose}>&times;</button>
          </div>

          <div className="mainDetails">
            <div className="detailRow">
              <span className="label">Supplier:</span>
              <span className="value">{record.supplier}</span>
            </div>
            <div className="detailRow">
              <span className="label">Category:</span>
              <span className="value">
                {record.category === 'Other' 
                  ? record.other_category 
                  : record.category.replace('_', ' ')}
              </span>
            </div>
            <div className="detailRow">
              <span className="label">Status:</span>
              <span className={getStatusBadgeClass(record.payment_status)}>
                {record.payment_status}
              </span>
            </div>
          </div>

        <div className="receiptDetails">
          <h3>Receipt Details</h3>
          <div className="detailRow">
            <span className="label">Transaction Date:</span>
            <span className="value">{formatDate(record.transaction_date)}</span>
          </div>
          <div className="detailRow">
            <span className="label">VAT Reg TIN:</span>
            <span className="value">{record.vat_reg_tin || 'N/A'}</span>
          </div>
          <div className="detailRow">
            <span className="label">Terms:</span>
            <span className="value">{record.terms || 'N/A'}</span>
          </div>
          <div className="detailRow">
            <span className="label">Date Paid:</span>
            <span className="value">{record.date_paid ? formatDate(record.date_paid) : 'N/A'}</span>
          </div>
          <div className="detailRow">
            <span className="label">Total Amount:</span>
            <span className="value">₱{Number(record.total_amount).toLocaleString()}</span>
          </div>
          <div className="detailRow">
            <span className="label">VAT Amount:</span>
            <span className="value">₱{record.vat_amount ? Number(record.vat_amount).toLocaleString() : 'N/A'}</span>
          </div>
          <div className="detailRow">
            <span className="label">Total Amount Due:</span>
            <span className="value">₱{Number(record.total_amount_due).toLocaleString()}</span>
          </div>
          <div className="detailRow">
            <span className="label">Source:</span>
            <span className="value">
              {record.source.replace('_', ' ')}
              {record.ocr_confidence && renderOcrConfidence(record.ocr_confidence)}
            </span>
          </div>
          {record.remarks && (
            <div className="detailRow">
              <span className="label">Remarks:</span>
              <span className="value">{record.remarks}</span>
            </div>
          )}
        </div>

        {record.items && record.items.length > 0 && (
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
                  {record.source !== 'Manual_Entry' && <th>OCR Confidence</th>}
                </tr>
              </thead>
              <tbody>
                {record.items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.item_name}</td>
                    <td>{item.unit}</td>
                    <td>{Number(item.quantity).toLocaleString()}</td>
                    <td>₱{Number(item.unit_price).toLocaleString()}</td>
                    <td>₱{Number(item.total_price).toLocaleString()}</td>
                    {record.source !== 'Manual_Entry' && (
                      <td>{item.ocr_confidence ? `${(item.ocr_confidence * 100).toFixed(1)}%` : 'N/A'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modalFooter">
          <button className="closeBtn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ViewReceiptModal;