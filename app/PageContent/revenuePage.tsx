// app\PageContent\revenuePage.tsx
"use client";

import React, { useState, useEffect } from "react";
import "../styles/revenue.css";
import PaginationComponent from "../Components/pagination";
import AddRevenue from "../Components/addRevenue"; 
import Swal from 'sweetalert2';
import EditRevenueModal from "../Components/editRevenue";

// Define interface based on your Prisma RevenueRecord schema
interface RevenueRecord {
  revenue_id: string;        
  assignment_id?: string;    
  category: 'Boundary' | 'Percentage' | 'Bus_Rental' | 'Other'; 
  total_amount: number;      
  date: string;              
  created_by: string;        
  created_at: string;        
  updated_at?: string;       
  isDeleted: boolean;
  other_source?: string; // Add this line
}

// Updated Assignment interface to include assignment_type and is_recorded
// Update the Assignment interface
interface Assignment {
  assignment_id: string;
  bus_bodynumber: string;
  bus_platenumber: string;
  bus_route: 'S. Palay to PITX' | 'S. Palay to Sta. Cruz';
  bus_type: 'Airconditioned' | 'Ordinary';
  driver_name: string;
  conductor_name: string;
  date_assigned: string;
  trip_fuel_expense: number;
  trip_revenue: number;
  is_recorded: boolean;
  assignment_type: 'Boundary' | 'Percentage' | 'Bus_Rental';
}

interface RawAssignment {
  assignment_id: string;
  bus_bodynumber: string;
  bus_platenumber: string;
  bus_route: 'S. Palay to PITX' | 'S. Palay to Sta. Cruz';
  bus_type: 'Airconditioned' | 'Ordinary';
  driver_name: string;
  conductor_name: string;
  date_assigned: string;
  trip_fuel_expense: string | number; // API might return string
  trip_revenue: string | number; // API might return string
  is_recorded: boolean;
  assignment_type: 'Boundary' | 'Percentage' | 'Bus_Rental';
}

// UI data type that matches your schema exactly
type RevenueData = {
  revenue_id: string;       
  category: string;         
  total_amount: number;     
  date: string;             
  created_by: string;       
  assignment_id?: string;   
  other_source?: string;
};

const RevenuePage = () => {
  const [data, setData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showModal, setShowModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<RevenueData | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Reuse the same format function from addRevenue.tsx
  const formatAssignment = (assignment: Assignment): string => {
    const busType = assignment.bus_type === 'Airconditioned' ? 'A' : 'O';
    return `${busType} | ${assignment.bus_bodynumber} - ${assignment.bus_route} | ${assignment.driver_name.split(' ').pop()} & ${assignment.conductor_name.split(' ').pop()} | ${new Date(assignment.date_assigned).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })}`;
  };


  // Fetch assignments function
  const fetchAssignments = async () => {
    try {
      const response = await fetch('/api/assignments');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Expected array of assignments');
      }

      // Ensure all required fields are present
      const mappedAssignments: Assignment[] = data.map(assignment => ({
        assignment_id: assignment.assignment_id,
        bus_bodynumber: assignment.bus_bodynumber,
        bus_platenumber: assignment.bus_platenumber,
        bus_route: assignment.bus_route,
        bus_type: assignment.bus_type,
        driver_name: assignment.driver_name,
        conductor_name: assignment.conductor_name,
        date_assigned: assignment.date_assigned,
        trip_fuel_expense: Number(assignment.trip_fuel_expense),
        trip_revenue: Number(assignment.trip_revenue),
        is_recorded: assignment.is_recorded,
        assignment_type: assignment.assignment_type
      }));
    
    setAssignments(mappedAssignments);
    console.log('Fetched assignments:', mappedAssignments); // Debug log
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching assignments:', errorMessage);
    Swal.fire('Error', 'Failed to load assignments: ' + errorMessage, 'error');
  }
};

  useEffect(() => {
    fetchAssignments(); // Fetch assignments on component mount
  }, []);

  useEffect(() => {
    const fetchRevenuesAndAssignments = async () => {
      try {
        setLoading(true);
        
        // Fetch assignments first
        const assignmentsResponse = await fetch('/api/assignments');
        if (!assignmentsResponse.ok) throw new Error('Failed to fetch assignments');
        const assignmentsData = await assignmentsResponse.json();
        
        // Map assignments with proper typing
        const mappedAssignments: Assignment[] = (assignmentsData as RawAssignment[]).map((assignment: RawAssignment) => ({
          assignment_id: assignment.assignment_id,
          bus_bodynumber: assignment.bus_bodynumber,
          bus_platenumber: assignment.bus_platenumber,
          bus_route: assignment.bus_route,
          bus_type: assignment.bus_type,
          driver_name: assignment.driver_name,
          conductor_name: assignment.conductor_name,
          date_assigned: assignment.date_assigned,
          trip_fuel_expense: Number(assignment.trip_fuel_expense),
          trip_revenue: Number(assignment.trip_revenue),
          is_recorded: assignment.is_recorded,
          assignment_type: assignment.assignment_type
        }));
        
        setAssignments(mappedAssignments);
        
        // Then fetch revenues
        const revenuesResponse = await fetch('/api/revenues');
        if (!revenuesResponse.ok) throw new Error('Failed to fetch revenues');
        
        const revenues: RevenueRecord[] = await revenuesResponse.json();
        
        const transformedData: RevenueData[] = revenues.map(revenue => ({
          revenue_id: revenue.revenue_id,
          category: revenue.category,
          total_amount: Number(revenue.total_amount),
          date: new Date(revenue.date).toISOString().split('T')[0],
          created_by: revenue.created_by,
          assignment_id: revenue.assignment_id,
          other_source: revenue.other_source || undefined
        }));
        
        setData(transformedData);
      } catch (error) {
        console.error('Error fetching data:', error);
        Swal.fire('Error', 'Failed to load data', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRevenuesAndAssignments();
  }, []); // Empty dependency array as we only want this to run once on mount


  useEffect(() => {
    const loadAssignments = async () => {
      await fetchAssignments();
    };
    
    if (assignments.length === 0) {
      loadAssignments();
    }
  }, [assignments.length]);

  // Filter and pagination logic
  const filteredData = data.filter((item: RevenueData) => {
    const matchesSearch = (item.category?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
    const matchesDate = (!dateFrom || item.date >= dateFrom) && 
                      (!dateTo || item.date <= dateTo);
    return matchesSearch && matchesCategory && matchesDate;
  });

  const indexOfLastRecord = currentPage * pageSize;
  const indexOfFirstRecord = indexOfLastRecord - pageSize;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleAddRevenue = async (newRevenue: {
    category: string;
    assignment_id?: string;
    total_amount: number;
    date: string;
    created_by: string;
    other_source?: string;
  }) => {
    try {
      // Check for duplicates if category is not "Other"
      if (newRevenue.category !== 'Other') {
      const duplicate = data.find(item => {
        const assignment = assignments.find(a => a.assignment_id === newRevenue.assignment_id) as Assignment | undefined;
        const itemAssignment = item.assignment_id 
          ? assignments.find(a => a.assignment_id === item.assignment_id) as Assignment | undefined
          : null;

        if (!assignment || !itemAssignment) return false;

        return (
          new Date(assignment.date_assigned).toISOString().split('T')[0] === newRevenue.date &&
          assignment.bus_bodynumber === itemAssignment.bus_bodynumber &&
          item.category === newRevenue.category &&
          assignment.driver_name === itemAssignment.driver_name &&
          assignment.conductor_name === itemAssignment.conductor_name
        );
      });

        if (duplicate) {
          Swal.fire('Error', 'Duplicate revenue record found for the same assignment.', 'error');
          return;
        }
      }

      // Existing code to create revenue record
    const response = await fetch('/api/revenues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: newRevenue.category,
        total_amount: newRevenue.total_amount,
        date: new Date(newRevenue.date).toISOString(),
        created_by: newRevenue.created_by,
        assignment_id: newRevenue.assignment_id || null,
        other_source: newRevenue.category === 'Other' ? newRevenue.other_source : null
      })
    });

    if (!response.ok) throw new Error('Create failed');

    const result: RevenueRecord = await response.json();
    
    // Update revenues state
    setData(prev => [...prev, {
      revenue_id: result.revenue_id,
      category: result.category,
      total_amount: Number(result.total_amount),
      date: new Date(result.date).toISOString().split('T')[0],
      created_by: result.created_by,
      assignment_id: result.assignment_id,
      other_source: result.other_source || undefined
    }]);

    // Update assignments state locally instead of re-fetching
    if (newRevenue.assignment_id) {
      const response = await fetch(`/api/assignments/${newRevenue.assignment_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_recorded: true })
      });

      if (response.ok) {
        setAssignments(prev => prev.map(assignment => 
          assignment.assignment_id === newRevenue.assignment_id 
            ? { ...assignment, is_recorded: true }
            : assignment
        ));
      }
    }

    Swal.fire('Success', 'Revenue added successfully', 'success');
    setShowModal(false);
  } catch (error) {
    console.error('Create error:', error);
    Swal.fire('Error', 'Failed to add revenue: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
  }
};

  const handleDelete = async (revenue_id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the record permanently.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#961C1E',
      confirmButtonText: 'Yes, delete it!',
      background: 'white',
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/revenues/${revenue_id}`, {
          method: 'DELETE'
        });

        if (!response.ok) throw new Error('Delete failed');

        setData(prev => prev.filter(item => item.revenue_id !== revenue_id));
        Swal.fire('Deleted!', 'Record deleted successfully', 'success');
      } catch (error) {
        console.error('Delete error:', error);
        Swal.fire('Error', 'Failed to delete record', 'error');
      }
    }
  };

  const handleSaveEdit = async (updatedRecord: RevenueData) => {
    try {
      const response = await fetch(`/api/revenues/${updatedRecord.revenue_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: updatedRecord.category, 
          total_amount: updatedRecord.total_amount, 
        })
      });

      if (!response.ok) throw new Error('Update failed');

      const result: RevenueRecord = await response.json();
      
      // Update local state with response from API
      setData(prev => prev.map(rec => 
        rec.revenue_id === updatedRecord.revenue_id ? {
          ...rec,
          category: result.category,
          total_amount: Number(result.total_amount),
        } : rec
      ));

      setEditModalOpen(false);
      setRecordToEdit(null);
      Swal.fire('Success', 'Record updated successfully', 'success');
      return true;
    } catch (error) {
      console.error('Update error:', error);
      Swal.fire('Error', 'Failed to update record', 'error');
      return false;
    }
  };

  // UI Handlers
  const handleExport = () => {
    const headers = "Revenue ID,Date,Category,Amount,Created By\n";
    const rows = data
      .map(item => `${item.revenue_id},${item.date},${item.category},${item.total_amount},${item.created_by}`)
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "revenue_data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").slice(1); // Skip header
      
      try {
        const importPromises = lines
          .filter(line => line.trim())
          .map(async (line: string) => {  // Explicitly type the line parameter
            const [, date, category, amount] = line.split(",");
            const response = await fetch('/api/revenues', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                category,
                total_amount: parseFloat(amount),
                date: new Date(date).toISOString(),
                created_by: 'import-job'
              })
            });
            return await response.json() as RevenueRecord;
          });

      const imported = await Promise.all(importPromises);
      
        setData(prev => [...prev, ...imported.map((item: RevenueRecord) => ({
          revenue_id: item.revenue_id,
          category: item.category,
          total_amount: Number(item.total_amount),
          date: new Date(item.date).toISOString().split('T')[0],
          created_by: item.created_by,
          assignment_id: item.assignment_id
        }))]);

          Swal.fire('Success', 'Import completed', 'success');
        } catch (error) {
          console.error('Import error:', error);
          Swal.fire('Error', 'Failed to import some records', 'error');
        }
      };
      reader.readAsText(file);
    };

  return (
    <div className="revenuePage">
      {loading && <div className="loading">Loading revenues...</div>}

      <div className="importExport">
        <button onClick={handleExport}>Export CSV</button>
        <label className="importLabel">
          Import CSV
          <input type="file" accept=".csv" onChange={handleImport} hidden />
        </label>
      </div>

      <div className="settings">
        <input
          type="text"
          placeholder="Search by category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="filters">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="Boundary">Boundary</option>
            <option value="Percentage">Percentage</option>
            <option value="Bus_Rental">Bus Rental</option>
            <option value="Other">Other</option>
          </select>

          <button onClick={() => setShowModal(true)} id='addRevenue'>
            Add Revenue
          </button>
        </div>
      </div>

      <div className="tableContainer">
        <table>
          <thead>
            <tr>
              <th><input type="checkbox" /></th>
              <th>Date</th>
              <th>Source</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Action</th>
            </tr>
          </thead>
            <tbody>
            {currentRecords.map(item => {
            const assignment = item.assignment_id 
              ? assignments.find(a => a.assignment_id === item.assignment_id) as Assignment | undefined
              : null;

              console.log('Assignment for revenue:', item.revenue_id, assignment); // Debug log

              let source: string;
              if (item.category === 'Other') {
                source = item.other_source || 'N/A';
              } else if (assignment) {
                source = formatAssignment(assignment);
              } else {
                source = 'Loading...'; // Changed from 'Assignment not found' to indicate loading state
              }

              return (
                <tr key={item.revenue_id}>
                  <td><input type="checkbox" /></td>
                  <td>{new Date(item.date).toLocaleDateString()}</td>
                  <td>{source}</td>
                  <td>{item.category}</td>
                  <td>₱{item.total_amount.toLocaleString()}</td>
                  <td className="actionButtons">
                    <button 
                      className="editBtn" 
                      onClick={() => {
                        setRecordToEdit(item);
                        setEditModalOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      className="deleteBtn" 
                      onClick={() => handleDelete(item.revenue_id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {currentRecords.length === 0 && !loading && <p>No records found.</p>}
      </div>

      <PaginationComponent
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {showModal && (
        <AddRevenue
          onClose={() => setShowModal(false)}
          onAddRevenue={handleAddRevenue}
          assignments={assignments}
          currentUser  ={"user1"} // Replace with your actual user ID
        />
      )}

      {editModalOpen && recordToEdit && (
        <EditRevenueModal
          record={{
            id: 1, // Dummy numeric ID for modal compatibility
            date: recordToEdit.date,
            category: recordToEdit.category,
            source: recordToEdit.category, // Using category as source since schema doesn't have department_from
            amount: recordToEdit.total_amount
          }}
          onClose={() => {
            setEditModalOpen(false);
            setRecordToEdit(null);
          }}
          onSave={(updatedRecord) => handleSaveEdit({
            revenue_id: recordToEdit.revenue_id,
            category: updatedRecord.category,
            total_amount: updatedRecord.amount,
            date: updatedRecord.date,
            created_by: recordToEdit.created_by,
            assignment_id: recordToEdit.assignment_id
          })}
        />
      )}
    </div>
  );
};

export default RevenuePage;