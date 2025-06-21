// app\Components\addRevenue.tsx
'use client';

import React, { useState, useEffect } from 'react';
import '../../styles/addRevenue.css';
import axios from 'axios'; // ✅ Required for PUT request
import {
  showEmptyFieldWarning,
  showAddConfirmation,
  showAddSuccess,
  showInvalidAmountAlert,
  showError
} from '../../utility/Alerts';
import { isValidAmount } from '../../utility/validation';
import { formatDate } from '../../utility/dateFormatter';
import { formatDisplayText } from '../../utils/formatting';
import { Assignment } from '@/lib/supabase/assignments';

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

type AddRevenueProps = {
  onClose: () => void;
  onAddRevenue: (formData: {
    category_id: string;
    assignment_id?: string;
    total_amount: number;
    collection_date: string;
    created_by: string;
  }) => void;
  assignments: Assignment[];
  currentUser: string;
};

const AddRevenue: React.FC<AddRevenueProps> = ({ 
  onClose, 
  onAddRevenue,
  assignments,
  currentUser 
}) => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const [categories, setCategories] = useState<GlobalCategory[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  
  const [formData, setFormData] = useState({
    category_id: '',
    assignment_id: '',
    total_amount: 0,
    collection_date: new Date().toISOString().split('T')[0],
    created_by: currentUser,
  });

  // Fetch categories and employees on component mount
  useEffect(() => {
    const fetchGlobals = async () => {
      try {
        const [categoriesResponse, employeesResponse] = await Promise.all([
          fetch('/api/globals/categories'),
          fetch('/api/employees')
        ]);

        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData);
          // Set first revenue category as default if available (excluding Other and Bus_Rental)
          const revenueCategories = categoriesData.filter((cat: GlobalCategory) => 
            cat.applicable_modules.includes('revenue') && 
            cat.name !== 'Other' && 
            cat.name !== 'Bus_Rental'
          );
          if (revenueCategories.length > 0) {
            setFormData(prev => ({ ...prev, category_id: revenueCategories[0].category_id }));
          }
        }

        if (employeesResponse.ok) {
          const employeesData = await employeesResponse.json();
          setAllEmployees(employeesData);
        }
      } catch (error) {
        console.error('Error fetching globals:', error);
        showError('Error', 'Failed to load categories or employees');
      }
    };

    fetchGlobals();
  }, []);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(formatDate(now));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter assignments based on selected category and is_revenue_recorded status
  const filteredAssignments = assignments
    .filter(a => {
      if (a.is_revenue_recorded) return false; // Filter out already recorded assignments
      
      if (!formData.category_id) return false;
      
      const selectedCategory = categories.find(cat => cat.category_id === formData.category_id);
      if (!selectedCategory) return false;
      
      // Map category names to assignment types (only Boundary and Percentage)
      if (selectedCategory.name === 'Boundary') return a.assignment_type === 'Boundary';
      if (selectedCategory.name === 'Percentage') return a.assignment_type === 'Percentage';
      return false; // No other categories supported
    })
    .sort((a, b) => new Date(a.date_assigned).getTime() - new Date(b.date_assigned).getTime());

  // When assignment changes, auto-fill fields
  useEffect(() => {
    if (formData.assignment_id) {
      const selectedAssignment = assignments.find(a => a.assignment_id === formData.assignment_id);
      if (selectedAssignment) {
        const selectedCategory = categories.find(cat => cat.category_id === formData.category_id);
        
        // Calculate amount based on category type
        let calculatedAmount = selectedAssignment.trip_revenue;
        if (selectedCategory?.name === 'Percentage' && selectedAssignment.assignment_value) {
          calculatedAmount = selectedAssignment.trip_revenue * (selectedAssignment.assignment_value / 100);
        }
        // For Boundary category, use trip_revenue as is
        
        setFormData(prev => ({
          ...prev,
          total_amount: calculatedAmount,
          collection_date: selectedAssignment.date_assigned.split('T')[0],
        }));
      }
    }
  }, [formData.assignment_id, formData.category_id, assignments, categories]);

  // Reset form when category changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      assignment_id: '',
      total_amount: 0,
      collection_date: new Date().toISOString().split('T')[0],
    }));
  }, [formData.category_id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    let newValue: string | number = value;
    if (name === 'total_amount') {
      newValue = parseFloat(value) || 0;
    }

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { category_id, assignment_id, total_amount, collection_date } = formData;

    if (!category_id || !assignment_id || !collection_date || !currentUser) {
      await showEmptyFieldWarning();
      return;
    }

    if (!isValidAmount(total_amount)) {
      await showInvalidAmountAlert();
      return;
    }

    const result = await showAddConfirmation();

    if (result.isConfirmed) {
      try {
        await onAddRevenue({
          category_id,
          assignment_id,
          total_amount,
          collection_date,
          created_by: currentUser,
        });

        // Update is_revenue_recorded in Supabase if assignment is used
        if (assignment_id) {
          await axios.put(`/api/assignments/${assignment_id}`, {
            is_revenue_recorded: true
          });
        }

        await showAddSuccess();
        onClose();
      } catch (error: unknown) {
        console.error('Error adding revenue:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        showError('Failed to add revenue: ' + errorMessage, 'Error');
      }
    }
  };

  // Format assignment for display - similar to expense module
  const formatAssignment = (assignment: Assignment) => {
    const busType = assignment.bus_type === 'Airconditioned' ? 'A' : 'O';
    const driver = allEmployees.find(e => e.employee_id === assignment.driver_id);
    const conductor = allEmployees.find(e => e.employee_id === assignment.conductor_id);
    
    // Calculate display amount based on selected category
    const selectedCategory = categories.find(cat => cat.category_id === formData.category_id);
    let displayAmount = assignment.trip_revenue;
    if (selectedCategory?.name === 'Percentage' && assignment.assignment_value) {
      displayAmount = assignment.trip_revenue * (assignment.assignment_value / 100);
    }
    
    return `${formatDate(assignment.date_assigned)} | ₱ ${displayAmount.toLocaleString()} | ${assignment.bus_plate_number} (${busType}) - ${assignment.bus_route} | ${driver?.name || 'N/A'} & ${conductor?.name || 'N/A'}`;
  };

  return (
    <div className="modalOverlay">
      <div className="addRevenueModal">
        {/* Close Button */}
        <button type="button" className="closeButton" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>

        <div className="modalHeader">
          <h1>Add Revenue</h1>
          <div className="timeDate">
            <div className="currTime">{currentTime}</div>
            <div className="currDate">{currentDate}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modalContent">
            <div className="formFieldsHorizontal">
              <div className="formInputs">

                <div className="formRow">
                  {/* CATEGORY */}
                  <div className="formField">
                    <label htmlFor="category_id">Category<span className='requiredTags'> *</span></label>
                    <select
                      id="category_id"
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleInputChange}
                      required
                      className="formSelect"
                    >
                      <option value="">Select Category</option>
                      {categories
                        .filter(cat => 
                          cat.applicable_modules.includes('revenue') && 
                          cat.name !== 'Other' && 
                          cat.name !== 'Bus_Rental'
                        )
                        .map((category) => (
                          <option key={category.category_id} value={category.category_id}>
                            {formatDisplayText(category.name)}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* ASSIGNMENT (required for all categories) */}
                  <div className="formField">
                    <label htmlFor="assignment_id">Assignment<span className='requiredTags'> *</span></label>
                    <select
                      id="assignment_id"
                      name="assignment_id"
                      value={formData.assignment_id}
                      onChange={handleInputChange}
                      required
                      className="formSelect"
                      disabled={filteredAssignments.length === 0}
                    >
                      <option value="">Select Assignment</option>
                      {filteredAssignments.map((assignment) => (
                        <option 
                          key={assignment.assignment_id} 
                          value={assignment.assignment_id}
                        >
                          {formatAssignment(assignment)}
                        </option>
                      ))}
                    </select>
                    {filteredAssignments.length === 0 && formData.category_id && (
                      <div className="noAssignments">No assignments available for selected category</div>
                    )}
                  </div>
                </div>

                <div className="formRow">
                  {/* AMOUNT (read-only, auto-filled from assignment) */}
                  <div className="formField">
                    <label htmlFor="amount">Amount<span className='requiredTags'> *</span></label>
                    <input
                      type="text"
                      id="total_amount"
                      name="total_amount"
                      value={formData.total_amount.toLocaleString()}
                      readOnly
                      className="formInput"
                    />
                    {formData.assignment_id && (
                      <span className="autofill-note">Autofilled from Assignment</span>
                    )}
                  </div>

                  {/* DATE */}
                  <div className="formField">
                    <label htmlFor="collection_date">Collection Date <span className='requiredTags'> *</span></label>
                    <input
                      type="date"
                      id="collection_date"
                      name="collection_date"
                      value={formData.collection_date}
                      onChange={handleInputChange}
                      required
                      className="formInput"
                      max={today}
                    />
                    {formData.assignment_id && (
                      <span className="autofill-note">Autofilled from Assignment</span>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="modalButtons">
            <button type="submit" className="addButton">
              <i className="ri-add-line" /> Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRevenue;