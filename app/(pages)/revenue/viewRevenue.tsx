// app/(pages)/expense/viewRevenue.tsx
'use client';

import React from 'react';
import '../../styles/viewRevenue.css';
import { formatDate } from '../../utility/dateFormatter';
import { formatDisplayText } from '@/app/utils/formatting';

type Assignment = {
  assignment_id: string;
  bus_bodynumber: string;
  bus_route: string;
  bus_type: string;
  driver_name: string;
  conductor_name: string;
  date_assigned: string;
  trip_revenue: number;
  assignment_type: 'Boundary' | 'Percentage' | 'Bus_Rental';
};

type ViewRevenueProps = {
  record: {
    revenue_id: string;
    category: string;
    total_amount: number;
    collection_date: string;
    created_at: string;
    assignment?: Assignment;
    other_source?: string;
  };
  onClose: () => void;
};

const ViewRevenue: React.FC<ViewRevenueProps> = ({ record, onClose }) => {
  const renderAssignmentDetails = () => {
    if (!record.assignment) return null;

    return (
      <div className="assignmentDetails">
        <h3>Assignment Details</h3>
        <div className="detailRow">
          <span className="label">Assignment Type:</span>
          <span className="value">{formatDisplayText(record.assignment.assignment_type)}</span>
        </div>
        <div className="detailRow">
          <span className="label">Bus Number:</span>
          <span className="value">{record.assignment.bus_bodynumber}</span>
        </div>
        <div className="detailRow">
          <span className="label">Route:</span>
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
          <span className="label">Trip Revenue:</span>
          <span className="value">₱{record.assignment.trip_revenue.toLocaleString()}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="modalOverlay">
      <div className="viewRevenueModal">
        <div className="modalHeader">
          <h2>View Revenue</h2>
          <button className="closeButton" onClick={onClose}>&times;</button>
        </div>

        <div className="mainDetails">
          <div className="detailRow">
            <span className="label">Category:</span>
            <span className="value">{formatDisplayText(record.category)}</span>
          </div>
          <div className="detailRow">
            <span className="label">Amount:</span>
            <span className="value">₱{Number(record.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="detailRow">
            <span className="label">Collection Date:</span>
            <span className="value">{formatDate(record.collection_date)}</span>
          </div>
          <div className="detailRow">
            <span className="label">Record Date:</span>
            <span className="value">{formatDate(record.created_at)}</span>
          </div>
        </div>

        {record.assignment && renderAssignmentDetails()}

        {record.category === 'Other' && record.other_source && (
          <div className="otherSourceDetails">
            <h3>Other Source Details</h3>
            <div className="detailRow">
              <span className="label">Description:</span>
              <span className="value">{record.other_source}</span>
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

export default ViewRevenue;