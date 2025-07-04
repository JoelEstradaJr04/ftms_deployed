// app/(pages)/expense/viewRevenue.tsx
'use client';

import React, { useState, useEffect } from 'react';
import '../../styles/viewRevenue.css';
import { formatDateTime } from '../../utility/dateFormatter';
import { formatDisplayText } from '@/app/utils/formatting';
import type { Assignment } from '@/lib/operations/assignments';

type GlobalCategory = {
  category_id: string;
  name: string;
  applicable_modules: string[];
};

type Employee = {
  employee_id: string;
  name: string;
  job_title: string;
};

type ViewRevenueProps = {
  record: {
    revenue_id: string;
    category?: GlobalCategory;
    category_id?: string;
    total_amount: number;
    collection_date: string;
    created_at: string;
    assignment?: Assignment;
  };
  onClose: () => void;
};

const ViewRevenue: React.FC<ViewRevenueProps> = ({ record, onClose }) => {
  const [, setAllEmployees] = useState<Employee[]>([]);
  const [categoryName, setCategoryName] = useState<string>('Loading...');

  // Fetch employees and category data on component mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees');
        if (response.ok) {
          const employeesData = await response.json();
          setAllEmployees(employeesData);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    const fetchCategoryName = async () => {
      if (record.category?.name) {
        setCategoryName(record.category.name);
        return;
      }

      if (record.category_id) {
        try {
          const response = await fetch(`/api/categories/${record.category_id}`);
          if (response.ok) {
            const categoryData = await response.json();
            setCategoryName(categoryData.name);
          } else {
            setCategoryName('Unknown Category');
          }
        } catch (error) {
          console.error('Error fetching category:', error);
          setCategoryName('Unknown Category');
        }
      } else {
        setCategoryName('Unknown Category');
      }
    };

    fetchEmployees();
    fetchCategoryName();
  }, [record.category, record.category_id]);

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
          <span className="value">{record.assignment.bus_plate_number || 'N/A'}</span>
        </div>
        <div className="detailRow">
          <span className="label">Body Number:</span>
          <span className="value">{record.assignment.body_number || 'N/A'}</span>
        </div>
        <div className="detailRow">
          <span className="label">Route:</span>
          <span className="value">{record.assignment.bus_route}</span>
        </div>
        <div className="detailRow">
          <span className="label">Bus Type:</span>
          <span className="value">{record.assignment.bus_type || 'N/A'}</span>
        </div>
        <div className="detailRow">
          <span className="label">Driver:</span>
          <span className="value">{record.assignment.driver_name || 'N/A'}</span>
        </div>
        <div className="detailRow">
          <span className="label">Conductor:</span>
          <span className="value">{record.assignment.conductor_name || 'N/A'}</span>
        </div>
        <div className="detailRow">
          <span className="label">Date Assigned:</span>
          <span className="value">{formatDateTime(record.assignment.date_assigned)}</span>
        </div>
        <div className="detailRow">
          <span className="label">Trip Revenue:</span>
          <span className="value">₱{record.assignment.trip_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="detailRow">
          <span className="label">Assignment Value:</span>
          <span className="value">
            {record.assignment.assignment_type === 'Percentage' 
              ? `${(record.assignment.assignment_value * 100).toFixed(2)}%`
              : `₱${record.assignment.assignment_value.toLocaleString()}`
            }
          </span>
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
            <span className="value">{categoryName}</span>
          </div>
          <div className="detailRow">
            <span className="label">Remitted Amount:</span>
            <span className="value">₱{(() => {
              if (categoryName === 'Percentage' && record.assignment?.assignment_value) {
                return (record.total_amount * record.assignment.assignment_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              }
              return Number(record.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            })()}</span>
          </div>
          <div className="detailRow">
            <span className="label">Collection Date:</span>
            <span className="value">{formatDateTime(record.collection_date)}</span>
          </div>
        </div>

        {record.assignment && renderAssignmentDetails()}

        <div className="modalFooter">
          <button className="closeBtn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ViewRevenue;