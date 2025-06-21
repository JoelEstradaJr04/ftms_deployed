// app\Components\addRevenue.tsx
'use client';

import React, { useState, useEffect } from 'react';
import '../../styles/addRevenue.css';
import axios from 'axios'; // ✅ Required for PUT request
import {
  showEmptyFieldWarning,
  showAddConfirmation,
  showAddSuccess,
  showInvalidAmountAlert
} from '../../utility/Alerts';
import { isValidAmount } from '../../utility/validation';
import { formatDate } from '../../utility/dateFormatter';
import {showError} from '../../utility/Alerts';

type GlobalCategory = {
  category_id: string;
  name: string;
  applicable_modules: string[];
};

type GlobalSource = {
  source_id: string;
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
    source_id?: string;
    assignment_id?: string;
    total_amount: number;
    collection_date: string;
    created_by: string;
  }) => void;
  assignments: {
    assignment_id: string;
    bus_plate_number: string;
    bus_route: string;
    bus_type: string;
    driver_id: string;
    conductor_id: string;
    date_assigned: string;
    trip_revenue: number;
    assignment_type: string;
    is_revenue_recorded: boolean;
  }[];
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
  const [filteredAssignments, setFilteredAssignments] = useState(assignments.filter(a => !a.is_revenue_recorded));
  const [categories, setCategories] = useState<GlobalCategory[]>([]);
  const [sources, setSources] = useState<GlobalSource[]>([]);
  const [filteredSources, setFilteredSources] = useState<GlobalSource[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  
  const [formData, setFormData] = useState({
    category_id: '',
    source_id: '',
    assignment_id: '',
    total_amount: 0,
    collection_date: new Date().toISOString().split('T')[0],
    created_by: currentUser,
  });

  // Fetch categories, sources, and employees on component mount
  useEffect(() => {
    const fetchGlobals = async () => {
      try {
        const [categoriesResponse, sourcesResponse, employeesResponse] = await Promise.all([
          fetch('/api/globals/categories'),
          fetch('/api/globals/sources'),
          fetch('/api/employees')
        ]);

        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData);
          // Set first category as default if available
          if (categoriesData.length > 0) {
            setFormData(prev => ({ ...prev, category_id: categoriesData[0].category_id }));
          }
        }

        if (sourcesResponse.ok) {
          const sourcesData = await sourcesResponse.json();
          setSources(sourcesData);
          setFilteredSources(sourcesData);
        }

        if (employeesResponse.ok) {
          const employeesData = await employeesResponse.json();
          setAllEmployees(employeesData);
        }
      } catch (error) {
        console.error('Error fetching globals:', error);
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

  // Filter assignments based on selected category
  useEffect(() => {
    if (formData.category_id) {
      const selectedCategory = categories.find(cat => cat.category_id === formData.category_id);
      if (selectedCategory) {
        const filtered = assignments.filter(a => {
          if (a.is_revenue_recorded) return false; // Filter out already recorded assignments
          // Map category names to assignment types
          if (selectedCategory.name === 'Boundary') return a.assignment_type === 'Boundary';
          if (selectedCategory.name === 'Percentage') return a.assignment_type === 'Percentage';
          if (selectedCategory.name === 'Bus_Rental') return a.assignment_type === 'Bus_Rental';
          return false; // No other categories supported
        }).sort((a, b) => new Date(a.date_assigned).getTime() - new Date(b.date_assigned).getTime());
        setFilteredAssignments(filtered);
      }
    }
  }, [formData.category_id, assignments, categories]);

  // Filter sources based on selected category - all sources are assignment-based
  useEffect(() => {
    if (formData.category_id) {
      const selectedCategory = categories.find(cat => cat.category_id === formData.category_id);
      if (selectedCategory) {
        // For all revenue categories, filter sources that are applicable to revenue
        const filtered = sources.filter(source => 
          source.applicable_modules.includes('revenue')
        );
        setFilteredSources(filtered);
      }
    }
  }, [formData.category_id, sources, categories]);

  useEffect(() => {
    if (formData.assignment_id && formData.category_id) {
      const selectedAssignment = assignments.find(a => a.assignment_id === formData.assignment_id);
      if (selectedAssignment) {
        setFormData(prev => ({
          ...prev,
          total_amount: selectedAssignment.trip_revenue
        }));
      }
    }
  }, [formData.assignment_id, assignments, formData.category_id]);

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

    const { category_id, source_id, assignment_id, total_amount, collection_date } = formData;

    if (!category_id || !source_id || !assignment_id || !collection_date || !currentUser) {
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
          source_id,
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
  const formatAssignment = (assignment: typeof assignments[0]) => {
    const busType = assignment.bus_type === 'Airconditioned' ? 'A' : 'O';
    const driver = allEmployees.find(e => e.employee_id === assignment.driver_id);
    const conductor = allEmployees.find(e => e.employee_id === assignment.conductor_id);
    return `${formatDate(assignment.date_assigned)} | ₱ ${assignment.trip_revenue} | ${assignment.bus_plate_number} (${busType}) - ${assignment.bus_route} | ${driver?.name || 'N/A'} & ${conductor?.name || 'N/A'}`;
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
                      {categories.map((category) => (
                        <option key={category.category_id} value={category.category_id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SOURCE */}
                  <div className="formField">
                    <label htmlFor="source_id">Source<span className='requiredTags'> *</span></label>
                    <select
                      id="source_id"
                      name="source_id"
                      value={formData.source_id}
                      onChange={handleInputChange}
                      required
                      className="formSelect"
                      disabled={filteredSources.length === 0}
                    >
                      <option value="">Select Source</option>
                      {filteredSources.map((source) => (
                        <option key={source.source_id} value={source.source_id}>
                          {source.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="formRow">
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
                    {filteredAssignments.length === 0 && (
                      <div className="noAssignments">No assignments available for selected category</div>
                    )}
                  </div>

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
                  </div>
                </div>

                <div className="formRow">
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