"use client";
import React, { useState, useEffect, useCallback } from "react";
import "../../styles/receipt/receipt.css";
import "../../styles/components/table.css";
import PaginationComponent from "../../Components/pagination";
import Swal from 'sweetalert2';
import { formatDateTime } from '../../utility/dateFormatter';
import ViewReceiptModal from './viewReceipt';
import EditReceiptModal from './editReceipt';
import AddReceipt from './addReceipt';
import { formatDisplayText } from '@/app/utils/formatting';
import Loading from '../../Components/loading';
import type { UpdatedReceiptData } from './editReceipt';

type ReceiptItem = {
  receipt_item_id: string;
  item_id: string;
  item: {
    item_id: string;
    item_name: string;
    unit: { id: string, name: string };
    category: { category_id: string, name: string };
  };
  quantity: number;
  unit_price: number;
  total_price: number;
};

type Receipt = {
  receipt_id: string;
  supplier: string;
  transaction_date: string;
  vat_reg_tin?: string;
  terms_id: string;
  terms_name: string;
  date_paid?: string;
  payment_status_id: string;
  payment_status_name: string;
  total_amount: number;
  vat_amount?: number;
  total_amount_due: number;
  created_at: string;
  updated_at?: string;
  created_by: string;        // Ensure this is required
  updated_by?: string;
  source_id: string;         // Ensure this is required
  source_name: string;
  category_id: string;
  category_name: string;
  remarks?: string;
  is_expense_recorded: boolean;
  is_inventory_processed: boolean;
  items: ReceiptItem[];
  other_category?: string;
  is_deleted: boolean;
};

type AddReceiptSubmitData = {
  supplier: string;
  transaction_date: string;
  vat_reg_tin?: string;
  terms_id: string;
  date_paid?: string;
  payment_status_id: string;
  total_amount: number;
  vat_amount?: number;
  total_amount_due: number;
  category_id: string;
  remarks?: string;
  source_id: string;
  items: {
    item_name: string;
    unit_id?: string;
    unit: string;
    other_unit?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    category?: string;
    category_id?: string;
    other_category?: string;
  }[];
  created_by: string;
};

const ReceiptPage = () => {
  const [data, setData] = useState<Receipt[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<Receipt | null>(null);
  const [recordToView, setRecordToView] = useState<Receipt | null>(null);
  const [categories, setCategories] = useState<{ category_id: string; name: string }[]>([]);
  const [sources, setSources] = useState<{ source_id: string; name: string }[]>([]);
  const [terms, setTerms] = useState<{ id: string; name: string }[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<{ id: string; name: string }[]>([]);
  const [itemUnits, setItemUnits] = useState<{ id: string; name: string }[]>([]);
  const [globalsLoading, setGlobalsLoading] = useState(true);
  const [pageSize] = useState(10);

  const fetchReceipts = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setInitialLoading(true);
    } else {
      setTableLoading(true);
    }

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      if (search) params.append('supplier', search);
      if (categoryFilter) params.append('category', categoryFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (dateFrom) params.append('startDate', dateFrom);
      if (dateTo) params.append('endDate', dateTo);

      const response = await fetch(`/api/receipts?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      
      setData(result.receipts);
      setTotalPages(result.pagination.totalPages);

    } catch (error) {
      console.error('Error fetching receipts:', error);
      Swal.fire('Error', 'Failed to fetch receipts.', 'error');
    } finally {
      if (isInitialLoad) {
        setInitialLoading(false);
      } else {
        setTableLoading(false);
      }
    }
  }, [currentPage, pageSize, search, categoryFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchReceipts(true);
  }, [fetchReceipts]);

  useEffect(() => {
    async function fetchGlobals() {
      setGlobalsLoading(true);
      try {
        const [catRes, sourceRes, termsRes, payStatRes, unitRes] = await Promise.all([
          fetch('/api/globals/categories'),
          fetch('/api/globals/sources'),
          fetch('/api/globals/terms'),
          fetch('/api/globals/payment-statuses'),
          fetch('/api/globals/item-units')
        ]);
        const [categories, sources, terms, paymentStatuses, units] = await Promise.all([
          catRes.json(), sourceRes.json(), termsRes.json(), payStatRes.json(), unitRes.json()
        ]);
        setCategories(categories);
        setSources(sources);
        setTerms(terms);
        setPaymentStatuses(paymentStatuses);
        setItemUnits(units);
      } catch (error) {
        console.error("Failed to fetch globals:", error);
        Swal.fire('Error', 'Could not load required data. Please try refreshing the page.', 'error');
      } finally {
        setGlobalsLoading(false);
      }
    }
    fetchGlobals();
  }, []);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

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
          // Try to parse error JSON, but handle empty response
          let errorMsg = 'Failed to delete receipt';
          const text = await response.text();
          if (text) {
            try {
              const error = JSON.parse(text);
              errorMsg = error.error || errorMsg;
            } catch {
              // ignore parse error, use default message
            }
          }
          throw new Error(errorMsg);
        }

        await Swal.fire('Deleted!', 'Receipt has been deleted.', 'success');
        await fetchReceipts(false);

      } catch (error) {
        console.error('Error deleting receipt:', error);
        Swal.fire('Error', error instanceof Error ? error.message : 'Failed to delete receipt', 'error');
      }
    }
  };

  const handleAddReceipt: (formData: AddReceiptSubmitData) => void = async (formData) => {
    try {
      const response = await fetch('/api/receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add receipt');
      }

      await response.json();
      setShowModal(false);
      fetchReceipts();
    } catch (error) {
      console.error('Error adding receipt:', error);
      Swal.fire('Error', `Failed to add receipt: ${error instanceof Error ? error.message : 'Failed to add receipt'}`, 'error');
    }
  };

  const handleUpdateReceiptAsync = async (receiptId: string, updatedData: UpdatedReceiptData) => {
    try {
      // Send the data directly as UpdatedReceiptData format since the PATCH API expects this format
      const response = await fetch(`/api/receipts/${receiptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update receipt');
      }

      await response.json();
      setEditModalOpen(false);
      fetchReceipts();
    } catch (error) {
      console.error('Error updating receipt:', error);
      Swal.fire('Error', `Failed to update receipt: ${error instanceof Error ? error.message : 'Failed to update receipt'}`, 'error');
    }
  };

  const handleUpdateReceipt = (updatedRecord: UpdatedReceiptData) => {
    if (recordToEdit) {
      handleUpdateReceiptAsync(recordToEdit.receipt_id, updatedRecord);
    }
  };

  const openEditModal = (receipt: Receipt) => {
    setRecordToEdit(receipt);
    setEditModalOpen(true);
  };

  const openViewModal = (receipt: Receipt) => {
    setRecordToView(receipt);
    setViewModalOpen(true);
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'status-paid';
      case 'pending':
        return 'status-pending';
      case 'cancelled':
        return 'status-cancelled';
      case 'dued':
        return 'status-dued';
      default:
        return 'status-other';
    }
  };

  const getCategoryDisplayName = (receipt: Receipt) => {
    if (receipt.category_name && receipt.category_name !== 'Other') {
      return formatDisplayText(receipt.category_name);
    }
    return formatDisplayText('Unknown');
  };

  const currentUser = 'ftms_user';

  if (initialLoading || globalsLoading) {
    return <Loading />;
  }

  const filteredData = data
    .filter((item: Receipt) => {
      const matchesSearch = (
        item.supplier.toLowerCase().includes(search.toLowerCase()) ||
        item.receipt_id.toLowerCase().includes(search.toLowerCase())
      );
      const matchesCategory = categoryFilter ? item.category_name === categoryFilter : true;
      const matchesStatus = statusFilter ? item.payment_status_name === statusFilter : true;
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

  return (
    <div className="card">
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
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.category_id} value={cat.name}>{formatDisplayText(cat.name)}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Status</option>
              {paymentStatuses.map(status => (
                <option key={status.id} value={status.name}>{formatDisplayText(status.name)}</option>
              ))}
            </select>
            <button onClick={() => setShowModal(true)} id='receipt_addButton'><i className="ri-add-line" /> Add Receipt</button>
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
                    <td>{formatDateTime(item.transaction_date)}</td>
                    <td>{item.supplier}</td>
                    <td>{getCategoryDisplayName(item)}</td>
                    <td>
                      {(() => {
                        if (item.terms_name) {
                          return formatDisplayText(item.terms_name);
                        }
                        if (item.terms_id && Array.isArray(terms)) {
                          const t = terms.find(term => term.id === item.terms_id);
                          return t ? formatDisplayText(t.name) : 'Cash';
                        }
                        return 'Cash';
                      })()}
                    </td>
                    <td>₱{Number(item.total_amount_due).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}</td>
                    <td>
                      <span className={getStatusBadgeClass(item.payment_status_name)}>
                        {item.payment_status_name}
                      </span>
                    </td>
                    <td className="styles.actionButtons">
                      <div className="actionButtonsContainer">
                        <button className="viewBtn" onClick={() => {openViewModal(item);}} title="View Receipt">
                          <i className="ri-eye-line" />
                        </button>
                        <button className="editBtn" onClick={() => {openEditModal(item);}} title="Edit Receipt">
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
            {currentRecords.length === 0 && !tableLoading && <p className="noRecords">No records found.</p>}
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={() => {}}
        />

        {showModal && (
          <AddReceipt
            onClose={() => setShowModal(false)}
            onAddReceipt={handleAddReceipt}
            currentUser={currentUser}
            categories={categories}
            sources={sources}
            terms={terms}
            paymentStatuses={paymentStatuses}
            itemUnits={itemUnits}
            created_by={currentUser}
          />
        )}
        
        {editModalOpen && recordToEdit && (
          <EditReceiptModal
            receipt={recordToEdit}
            onClose={() => setEditModalOpen(false)}
            onSave={handleUpdateReceipt}
            categories={categories}
            terms={terms}
            paymentStatuses={paymentStatuses}
            itemUnits={itemUnits}
          />
        )}

        {viewModalOpen && recordToView && (
          <ViewReceiptModal
            record={recordToView}
            onClose={() => setViewModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default ReceiptPage;