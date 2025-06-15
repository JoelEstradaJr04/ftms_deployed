"use client";

import React from 'react';
import styles from '../styles/ExportConfirmationModal.module.css';

interface ExportConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  dateFilter: string;
  dateFrom: string;
  dateTo: string;
  dashboardData: {
    revenue: {
      total: number;
      byCategory: Record<string, number>;
    };
    expense: {
      total: number;
      byCategory: Record<string, number>;
    };
    profit: number;
  };
}

const ExportConfirmationModal: React.FC<ExportConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  dateFilter,
  dateFrom,
  dateTo,
  dashboardData,
}) => {
  if (!isOpen) return null;

  const getDateRangeText = () => {
    switch (dateFilter) {
      case 'Day':
        return 'Today';
      case 'Month':
        return 'This Month';
      case 'Year':
        return 'This Year';
      case 'Custom':
        return `${dateFrom} to ${dateTo}`;
      default:
        return 'All Time';
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Confirm Export</h2>
        
        <div className={styles.summarySection}>
          <h3>Data Summary</h3>
          <div className={styles.dateRange}>
            <strong>Date Range:</strong> {getDateRangeText()}
          </div>
          
          <div className={styles.financialSummary}>
            <div className={styles.summaryItem}>
              <strong>Total Revenue:</strong> ₱{dashboardData.revenue.total.toLocaleString()}
            </div>
            <div className={styles.summaryItem}>
              <strong>Total Expenses:</strong> ₱{dashboardData.expense.total.toLocaleString()}
            </div>
            <div className={styles.summaryItem}>
              <strong>Net Profit:</strong> ₱{dashboardData.profit.toLocaleString()}
            </div>
          </div>

          <div className={styles.categoryBreakdown}>
            <div className={styles.categorySection}>
              <h4>Revenue Categories:</h4>
              {Object.entries(dashboardData.revenue.byCategory).map(([category, amount]) => (
                <div key={category} className={styles.categoryItem}>
                  <span>{category.replace('_', ' ')}:</span>
                  <span>₱{amount.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className={styles.categorySection}>
              <h4>Expense Categories:</h4>
              {Object.entries(dashboardData.expense.byCategory).map(([category, amount]) => (
                <div key={category} className={styles.categoryItem}>
                  <span>{category.replace('_', ' ')}:</span>
                  <span>₱{amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.modalActions}>
          <button onClick={onClose} className={styles.cancelButton}>
            Cancel
          </button>
          <button onClick={onConfirm} className={styles.confirmButton}>
            Confirm Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportConfirmationModal; 