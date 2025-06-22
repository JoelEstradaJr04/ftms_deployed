// app/(pages)/receipt/viewReceipt.tsx
'use client';
import React from 'react';
import { formatDate } from '../../utility/dateFormatter';
import '../../styles/viewReceipt.css';
import { formatDisplayText } from '@/app/utils/formatting';

type ReceiptItem = {
  receipt_item_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item: {
    item_id: string;
    item_name: string;
    unit: { id: string, name: string };
    category: { category_id: string, name: string };
    other_unit?: string;
  };
};

type Receipt = {
  receipt_id: string;
  supplier: string;
  transaction_date: string;
  vat_reg_tin?: string;
  terms_id: string;
  terms_name: string;
  date_paid?: string;
  payment_status_id: string;
  payment_status_name: string;
  total_amount: number;
  vat_amount?: number;
  total_amount_due: number;
  created_at: string;
  updated_at?: string;
  created_by: string;
  updated_by?: string;
  source_id: string;
  source_name: string;
  category_id: string;
  category_name: string;
  other_category?: string;
  remarks?: string;
  is_expense_recorded: boolean;
  items: ReceiptItem[];
};

type ViewReceiptModalProps = {
  receipt: Receipt;
  onClose: () => void;
};

const ViewReceiptModal: React.FC<ViewReceiptModalProps> = ({ receipt, onClose }): React.ReactElement => {
  const getStatusBadgeClass = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'statusBadge paid';
      case 'pending': return 'statusBadge pending';
      case 'cancelled': return 'statusBadge cancelled';
      case 'dued': return 'statusBadge dued';
      default: return 'statusBadge';
    }
  };

  const getDisplayUnit = (item: ReceiptItem) => {
    if (!item.item) return '';
    if (item.item.unit.name === 'Other' && item.item.other_unit) {
      return formatDisplayText(item.item.other_unit);
    }
    return formatDisplayText(item.item.unit.name);
  };

  const getDisplayCategory = (receipt: Receipt) => {
    if (receipt.category_name === 'Other' && receipt.other_category) {
      return formatDisplayText(receipt.other_category);
    }
    return formatDisplayText(receipt.category_name);
  };

  const getItemDisplayCategory = (item: ReceiptItem) => {
    if (!item.item) return '';
    return formatDisplayText(item.item.category.name);
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
            <span className="value">{formatDisplayText(receipt.supplier)}</span>
          </div>
          <div className="detailRow">
            <span className="label">Category:</span>
            <span className="value">
              {getDisplayCategory(receipt)}
            </span>
          </div>
          <div className="detailRow">
            <span className="label">Status:</span>
            <span className={getStatusBadgeClass(receipt.payment_status_name)}>
              {formatDisplayText(receipt.payment_status_name)}
            </span>
          </div>
        </div>

        <div className="receiptDetails">
          <h3>Receipt Details</h3>
          <div className="detailRow">
            <span className="label">Transaction Date:</span>
            <span className="value">{formatDate(receipt.transaction_date)}</span>
          </div>
          <div className="detailRow">
            <span className="label">VAT Reg TIN:</span>
            <span className="value">{formatDisplayText(receipt.vat_reg_tin || 'N/A')}</span>
          </div>
          <div className="detailRow">
            <span className="label">Terms:</span>
            <span className="value">{formatDisplayText(receipt.terms_name)}</span>
          </div>
          <div className="detailRow">
            <span className="label">Date Paid:</span>
            <span className="value">{receipt.date_paid ? formatDate(new Date(receipt.date_paid)) : 'N/A'}</span>
          </div>
          <div className="detailRow">
            <span className="label">Total Amount:</span>
            <span className="value">₱{Number(receipt.total_amount).toLocaleString()}</span>
          </div>
          <div className="detailRow">
            <span className="label">VAT Amount:</span>
            <span className="value">₱{receipt.vat_amount ? Number(receipt.vat_amount).toLocaleString() : 'N/A'}</span>
          </div>
          <div className="detailRow">
            <span className="label">Total Amount Due:</span>
            <span className="value">₱{Number(receipt.total_amount_due).toLocaleString()}</span>
          </div>
          <div className="detailRow">
            <span className="label">Source:</span>
            <span className="value">
              {formatDisplayText(receipt.source_name)}
            </span>
          </div>
          {receipt.remarks && (
            <div className="detailRow">
              <span className="label">Remarks:</span>
              <span className="value">{formatDisplayText(receipt.remarks)}</span>
            </div>
          )}
        </div>

        {receipt.items && receipt.items.length > 0 && (
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
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item, index) => (
                  <tr key={item.receipt_item_id || index}>
                    <td>{formatDisplayText(item.item?.item_name || '')}</td>
                    <td>{getDisplayUnit(item)}</td>
                    <td>{Number(item.quantity).toLocaleString()}</td>
                    <td>₱{Number(item.unit_price).toLocaleString()}</td>
                    <td>₱{Number(item.total_price).toLocaleString()}</td>
                    <td>{getItemDisplayCategory(item)}</td>
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