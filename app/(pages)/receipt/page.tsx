"use client";
import React, { useState, useEffect, useCallback } from "react";
import "../../styles/receipt.css";
import "../../styles/table.css";
import PaginationComponent from "../../Components/pagination";
import Swal from 'sweetalert2';
import { formatDate } from '../../utility/dateFormatter';
import ViewReceiptModal from './viewReceipt';
import EditReceiptModal from './editReceipt';
import AddReceipt from './addReceipt';
import { formatDisplayText } from '@/app/utils/formatting';
import Loading from '../../Components/loading';

// ... (keep all your existing type definitions exactly as they are)
type RawReceiptItem = {
  receipt_item_id: string;
  item_id?: string; 
  item?: {
    item_id: string;
    item_name: string;
    unit: string;
    category: string;
    other_unit?: string;
    other_category?: string;
  };
  item_name?: string;
  unit?: string;
  category?: string;
  other_unit?: string;
  other_category?: string;
  quantity: number | string;
  unit_price: number | string;
  total_price: number | string;
  ocr_confidence?: number;
};

type RawReceipt = {
  receipt_id: string;
  supplier: string;
  transaction_date: string;
  vat_reg_tin?: string;
  terms?: string;
  date_paid?: string;
  payment_status: 'Paid' | 'Pending' | 'Cancelled' | 'Dued';
  record_status?: 'Active' | 'Inactive';
  total_amount: number | string;
  vat_amount?: number | string;
  total_amount_due: number | string;
  created_at: string;
  updated_at?: string;
  created_by: string;
  updated_by?: string;
  is_deleted?: boolean;
  deletion_reason?: string;
  deleted_by?: string;
  deleted_at?: string;
  source: 'Manual_Entry' | 'OCR_Camera' | 'OCR_File';
  category: 'Fuel' | 'Vehicle_Parts' | 'Tools' | 'Equipment' | 'Supplies' | 'Other' | 'Multiple_Categories';
  other_category?: string;
  remarks?: string;
  ocr_confidence?: number;
  ocr_file_path?: string;
  items: RawReceiptItem[];
};

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
  item_id: string;
  item: {
    item_id: string;
    item_name: string;
    unit: string;
    category: string;
    other_unit?: string;
    other_category?: string;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
  ocr_confidence?: number;
  item_name?: string; 
  unit?: string;
  category?: string;
  other_unit?: string;
  other_category?: string;
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
  items: {
    item_name: string;
    unit: string;
    other_unit?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    category: 'Fuel' | 'Vehicle_Parts' | 'Tools' | 'Equipment' | 'Supplies' | 'Other' | 'Multiple_Categories';
    other_category?: string;
  }[];
  created_by: string;
  other_category?: string;
}

interface EditReceiptData extends Omit<Receipt, 'items'> {
  items: {
    receipt_item_id: string;
    item_name: string;
    unit: string;
    other_unit?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    category: string;
    other_category?: string;
  }[];
}

const ReceiptPage = () => {
  const [data, setData] = useState<Receipt[]>([]);
  // Separate loading states for different purposes  
  const [initialLoading, setInitialLoading] = useState(true); // For initial page load
  const [tableLoading, setTableLoading] = useState(false); // For subsequent data fetches
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

  // Helper function to normalize receipt data and ensure type consistency
  const normalizeReceipt = (receiptData: RawReceipt): Receipt => {
    const normalizedItems = receiptData.items.map((item: RawReceiptItem): ReceiptItem => ({
      receipt_item_id: item.receipt_item_id,
      item_id: item.item_id || "",
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      total_price: Number(item.total_price),
      ocr_confidence: item.ocr_confidence,
      item: item.item || {
        item_id: item.item_id || "",
        item_name: item.item_name || "",
        unit: item.unit || "",
        category: item.category || "",
        other_unit: item.other_unit,
        other_category: item.other_category
      },
      item_name: item.item_name || (item.item ? item.item.item_name : ""),
      unit: item.unit || (item.item ? item.item.unit : ""),
      category: item.category || (item.item ? item.item.category : ""),
      other_unit: item.other_unit || (item.item ? item.item.other_unit : undefined),
      other_category: item.other_category || (item.item ? item.item.other_category : undefined)
    }));

    return {
      receipt_id: receiptData.receipt_id,
      supplier: receiptData.supplier,
      transaction_date: receiptData.transaction_date,
      vat_reg_tin: receiptData.vat_reg_tin,
      terms: receiptData.terms,
      date_paid: receiptData.date_paid,
      payment_status: receiptData.payment_status,
      record_status: receiptData.record_status || 'Active',
      total_amount: Number(receiptData.total_amount),
      vat_amount: receiptData.vat_amount ? Number(receiptData.vat_amount) : undefined,
      total_amount_due: Number(receiptData.total_amount_due),
      created_at: receiptData.created_at,
      updated_at: receiptData.updated_at,
      created_by: receiptData.created_by,
      updated_by: receiptData.updated_by,
      is_deleted: receiptData.is_deleted || false,
      deletion_reason: receiptData.deletion_reason,
      deleted_by: receiptData.deleted_by,
      deleted_at: receiptData.deleted_at,
      source: receiptData.source,
      category: receiptData.category,
      other_category: receiptData.other_category,
      remarks: receiptData.remarks,
      ocr_confidence: receiptData.ocr_confidence,
      ocr_file_path: receiptData.ocr_file_path,
      items: normalizedItems
    };
  };

  // Modified fetchReceipts function with loading state management
  const fetchReceipts = useCallback(async (isInitialLoad = false) => {
    // Set appropriate loading state
    if (isInitialLoad) {
      setInitialLoading(true);
    } else {
      setTableLoading(true);
    }

    try {
      const response = await fetch(`/api/receipts?page=${currentPage}&limit=${pageSize}`);
      const result = await response.json();
      const normalizedReceipts = result.receipts.map(normalizeReceipt);
      setData(normalizedReceipts);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      // Clear appropriate loading state
      if (isInitialLoad) {
        setInitialLoading(false);
      } else {
        setTableLoading(false);
      }
    }
  }, [currentPage, pageSize]);

  // Initial data fetch - this will show the full page loading
  useEffect(() => {
    fetchReceipts(true); // Pass true to indicate this is initial load
  }, []); // Only run on component mount

  // Subsequent data fetches for pagination - these will show table loading only
  useEffect(() => {
    // Skip if this is the initial mount (data is already being fetched above)
    if (initialLoading) return;
    
    fetchReceipts(false); // Pass false for subsequent fetches
  }, [currentPage, pageSize, fetchReceipts, initialLoading]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter, dateFrom, dateTo, pageSize]);

  // Show initial loading screen
  if (initialLoading) {
    return <Loading />;
  }

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
      return dateB.getTime() - dateA.getTime();
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
        await fetchReceipts(false); // Refresh data after successful deletion
        
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

  const handleAddReceipt = async (formData: AddReceiptFormData) => {
    try {
      const apiData = {
        ...formData,
        items: formData.items.map(item => ({
          ...item,
          item_id: '',
        }))
      };

      const response = await fetch('/api/receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        throw new Error('Failed to add receipt');
      }

      setShowModal(false);
      await fetchReceipts(false);
      
    } catch (error) {
      console.error('Error adding receipt:', error);
      Swal.fire('Error', 'Failed to add receipt', 'error');
    }
  };
  
  const getStatusBadgeClass = (status: 'Paid' | 'Pending' | 'Cancelled' | 'Dued') => {
    return `statusBadge ${status.toLowerCase()}`;
  };

  const getDisplayCategory = (receipt: Receipt) => {
    if (receipt.category === 'Other' && receipt.other_category) {
      return receipt.other_category;
    }
    
    if (receipt.category === 'Multiple_Categories') {
      return 'Multiple Categories';
    }
    
    return receipt.category.replace(/_/g, ' ');
  };

  return (
    <div className="card receiptPage">
      <div className="elements">
        <div className="title">
          <h1>Receipt Management</h1>
        </div>
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

        <div className="table-wrapper">
          {tableLoading && (
            <div className="table-loading-overlay">
              Loading...
            </div>
          )}
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
                    <td>{formatDisplayText(getDisplayCategory(item) || '')}</td>
                    <td>{formatDisplayText(item.terms || '') || 'Cash'}</td>
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
            {currentRecords.length === 0 && !tableLoading && <p>No records found.</p>}
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={(page) => {
            setCurrentPage(page);
            window.scrollTo(0, 0);
          }}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
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
            record={{
              ...recordToView,
              items: recordToView.items.map(item => ({
                ...item,
                item: item.item || {
                  item_id: item.item_id || '',
                  item_name: item.item_name || '',
                  unit: item.unit || '',
                  category: item.category || '',
                }
              }))
            }}
            onClose={() => setViewModalOpen(false)}
          />
        )}
        
        {editModalOpen && recordToEdit && (
          <EditReceiptModal
            record={{
              ...recordToEdit,
              items: recordToEdit.items.map(item => ({
                ...item,
                item: item.item || {
                  item_id: item.item_id || '',
                  item_name: item.item_name || '',
                  unit: item.unit || '',
                  category: item.category || '',
                }
              }))
            }}
            onClose={() => setEditModalOpen(false)}
            onSave={async (updatedRecord) => {
              try {
                const originalRecord = recordToEdit;
                if (!originalRecord) throw new Error('Original record not found');

                const validCategories = [
                  'Fuel',
                  'Vehicle_Parts',
                  'Tools',
                  'Equipment',
                  'Supplies',
                  'Other',
                  'Multiple_Categories',
                ] as const;

                const castCategory = (category: unknown): EditReceiptData['category'] =>
                  validCategories.includes(category as EditReceiptData['category'])
                    ? (category as EditReceiptData['category'])
                    : 'Other';

                const fullUpdatedRecord: EditReceiptData = {
                  ...originalRecord,
                  ...updatedRecord,
                  category: castCategory(updatedRecord.category),
                  payment_status: updatedRecord.payment_status as 'Paid' | 'Pending' | 'Cancelled' | 'Dued',
                  updated_at: new Date().toISOString(),
                  updated_by: 'ftms_user',
                };

                const response = await fetch(`/api/receipts/${updatedRecord.receipt_id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(fullUpdatedRecord),
                });

                if (!response.ok) throw new Error('Failed to update receipt');

                setEditModalOpen(false);
                await Swal.fire('Success', 'Receipt updated successfully', 'success');
                await fetchReceipts(false);
                
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