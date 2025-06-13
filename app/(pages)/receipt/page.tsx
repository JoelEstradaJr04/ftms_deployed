"use client";

import React, { useState, useEffect } from "react";
import "../../styles/receipt.css";
import "../../styles/table.css";
import PaginationComponent from "../../Components/pagination";
import Swal from 'sweetalert2';
import { formatDate } from '../../utility/dateFormatter';
import ViewReceiptModal from './viewReceipt';
import EditReceiptModal from './editReceipt';
import AddReceipt from './addReceipt';

// Define interface based on your Prisma Receipt schema
interface Receipt {
  receipt_id: string;
  supplier: string;
  transaction_date: string;
  vat_reg_tin?: string;
  terms?: string;
  date_paid?: string;
  payment_status: 'Paid' | 'Pending' | 'Cancelled' | 'Dued';
  record_status: 'Active' | 'Inactive';
  total_amount: number;
  vat_amount?: number;
  total_amount_due: number;
  created_at: string;
  updated_at?: string;
  created_by: string;
  updated_by?: string;
  is_deleted: boolean;
  deletion_reason?: string;
  deleted_by?: string;
  deleted_at?: string;
  source: 'Manual_Entry' | 'OCR_Camera' | 'OCR_File';
  category: 'Fuel' | 'Vehicle_Parts' | 'Tools' | 'Equipment' | 'Supplies' | 'Other' | 'Multiple_Categories';
  other_category?: string;
  remarks?: string;
  ocr_confidence?: number;
  ocr_file_path?: string;
  items: ReceiptItem[];
}

interface ReceiptItem {
  receipt_item_id: string;
  item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category?: string;
}

interface ReceiptResponse {
  receipts: Receipt[];
  pagination: {
    total: number;
    pages: number;
    current: number;
    limit: number;
  };
}

interface NewReceiptItem {
  receipt_item_id?: string;
  item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface AddReceiptFormData {
  supplier: string;
  transaction_date: string;
  vat_reg_tin?: string;
  terms?: string;
  date_paid?: string;
  payment_status: 'Paid' | 'Pending' | 'Cancelled' | 'Dued';
  total_amount: number;
  vat_amount?: number;
  total_amount_due: number;
  category: 'Fuel' | 'Vehicle_Parts' | 'Tools' | 'Equipment' | 'Supplies' | 'Other' | 'Multiple_Categories';
  remarks?: string;
  source: 'Manual_Entry' | 'OCR_Camera' | 'OCR_File';
  items: NewReceiptItem[];
  created_by: string;
}

const ReceiptPage = () => {
  const [data, setData] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<Receipt | null>(null);
  const [recordToView, setRecordToView] = useState<Receipt | null>(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Fetch receipts data
  const fetchReceipts = async () => {
    try {
      const response = await fetch('/api/receipts');
      if (!response.ok) throw new Error('Failed to fetch receipts');
      const data: ReceiptResponse = await response.json();
      setData(data.receipts); // Set the receipts array from the response
    } catch (error) {
      console.error('Error fetching receipts:', error);
      Swal.fire('Error', 'Failed to load receipts', 'error');
    }
  };

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchReceipts();
      setLoading(false);
    };
    loadData();
  }, []);

  // Auto-reload data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch data when lastUpdate changes
  useEffect(() => {
    if (!loading && !showModal && !editModalOpen) {
      fetchReceipts();
    }
  }, [lastUpdate, loading, showModal, editModalOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter, dateFrom, dateTo, pageSize]);

  // Filter and pagination logic
  const filteredData = data
    .filter((item: Receipt) => {
      const matchesSearch = (
        item.supplier.toLowerCase().includes(search.toLowerCase()) ||
        item.receipt_id.toLowerCase().includes(search.toLowerCase())
      );
      const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
      const matchesStatus = statusFilter ? item.payment_status === statusFilter : true;
      const matchesDate = (!dateFrom || item.transaction_date >= dateFrom) && 
                        (!dateTo || item.transaction_date <= dateTo);
      return matchesSearch && matchesCategory && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at);
      const dateB = new Date(b.updated_at || b.created_at);
      return dateB.getTime() - dateA.getTime(); // Sort by latest first
    });

  const indexOfLastRecord = currentPage * pageSize;
  const indexOfFirstRecord = indexOfLastRecord - pageSize;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  const handleDelete = async (receipt_id: string) => {
    const result = await Swal.fire({
      title: 'Delete Receipt',
      text: 'Are you sure you want to delete this receipt?',
      input: 'text',
      inputLabel: 'Reason for deletion',
      inputPlaceholder: 'Enter reason for deletion',
      inputValidator: (value) => {
        if (!value) {
          return 'Please provide a reason for deletion';
        }
      },
      showCancelButton: true,
      confirmButtonColor: '#961C1E',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!',
      background: 'white',
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/receipts/${receipt_id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: result.value }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete receipt');
        }

        await Swal.fire('Deleted!', 'Receipt has been deleted.', 'success');
        fetchReceipts(); // Refresh the list
      } catch (error) {
        console.error('Error deleting receipt:', error);
        Swal.fire('Error', error instanceof Error ? error.message : 'Failed to delete receipt', 'error');
      }
    }
  };

  // Generate the file name helper function
  const generateFileName = () => {
    const now = new Date();
    const timeStamp = now.toISOString().replace(/[:.]/g, '-').split('T')[1].slice(0, 8);
    const dateStamp = now.toISOString().split('T')[0];
    
    let fileName = 'receipt_records';
    
    if (categoryFilter) {
      fileName += `_${categoryFilter.toLowerCase().replace('_', '-')}`;
    }
    
    if (statusFilter) {
      fileName += `_${statusFilter.toLowerCase()}`;
    }
    
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom).toISOString().split('T')[0] : 'all';
      const to = dateTo ? new Date(dateTo).toISOString().split('T')[0] : 'present';
      fileName += `_${from}_to_${to}`;
    }
    
    fileName += `_${dateStamp}_${timeStamp}`;
    
    return `${fileName}.csv`;
  };

  const handleExport = () => {
    // Generate confirmation message helper function
    const generateConfirmationMessage = () => {
      let message = `<strong>Receipt Records Export</strong><br/><br/>`;
      
      if (categoryFilter) {
        message += `<strong>Category:</strong> ${categoryFilter}<br/>`;
      } else {
        message += `<strong>Category:</strong> All Categories<br/>`;
      }

      if (statusFilter) {
        message += `<strong>Status:</strong> ${statusFilter}<br/>`;
      } else {
        message += `<strong>Status:</strong> All Statuses<br/>`;
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
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#961C1E',
      confirmButtonText: 'Export',
      background: 'white',
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          performExport(filteredData);
          Swal.fire('Success', 'Export completed successfully', 'success');
        } catch (error) {
          console.error('Export error:', error);
          Swal.fire('Error', 'Failed to export data', 'error');
        }
      }
    });
  };

  const performExport = (recordsToExport: Receipt[]) => {
    const headers = [
      "Receipt ID",
      "Transaction Date",
      "Supplier",
      "Category",
      "Payment Status",
      "Total Amount",
      "VAT Amount",
      "Total Due",
      "Source",
      "OCR Confidence",
      "Created By",
      "Created At"
    ].join(",") + "\n";
  
  // Update in the performExport function
  const rows = recordsToExport.map(item => {
    const escapeField = (field: string | undefined | number) => {
      if (field === undefined || field === null) return '';
      const stringField = String(field);
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
    };

    const formatMoney = (amount: number) => {
      return Number(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    return [
      escapeField(item.receipt_id),
      escapeField(formatDate(item.transaction_date)),
      escapeField(item.supplier),
      escapeField(item.category.replace('_', ' ')),
      escapeField(item.payment_status),
      escapeField(formatMoney(item.total_amount)),
      escapeField(item.vat_amount ? formatMoney(item.vat_amount) : ''),
      escapeField(formatMoney(item.total_amount_due)),
      escapeField(item.source.replace('_', ' ')),
      escapeField(item.ocr_confidence ? (item.ocr_confidence * 100).toFixed(1) + '%' : 'N/A'),
      escapeField(item.created_by),
      escapeField(formatDate(item.created_at))
    ].join(',');
  }).join("\n");
  
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = generateFileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Add new receipt handler
  const handleAddReceipt = async (formData: AddReceiptFormData) => {
    try {
      const response = await fetch('/api/receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to add receipt');
      }

      await fetchReceipts(); // Refresh the receipts list
      setShowModal(false);
      Swal.fire('Success', 'Receipt added successfully', 'success');
    } catch (error) {
      console.error('Error adding receipt:', error);
      Swal.fire('Error', 'Failed to add receipt', 'error');
    }
  };

  // Helper function to get badge class for payment status
  const getStatusBadgeClass = (status: 'Paid' | 'Pending' | 'Cancelled' | 'Dued') => {
    return `statusBadge ${status.toLowerCase()}`;
  };

  // Helper to get display category for a receipt
  const getDisplayCategory = (receipt: Receipt) => {
    // If category is 'Other', display the other_category value
    if (receipt.category === 'Other' && receipt.other_category) {
      return receipt.other_category;
    }
    
    // For Multiple_Categories, display as "Multiple Categories"
    if (receipt.category === 'Multiple_Categories') {
      return 'Multiple Categories';
    }
    
    // For all other categories, replace all underscores with spaces
    return receipt.category.replace(/_/g, ' ');
  };

  return (
    <div className="card receiptPage">
      <div className="elements">
        <div className="title">
          <h1>Receipt Management</h1>
        </div>
        {loading && <div className="loading">Loading...</div>}

        <div className="settings">
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
              <option value="Fuel">Fuel</option>
              <option value="Vehicle_Parts">Vehicle Parts</option>
              <option value="Tools">Tools</option>
              <option value="Equipment">Equipment</option>
              <option value="Supplies">Supplies</option>
              <option value="Other">Other</option>
              <option value="Multiple_Categories">Multiple Categories</option>
            </select>

            <select
              value={statusFilter}
              id="statusFilter"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Dued">Dued</option>
            </select>

            <button onClick={handleExport} id="export"><i className="ri-file-download-line" /> Export CSV</button>

            <button onClick={() => setShowModal(true)} id='addExpense'><i className="ri-add-line" /> Add Receipt</button>
          </div>
        </div>

        {/* ==========table===========  */}
        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Transaction Date</th>
                  <th>Supplier</th>
                  <th>Category</th>
                  <th>Terms</th>
                  <th>Total Amount Due</th>
                  <th>Payment Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map((item, index) => (
                  <tr key={item.receipt_id}>
                    <td>{indexOfFirstRecord + index + 1}</td>
                    <td>{formatDate(item.transaction_date)}</td>
                    <td>{item.supplier}</td>
                    <td>{getDisplayCategory(item)}</td>
                    <td>{item.terms?.replace('_', ' ') || 'Cash'}</td>
                    <td>₱{Number(item.total_amount_due).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}</td>
                    <td>
                      <span className={getStatusBadgeClass(item.payment_status)}>
                        {item.payment_status}
                      </span>
                    </td>
                    <td className="actionButtons">
                      <div className="actionButtonsContainer">
                        <button className="viewBtn" onClick={() => {setRecordToView(item);setViewModalOpen(true);}} title="View Receipt">
                          <i className="ri-eye-line" />
                        </button>
                        <button className="editBtn" onClick={() => {setRecordToEdit(item);setEditModalOpen(true);}} title="Edit Receipt">
                          <i className="ri-edit-2-line" />
                        </button>
                        <button className="deleteBtn" onClick={() => handleDelete(item.receipt_id)} title="Delete Receipt">
                          <i className="ri-delete-bin-line" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {currentRecords.length === 0 && !loading && <p>No records found.</p>}
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={(page) => {
            setCurrentPage(page);
            // Optional: Scroll to top when changing pages
            window.scrollTo(0, 0);
          }}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1); // Reset to first page when changing page size
          }}
        />

        {showModal && (
          <AddReceipt
            onClose={() => setShowModal(false)}
            onAddReceipt={handleAddReceipt}
            currentUser="ftms_user"
          />
        )}

        {viewModalOpen && recordToView && (
          <ViewReceiptModal
            record={recordToView}
            onClose={() => setViewModalOpen(false)}
          />
        )}
        
        {editModalOpen && recordToEdit && (
          <EditReceiptModal
            record={recordToEdit}
            onClose={() => setEditModalOpen(false)}
            onSave={async (updatedRecord) => {
              try {
                const response = await fetch(`/api/receipts/${updatedRecord.receipt_id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updatedRecord),
                });
                
                if (!response.ok) throw new Error('Failed to update receipt');
                
                setData(prev => prev.map(item => 
                  item.receipt_id === updatedRecord.receipt_id ? 
                    {
                      ...item, 
                      ...updatedRecord, 
                      payment_status: updatedRecord.payment_status as 'Paid' | 'Pending' | 'Cancelled' | 'Dued',
                      category: updatedRecord.category as 'Fuel' | 'Vehicle_Parts' | 'Tools' | 'Equipment' | 'Supplies' | 'Other' | 'Multiple_Categories'
                    } 
                    : item
                ));
                setEditModalOpen(false);
                Swal.fire('Success', 'Receipt updated successfully', 'success');
              } catch (error) {
                console.error('Error updating receipt:', error);
                Swal.fire('Error', 'Failed to update receipt', 'error');
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ReceiptPage; 