// app\PageContent\revenuePage.tsx
"use client";

import React, { useState, useEffect } from "react";
import "../../styles/revenue.css";
import "../../styles/table.css";
import PaginationComponent from "../../Components/pagination";
import AddRevenue from "./addRevenue"; 
import Swal from 'sweetalert2';
import EditRevenueModal from "./editRevenue";
import ViewRevenue from "./viewRevenue"; // Import the new ViewRevenue component
import { getUnrecordedRevenueAssignments, getAllAssignmentsWithRecorded, type Assignment } from '@/lib/supabase/assignments';
import { formatDate } from '../../utility/dateFormatter';
import Loading from '../../Components/loading';
import { showSuccess, showError} from '../../utility/Alerts';
import { formatDateTime } from "../../utility/dateFormatter";

// Define interface based on your Prisma RevenueRecord schema
interface RevenueRecord {
  revenue_id: string;        
  assignment_id?: string;    
  category_id: string;
  source_id?: string;
  category: {
    category_id: string;
    name: string;
    applicable_modules: string[];
  };
  source?: {
    source_id: string;
    name: string;
    applicable_modules: string[];
  };
  total_amount: number;      
  collection_date: string;              
  created_by: string;        
  created_at: string;        
  updated_at?: string;       
  is_deleted: boolean;
}

// Updated Assignment interface to include assignment_type and is_revenue_recorded
// Update the Assignment interface
interface RevenueData {
  revenue_id: string;
  category: {
    category_id: string;
    name: string;
    applicable_modules: string[];
  };
  source?: {
    source_id: string;
    name: string;
    applicable_modules: string[];
  };
  total_amount: number;
  collection_date: string;
  created_by: string;  // Add this line
  created_at: string;  // Add this line
  assignment_id?: string;
}

type Employee = {
  employee_id: string;
  name: string;
  job_title: string;
};

const RevenuePage = () => {
  const [data, setData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [maxDate, setMaxDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<RevenueData | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [recordToView, setRecordToView] = useState<RevenueData | null>(null);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  // Fetch assignments with periodic refresh and error handling
  const fetchAssignments = async () => {
    try {
      // Get unrecorded revenue assignments for the dropdown
      const unrecordedAssignments = await getUnrecordedRevenueAssignments();
      setAssignments(unrecordedAssignments);
      
      // Get all assignments for reference (including recorded ones)
      const allAssignmentsData = await getAllAssignmentsWithRecorded();
      setAllAssignments(allAssignmentsData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error fetching assignments:', errorMessage);
      // Don't show error toast here as it might be too frequent with auto-refresh
    }
  };

  // Set maxDate to today on mount
  useEffect(() => {
    const today = new Date();
    setMaxDate(today.toISOString().split('T')[0]);
  }, []);

  // Set up periodic refresh of assignments with error boundary
  useEffect(() => {
    fetchAssignments();

    const refreshInterval = setInterval(() => {
      fetchAssignments().catch(error => {
        console.error('Background refresh failed:', error);
        // Silent fail for background refresh
      });
    }, 5 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  // Single useEffect for initial data fetching
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      
      try {
        // Fetch employees for assignment display
        const employeesResponse = await fetch('/api/employees');
        if (employeesResponse.ok) {
          const employeesData = await employeesResponse.json();
          setAllEmployees(employeesData);
        }

        // Fetch all assignments for displaying in the table
        const assignmentsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/assignments/cache`);
        if (!assignmentsResponse.ok) throw new Error('Failed to fetch assignments');
        const { data: assignmentsData } = await assignmentsResponse.json();
        
        // Filter out recorded assignments for the AddRevenue modal
        const unrecordedAssignments = assignmentsData.filter((a: Assignment) => !a.is_revenue_recorded);
        setAssignments(unrecordedAssignments);
        
        // Store all assignments for table display
        setAllAssignments(assignmentsData);
        
        // Then fetch revenues
        const revenuesResponse = await fetch('/api/revenues');
        if (!revenuesResponse.ok) throw new Error('Failed to fetch revenues');
        
        const revenues: RevenueRecord[] = await revenuesResponse.json();
        
        const transformedData: RevenueData[] = revenues.map(revenue => ({
          revenue_id: revenue.revenue_id,
          category: revenue.category,
          source: revenue.source,
          total_amount: Number(revenue.total_amount),
          collection_date: new Date(revenue.collection_date).toISOString().split('T')[0],
          created_by: revenue.created_by, // Add this line to fix the error
          created_at: revenue.created_at,
          assignment_id: revenue.assignment_id,
        }));
        
        setData(transformedData);
      } catch (error) {
        console.error('Error fetching data:', error);
        showError('Failed to load data', 'Error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();

    // Set up periodic refresh of assignments
    const refreshInterval = setInterval(() => {
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/assignments/cache`)
        .then(response => response.json())
        .then(({ data }) => {
          if (data) {
            // Filter out recorded assignments for the AddRevenue modal
            const unrecordedAssignments = data.filter((a: Assignment) => !a.is_revenue_recorded);
            setAssignments(unrecordedAssignments);
            // Store all assignments for table display
            setAllAssignments(data);
          }
        })
        .catch(error => console.error('Background refresh failed:', error));
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, []); // Empty dependency array as we only want this to run once on mount

  // Filter and pagination logic
  const filteredData = data.filter((item: RevenueData) => {
    // Convert search to lowercase for case-insensitive comparison
    const searchLower = search.toLowerCase();

    // Lookup the related assignment
    const assignment = item.assignment_id 
    ? allAssignments.find(a => a.assignment_id === item.assignment_id)
    : null;

    // Check if search term exists in any field
    const matchesSearch = search === '' || 
    // Basic revenue fields
    formatDate(item.collection_date).toLowerCase().includes(searchLower) ||
    (item.category?.name?.toLowerCase() || '').includes(searchLower) ||
    (item.source?.name?.toLowerCase() || '').includes(searchLower) ||
    item.total_amount.toString().includes(searchLower) ||
    (item.created_by?.toLowerCase() || '').includes(searchLower) ||

    // Assignment related fields (if available)
    (assignment?.bus_type?.toLowerCase() || '').includes(searchLower) ||
    (assignment?.bus_plate_number?.toLowerCase() || '').includes(searchLower) ||
    (assignment?.bus_route?.toLowerCase() || '').includes(searchLower) ||
    (assignment?.driver_id?.toLowerCase() || '').includes(searchLower) ||
    (assignment?.conductor_id?.toLowerCase() || '').includes(searchLower) ||
    (assignment?.date_assigned && formatDate(assignment.date_assigned).toLowerCase().includes(searchLower));

    const matchesCategory = categoryFilter ? item.category.name === categoryFilter : true;
    const matchesDate = (!dateFrom || item.collection_date >= dateFrom) && 
            (!dateTo || item.collection_date <= dateTo);
    return matchesSearch && matchesCategory && matchesDate;
  });

  const indexOfLastRecord = currentPage * pageSize;
  const indexOfFirstRecord = indexOfLastRecord - pageSize;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleAddRevenue = async (newRevenue: {
    category_id: string;
    assignment_id?: string;
    total_amount: number;
    collection_date: string;
    created_by: string;
  }) => {
    try {
      // Check for duplicates if assignment is provided
      if (newRevenue.assignment_id) {
      const duplicate = data.find(item => {
        const assignment = assignments.find(a => a.assignment_id === newRevenue.assignment_id) as Assignment | undefined;
        const itemAssignment = item.assignment_id 
          ? assignments.find(a => a.assignment_id === item.assignment_id) as Assignment | undefined
          : null;

        if (!assignment || !itemAssignment) return false;

        return (
          new Date(assignment.date_assigned).toISOString().split('T')[0] === newRevenue.collection_date &&
          assignment.bus_plate_number === itemAssignment.bus_plate_number &&
          item.category.name === 'Boundary' && // This will need to be updated based on the category
          assignment.driver_id === itemAssignment.driver_id &&
          assignment.conductor_id === itemAssignment.conductor_id
        );
      });

        if (duplicate) {
          showError('Duplicate revenue record found for the same assignment.', 'Error');
          return;
        }
      }

      // Existing code to create revenue record
    const response = await fetch('/api/revenues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category_id: newRevenue.category_id,
        total_amount: newRevenue.total_amount,
        collection_date: new Date(newRevenue.collection_date).toISOString(),
        created_by: newRevenue.created_by,
        assignment_id: newRevenue.assignment_id || null,
      })
    });

    if (!response.ok) throw new Error('Create failed');

    const result: RevenueRecord = await response.json();
    
    // Update revenues state
    setData(prev => [{
      revenue_id: result.revenue_id,
      category: result.category,
      source: result.source,
      total_amount: Number(result.total_amount),
      collection_date: new Date(result.collection_date).toISOString().split('T')[0],
      created_by: result.created_by,
      created_at: result.created_at, // Ensure created_at is included
      assignment_id: result.assignment_id,
    }, ...prev]); // Prepend new record instead of appending

    // Update assignments state locally instead of re-fetching
    if (newRevenue.assignment_id) {
      const response = await fetch(`/api/assignments/${newRevenue.assignment_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_revenue_recorded: true })
      });

      if (response.ok) {
        setAssignments(prev => prev.map(assignment => 
          assignment.assignment_id === newRevenue.assignment_id 
            ? { ...assignment, is_revenue_recorded: true }
            : assignment
        ));
      }
    }

    showSuccess('Revenue added successfully', 'Success');
    setShowModal(false);
  } catch (error) {
    console.error('Create error:', error);
    showError('Failed to add revenue: ' + (error instanceof Error ? error.message : 'Unknown error'), 'Error');
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
        showSuccess('Record deleted successfully', 'Deleted');
      } catch (error) {
        console.error('Delete error:', error);
        showError('Failed to delete record', 'Error');
      }
    }
  };

  const handleSaveEdit = async (updatedRecord: {
    revenue_id: string;
    collection_date: string;
    total_amount: number;
  }) => {
    try {
      const response = await fetch(`/api/revenues/${updatedRecord.revenue_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecord)
      });

      if (!response.ok) throw new Error('Update failed');

      const result = await response.json();
      
      // Update local state by moving the edited record to the top
      setData(prev => {
        // Remove the old version of the record
        const filtered = prev.filter(rec => rec.revenue_id !== updatedRecord.revenue_id);
        // Create the updated record with all required fields
        const updated: RevenueData = {
          revenue_id: result.revenue_id,
          category: result.category,
          source: result.source,
          total_amount: Number(result.total_amount),
          collection_date: new Date(result.collection_date).toISOString().split('T')[0],
          created_by: result.created_by,
          created_at: result.created_at,
          assignment_id: result.assignment_id,
        };
        // Add the updated record at the beginning of the array
        return [updated, ...filtered];
      });

      setEditModalOpen(false);
      setRecordToEdit(null);
      showSuccess('Record updated successfully', 'Success');
    } catch (error) {
      console.error('Update error:', error);
      showError('Failed to update record', 'Error');
    }
  };

  // Generate the file name helper function
  const generateFileName = () => {
    const now = new Date();
    const timeStamp = now.toISOString().replace(/[:.]/g, '-').split('T')[1].slice(0, 8);
    const dateStamp = now.toISOString().split('T')[0];
    
    let fileName = 'revenue_records';
    
    if (categoryFilter) {
      fileName += `_${categoryFilter.toLowerCase().replace('_', '-')}`;
    }
    
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom).toISOString().split('T')[0] : 'all';
      const to = dateTo ? new Date(dateTo).toISOString().split('T')[0] : 'present';
      fileName += `_${from}_to_${to}`;
    }
    
    fileName += `_${dateStamp}_${timeStamp}`;
    
    return `${fileName}.csv`;
  };

  const getExportColumns = () => {
    const baseColumns = [
      "Collection Date",
      "Category",
      "Amount"
    ];

    if (!categoryFilter) {
      return [
        ...baseColumns,
        "Bus Type",
        "Plate Number",
        "Route",
        "Driver ID",
        "Conductor ID",
        "Assignment Date"
      ];
    }

    return [
      ...baseColumns,
      "Bus Type",
      "Plate Number",
      "Route",
      "Driver ID",
      "Conductor ID",
      "Assignment Date"
    ];
  };

  // Generate export details helper function
  const generateExportDetails = () => {
    let details = `Export Details:\n`;
    details += `Category: ${categoryFilter || 'All Categories'}\n`;
    
    if (dateFrom || dateTo) {
      const from = dateFrom ? formatDate(dateFrom) : 'Beginning';
      const to = dateTo ? formatDate(dateTo) : 'Present';
      details += `Date Range: ${from} to ${to}\n`;
    } else {
      details += `Date Range: All Dates\n`;
    }
    
    details += `Total Records: ${filteredData.length}\n`;
    details += `Export Time: ${new Date().toISOString()}\n`;
    details += `Exported Columns: ${getExportColumns().join(', ')}`;
    
    return details;
  };

  // Add a new function to handle audit logging
  const logExportAudit = async () => {
    try {
      // First get the export ID from the API
      const idResponse = await fetch('/api/generate-export-id');
      if (!idResponse.ok) {
        throw new Error('Failed to generate export ID');
      }
      const { exportId } = await idResponse.json();

      // Generate details without export ID
      const details = generateExportDetails();

      const response = await fetch('/api/auditlogs/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'EXPORT',
          table_affected: 'RevenueRecord',
          record_id: exportId,  // Export ID only appears here
          performed_by: 'user1', // Replace with actual user ID
          details: details
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create audit log');
      }
  
      return exportId;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      throw error;
    }
  };

  // Modify the handleExport function
  const handleExport = () => {
    // Generate confirmation message helper function
    const generateConfirmationMessage = () => {
      let message = `<strong>Revenue Records Export</strong><br/><br/>`;
      
      if (categoryFilter) {
        message += `<strong>Category:</strong> ${categoryFilter}<br/>`;
      } else {
        message += `<strong>Category:</strong> All Categories<br/>`;
      }
      
      if (dateFrom || dateTo) {
        const from = dateFrom ? formatDate(dateFrom) : 'Beginning';
        const to = dateTo ? formatDate(dateTo) : 'Present';
        message += `<strong>Date Range:</strong> ${from} to ${to}<br/>`;
      } else {
        message += `<strong>Date Range:</strong> All Dates<br/>`;
      }
      
      message += `<strong>Total Records:</strong> ${filteredData.length}`;
      return message;
    };
  
    // Show confirmation dialog
    Swal.fire({
      title: 'Confirm Export',
      html: generateConfirmationMessage(),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Export CSV',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'export-confirmation-dialog'
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        if (filteredData.length === 0) {
          Swal.fire({
            title: 'No Records Found',
            text: 'There are no records to export based on current filters. Do you want to proceed anyway?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Export Empty File',
            cancelButtonText: 'Cancel',
          }).then(async (emptyResult) => {
            if (emptyResult.isConfirmed) {
              try {
                // First log the audit, which will generate the export ID
                const exportId = await logExportAudit();
                // Then perform the export
                await performExport(filteredData, exportId);
              } catch (error) {
                console.error('Export failed:', error);
                showError('Failed to complete export', 'Error');
              }
            }
          });
          return;
        }
        try {
          // First log the audit, which will generate the export ID
          const exportId = await logExportAudit();
          // Then perform the export
          await performExport(filteredData, exportId);
        } catch (error) {
          console.error('Export failed:', error);
          showError('Failed to complete export', 'Error');
        }
      }
    });
  };

  const performExport = (recordsToExport: RevenueData[], exportId: string) => {
    // Generate header comment with consistent collection_date formatting
    const generateHeaderComment = () => {
      let comment = '"# Revenue Records Export","","","","","","","","","",""\n';
      comment += `"# Export ID:","${exportId}","","","","","","","","",""\n`; // Keep in CSV if needed
      comment += `"# Generated:","${formatDate(new Date())}","","","","","","","","",""\n`;
      
      if (categoryFilter) {
        comment += `"# Category:","${categoryFilter}","","","","","","","","",""\n`;
      } else {
        comment += '"# Category:","All Categories","","","","","","","","",""\n';
      }
      
      if (dateFrom || dateTo) {
        const from = dateFrom ? formatDate(dateFrom) : 'Beginning';
        const to = dateTo ? formatDate(dateTo) : 'Present';
        comment += `"# Date Range:","${from} to ${to}","","","","","","","","",""\n`;
      } else {
        comment += '"# Date Range:","All Dates","","","","","","","","",""\n';
      }
      
      comment += `"# Total Records:","${recordsToExport.length}","","","","","","","","",""\n\n`;
      return comment;
    };

        const columns = getExportColumns();
        const headers = columns.join(",") + "\n";
      
        const rows = recordsToExport.map(item => {
          const assignment = item.assignment_id 
            ? allAssignments.find(a => a.assignment_id === item.assignment_id)
            : null;
          const escapeField = (field: string | undefined) => {
            if (!field) return '';
            if (field.includes(',') || field.includes('"') || field.includes('\n')) {
              return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
          };

                const rowData: string[] = [];
        
          columns.forEach(col => {
            switch(col) {
              case "Collection Date":
                rowData.push(escapeField(formatDate(item.collection_date)));
                break;
              case "Category":
                rowData.push(escapeField(item.category?.name || 'N/A'));
                break;
              case "Amount":
                rowData.push(item.total_amount.toFixed(2));
                break;
              case "Bus Type":
                rowData.push(escapeField(assignment?.bus_type));
                break;
              case "Plate Number":
                rowData.push(escapeField(assignment?.bus_plate_number));
                break;
              case "Route":
                rowData.push(escapeField(assignment?.bus_route));
                break;
              case "Driver ID":
                rowData.push(escapeField(assignment?.driver_id));
                break;
              case "Conductor ID":
                rowData.push(escapeField(assignment?.conductor_id));
                break;
              case "Assignment Date":
                rowData.push(escapeField(assignment?.date_assigned ? formatDate(assignment.date_assigned) : ''));
                break;
              default:
                rowData.push('');
            }
          });
          return rowData.join(',');
        }).join("\n");
      
        const blob = new Blob([generateHeaderComment() + headers + rows], { 
          type: "text/csv;charset=utf-8;" 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = generateFileName();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

  if (loading) {
        return (
            <div className="card">
                <h1 className="title">Revenue Records</h1>
                <Loading />
            </div>
        );
    }

  return (
    <div className="card">
      <div className="elements">
        {/* {(loading || assignmentsLoading) && <div className="loading">Loading...</div>} */}
        <div className="title"> 
          <h1>Revenue Records</h1> 
        </div>
        <div className="settings">
          {/* search bar */}
          <div className="searchBar">
            <i className="ri-search-line" />
            <input
              type="text"
              placeholder="Search here..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            /> 
          </div>

          <div className="filters">
            <input
              type="date"
              className="dateFilter"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={maxDate}
            />

            <input
              type="date"
              className="dateFilter"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              max={maxDate}
            />

            <select
              value={categoryFilter}
              id="categoryFilter"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="Boundary">Boundary</option>
              <option value="Percentage">Percentage</option>
            </select>

            {/* Export CSV */}
            <button id="export" onClick={handleExport}><i className="ri-receipt-line" /> Export CSV</button>
            {/* Add Revenue */}
            <button onClick={() => setShowModal(true)} id='addRevenue'><i className="ri-add-line" /> Add Revenue</button>
          
            
          </div>
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Collection Date</th>
                  <th>Category</th>
                  <th>Assignment</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map(item => {
                const assignment = item.assignment_id 
                  ? allAssignments.find(a => a.assignment_id === item.assignment_id)
                  : null;

                  console.log('Assignment for revenue:', item.revenue_id, assignment); // Debug log

                  // Format assignment for display
                  const formatAssignment = (assignment: Assignment | null | undefined) => {
                    if (!assignment) return 'N/A';
                    const busType = assignment.bus_type === 'Airconditioned' ? 'A' : 'O';
                    const driver = allEmployees.find(e => e.employee_id === assignment.driver_id);
                    const conductor = allEmployees.find(e => e.employee_id === assignment.conductor_id);
                    
                    // Calculate display amount based on category
                    const selectedCategory = item.category;
                    let displayAmount = assignment.trip_revenue;
                    if (selectedCategory?.name === 'Percentage' && assignment.assignment_value) {
                      displayAmount = assignment.trip_revenue * (assignment.assignment_value / 100);
                    }
                    
                    return `${formatDate(assignment.date_assigned)} | ₱ ${displayAmount.toLocaleString()} | ${assignment.bus_plate_number} (${busType}) - ${assignment.bus_route} | ${driver?.name || 'N/A'} & ${conductor?.name || 'N/A'}`;
                  };

                  return (
                    <tr key={item.revenue_id}>
                      <td>{formatDateTime(item.collection_date)}</td>
                      <td>{item.category?.name || 'N/A'}</td>
                      <td>{formatAssignment(assignment)}</td>
                      <td>₱{item.total_amount.toLocaleString()}</td>
                      <td className="actionButtons">
                        <div className="actionButtonsContainer">
                          {/* view button */}
                          <button 
                            className="viewBtn" 
                            onClick={() => {
                              setRecordToView(item);
                              setViewModalOpen(true);
                            }} 
                            title="View Record"
                          >
                            <i className="ri-eye-line" />
                          </button>
                          
                          {/* edit button */}
                          <button 
                            className="editBtn" 
                            onClick={() => {
                              setRecordToEdit(item);
                              setEditModalOpen(true);
                            }} 
                            title="Edit Record"
                          >
                            <i className="ri-edit-2-line" />
                          </button>
                          
                          {/* delete button */}
                          <button 
                            className="deleteBtn" 
                            onClick={() => handleDelete(item.revenue_id)} 
                            title="Delete Record"
                          >
                            <i className="ri-delete-bin-line" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {currentRecords.length === 0 && !loading && <p>No records found.</p>}
          </div>
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
              revenue_id: recordToEdit.revenue_id,
              collection_date: recordToEdit.collection_date,
              category: recordToEdit.category.name,
              amount: recordToEdit.total_amount,
              assignment_id: recordToEdit.assignment_id,
            }}
            onClose={() => {
              setEditModalOpen(false);
              setRecordToEdit(null);
            }}
            onSave={handleSaveEdit}
          />
        )}

        {viewModalOpen && recordToView && (
          <ViewRevenue
            record={{
              revenue_id: recordToView.revenue_id,
              category: recordToView.category,
              total_amount: recordToView.total_amount,
              collection_date: recordToView.collection_date,
              created_at: recordToView.created_at,
              assignment: recordToView.assignment_id 
                ? allAssignments.find(a => a.assignment_id === recordToView.assignment_id)
                : undefined,
            }}
            onClose={() => {
              setViewModalOpen(false);
              setRecordToView(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default RevenuePage;
