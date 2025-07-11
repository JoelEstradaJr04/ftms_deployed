// app/(pages)/receipt/viewReceipt.tsx
'use client';
import React from 'react';
import { formatDate, formatDateTime } from '../../utility/dateFormatter';
import '../../styles/receipt/viewReceipt.css';
import { formatDisplayText } from '@/app/utils/formatting';
import ModalHeader from '@/app/Components/ModalHeader';

type ReceiptItem = {
  receipt_item_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item: {
    item_id: string;
    item_name: string;
    unit: { id: string; name: string };
    category: { category_id: string; name: string };
    other_unit?: string;
  };
};

type Receipt = {
  receipt_id: string;
  supplier: string;
  transaction_date: string;
  vat_reg_tin?: string;
  terms?: {
    id: string;
    name: string;
  } | string;
  date_paid?: string;
  payment_status?: {
    id: string;
    name: string;
  } | string;
  total_amount: number;
  vat_amount?: number;
  total_amount_due: number;
  category?: {
    category_id: string;
    name: string;
  } | string;
  source?: {
    source_id: string;
    name: string;
  } | string;
  remarks?: string;
  is_expense_recorded: boolean;
  items: ReceiptItem[];
  created_by: string;
  created_at: string;
  updated_at?: string;
  updated_by?: string;
  is_deleted: boolean;
};

type ViewReceiptModalProps = {
  record: Receipt;
  onClose: () => void;
};

const ViewReceiptModal: React.FC<ViewReceiptModalProps> = ({ record, onClose }): React.ReactElement => {
  console.log('ViewReceiptModal received record:', record);
  
  // Add defensive check for undefined record
  if (!record) {
    console.log('ViewReceiptModal: record is undefined or null');
    return (
      <div className="viewReceipt__modalOverlay">
        <div className="viewReceipt__modalContent">
          <ModalHeader title="View Receipt" onClose={onClose} />
          <div className="mainDetails">
            <div className="detailRow">
              <span className="label">Error:</span>
              <span className="value">Receipt data not available</span>
            </div>
          </div>
          <div className="modalFooter">
            <button className="closeBtn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

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
    if (item.item.unit.name && item.item.unit.name !== 'Other') {
      return formatDisplayText(item.item.unit.name);
    }
    return formatDisplayText('Unknown');
  };

  const getDisplayCategory = (categoryName: string) => {
    if (categoryName && categoryName !== 'Other') {
      return formatDisplayText(categoryName);
    }
    return formatDisplayText('Unknown');
  };

  const getItemDisplayCategory = (item: ReceiptItem) => {
    if (!item.item) return '';
    return formatDisplayText(item.item.category.name);
  };

  const getStatusName = (receipt: Receipt) => {
    return typeof receipt.payment_status === 'string' ? receipt.payment_status : receipt.payment_status?.name;
  };

  const getTermsName = (receipt: Receipt) => {
    return typeof receipt.terms === 'string' ? receipt.terms : receipt.terms?.name;
  };

  const getSourceName = (receipt: Receipt) => {
    return typeof receipt.source === 'string' ? receipt.source : receipt.source?.name;
  };

  return (
    <div className="viewReceipt__modalOverlay">
      <div className="viewReceipt__modalContent">
        <ModalHeader title="View Receipt" onClose={onClose} />
        
        <div className="mainDetails">
          <div className="detailRow">
            <span className="label">Supplier:</span>
            <span className="value">{formatDisplayText(record.supplier)}</span>
          </div>
          <div className="detailRow">
            <span className="label">Category:</span>
            <span className="value">
              {getDisplayCategory(typeof record.category === 'string' ? record.category : record.category?.name || '')}
            </span>
          </div>
          <div className="detailRow">
            <span className="label">Status:</span>
            <span className={getStatusBadgeClass(getStatusName(record))}
              title={getStatusName(record)}>
              {formatDisplayText(getStatusName(record) || 'N/A')}
            </span>
          </div>
        </div>

        <div className="receiptDetails">
          <h3>Receipt Details</h3>
          <div className="detailRow">
            <span className="label">Transaction Date:</span>
            <span className="value">{formatDateTime(record.transaction_date)}</span>
          </div>
          <div className="detailRow">
            <span className="label">VAT Reg TIN:</span>
            <span className="value">{formatDisplayText(record.vat_reg_tin || 'N/A')}</span>
          </div>
          <div className="detailRow">
            <span className="label">Terms:</span>
            <span className="value">{formatDisplayText(getTermsName(record) || 'N/A')}</span>
          </div>
          <div className="detailRow">
            <span className="label">Date Paid:</span>
            <span className="value">{record.date_paid ? formatDate(new Date(record.date_paid)) : 'N/A'}</span>
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
              {formatDisplayText(getSourceName(record) || 'N/A')}
            </span>
          </div>
          {record.remarks && (
            <div className="detailRow">
              <span className="label">Remarks:</span>
              <span className="value">{formatDisplayText(record.remarks)}</span>
            </div>
          )}
        </div>

        {record.items && record.items.length > 0 && (
          <div className="view_itemsSection">
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
                {record.items.map((item, index) => (
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
          <button className="viewReceipt_closeBtn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ViewReceiptModal;