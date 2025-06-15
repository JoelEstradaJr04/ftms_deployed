// app\PageContent\revenuePage.tsx
"use client";

import React, { useState, useEffect } from "react";
import "../../styles/revenue.css";
import "../../styles/table.css";
import PaginationComponent from "../../Components/pagination";
import AddRevenue from "./addRevenue"; 
import Swal from 'sweetalert2';
import EditRevenueModal from "./editRevenue";
import { getUnrecordedRevenueAssignments, getAllAssignmentsWithRecorded, type Assignment } from '@/lib/supabase/assignments';
import { formatDate } from '../../utility/dateFormatter';
import Loading from '../../Components/loading';
import { showSuccess, showError} from '../../utility/Alerts';

// Define interface based on your Prisma RevenueRecord schema
interface RevenueRecord {
  revenue_id: string;        
  assignment_id?: string;    
  category: 'Boundary' | 'Percentage' | 'Bus_Rental' | 'Other'; 
  total_amount: number;      
  collection_date: string;              
  created_by: string;        
  created_at: string;        
  updated_at?: string;       
  is_deleted: boolean;
  other_source?: string; // Add this line
}

// Updated Assignment interface to include assignment_type and is_revenue_recorded
// Update the Assignment interface
interface RevenueData {
  revenue_id: string;
  category: string;
  total_amount: number;
  collection_date: string;
  created_by: string;
  assignment_id?: string;
  other_source?: string;
}

const RevenuePage = () => {
  const [data, setData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<RevenueData | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);

  // Reuse the same format function from addRevenue.tsx
  const formatAssignment = (assignment: Assignment): string => {
    const busType = assignment.bus_type === 'Airconditioned' ? 'A' : 'O';
    return `${busType} | ${assignment.bus_bodynumber} - ${assignment.bus_route} | ${assignment.driver_name.split(' ').pop()} & ${assignment.conductor_name.split(' ').pop()} | ${formatDate(assignment.date_assigned)}`;
  };

  // Fetch assignments with periodic refresh and error handling
  const fetchAssignments = async () => {
    try {
      setAssignmentsLoading(true);
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
    } finally {
      setAssignmentsLoading(false);
    }
  };

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
      setAssignmentsLoading(true);
      
      try {
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
          total_amount: Number(revenue.total_amount),
          collection_date: new Date(revenue.collection_date).toISOString().split('T')[0],
          created_by: revenue.created_by,
          assignment_id: revenue.assignment_id,
          other_source: revenue.other_source || undefined
        }));
        
        setData(transformedData);
      } catch (error) {
        console.error('Error fetching data:', error);
        showError('Failed to load data', 'Error');
      } finally {
        setLoading(false);
        setAssignmentsLoading(false);
      }
    };
    
    fetchAllData();

    // Set up periodic refresh of assignments
    const refreshInterval = setInterval(() => {
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/assignments/cache`)
        .then(response => response.json())
        .then(({ data }) => {
          if (data) setAssignments(data);
        })
        .catch(error => console.error('Background refresh failed:', error));
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, []); // Empty dependency array as we only want this to run once on mount

  // Filter and pagination logic
  const filteredData = data.filter((item: RevenueData) => {
    const matchesSearch = (item.category?.toLowerCase() || '').includes(search.toLowerCase()) ||
                         (item.category === 'Other' && (item.other_source?.toLowerCase() || '').includes(search.toLowerCase()));
    const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
    const matchesDate = (!dateFrom || item.collection_date >= dateFrom) && 
                      (!dateTo || item.collection_date <= dateTo);
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
    collection_date: string;
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
          new Date(assignment.date_assigned).toISOString().split('T')[0] === newRevenue.collection_date &&
          assignment.bus_bodynumber === itemAssignment.bus_bodynumber &&
          item.category === newRevenue.category &&
          assignment.driver_name === itemAssignment.driver_name &&
          assignment.conductor_name === itemAssignment.conductor_name
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
        category: newRevenue.category,
        total_amount: newRevenue.total_amount,
        collection_date: new Date(newRevenue.collection_date).toISOString(),
        created_by: newRevenue.created_by,
        assignment_id: newRevenue.assignment_id || null,
        other_source: newRevenue.category === 'Other' ? newRevenue.other_source : null
      })
    });

    if (!response.ok) throw new Error('Create failed');

    const result: RevenueRecord = await response.json();
    
    // Update revenues state
    setData(prev => [{
      revenue_id: result.revenue_id,
      category: result.category,
      total_amount: Number(result.total_amount),
      collection_date: new Date(result.collection_date).toISOString().split('T')[0],
      created_by: result.created_by,
      assignment_id: result.assignment_id,
      other_source: result.other_source || undefined
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
    other_source?: string;
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
        // Create the updated record
        const updated = {
          revenue_id: result.revenue_id,
          category: result.category,
          total_amount: Number(result.total_amount),
          collection_date: new Date(result.collection_date).toISOString().split('T')[0],
          created_by: result.created_by,
          assignment_id: result.assignment_id,
          other_source: result.other_source || undefined
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
      "Amount",
      "Source Type"
    ];

    if (!categoryFilter) {
      return [
        ...baseColumns,
        "Bus Type",
        "Body Number",
        "Route",
        "Driver Name",
        "Conductor Name",
        "Assignment Date",
        "Other Source Description"
      ];
    }

    if (categoryFilter === 'Other') {
      return [
        ...baseColumns,
        "Other Source Description"
      ];
    }

    return [
      ...baseColumns,
      "Bus Type",
      "Body Number",
      "Route",
      "Driver Name",
      "Conductor Name",
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
                rowData.push(escapeField(item.category));
                break;
              case "Amount":
                rowData.push(item.total_amount.toFixed(2));
                break;
              case "Source Type":
                rowData.push(assignment ? 'Assignment' : 'Other');
                break;
              case "Bus Type":
                rowData.push(escapeField(assignment?.bus_type));
                break;
              case "Body Number":
                rowData.push(escapeField(assignment?.bus_bodynumber));
                break;
              case "Route":
                rowData.push(escapeField(assignment?.bus_route));
                break;
              case "Driver Name":
                rowData.push(escapeField(assignment?.driver_name));
                break;
              case "Conductor Name":
                rowData.push(escapeField(assignment?.conductor_name));
                break;
              case "Assignment Date":
                rowData.push(escapeField(assignment?.date_assigned ? formatDate(assignment.date_assigned) : ''));
                break;
                        case "Other Source Description":
                rowData.push(escapeField(item.other_source));
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
            />

            <input
              type="date"
              className="dateFilter"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />

            <select
              value={categoryFilter}
              id="categoryFilter"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="Boundary">Boundary</option>
              <option value="Percentage">Percentage</option>
              <option value="Bus_Rental">Bus Rental</option>
              <option value="Other">Other</option>
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
                  <th>Source</th>
                  <th>Category</th>
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

                  let source: string;
                  if (item.category === 'Other') {
                    source = item.other_source || 'N/A';
                  } else if (assignmentsLoading) {
                    source = 'Loading...';
                  } else if (assignment) {
                    source = formatAssignment(assignment);
                  } else {
                    // More descriptive message when assignment is not found
                    source = item.assignment_id 
                      ? `Assignment ${item.assignment_id} not found`
                      : 'No assignment linked';
                  }

                  return (
                    <tr key={item.revenue_id}>
                      <td>{formatDate(item.collection_date)}</td>
                      <td>{source}</td>
                      <td>{item.category === 'Other' ? 'Other' : item.category.replace('_', ' ')}</td>
                      <td>₱{item.total_amount.toLocaleString()}</td>
                      <td className="actionButtons">

                        <div className="actionButtonsContainer">
                          {/* edit button */}
                          <button className="editBtn" onClick={() => {setRecordToEdit(item);setEditModalOpen(true);}} title="Edit Record">
                            <i className="ri-edit-2-line" />
                          </button>
                          {/* delete button */}
                          <button className="deleteBtn" onClick={() => handleDelete(item.revenue_id)} title="Delete Record">
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
              category: recordToEdit.category,
              source: recordToEdit.assignment_id 
                ? formatAssignment(allAssignments.find(a => a.assignment_id === recordToEdit.assignment_id)!)
                : recordToEdit.other_source || 'N/A',
              amount: recordToEdit.total_amount,
              assignment_id: recordToEdit.assignment_id,
              other_source: recordToEdit.other_source
            }}
            onClose={() => {
              setEditModalOpen(false);
              setRecordToEdit(null);
            }}
            onSave={handleSaveEdit}
          />
        )}
      </div>
    </div>
  );
};

export default RevenuePage;
