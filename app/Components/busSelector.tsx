import React, { useState, useMemo } from "react";
import PaginationComponent from "./pagination"; // Reuse your pagination
import Loading from "./loading"; // Reuse your loading spinner
import "../styles/busSelector.css"
import "../styles/table.css"
import type { Assignment } from '@/lib/operations/assignments';
import { formatDateTime } from '../utility/dateFormatter';

type Employee = {
  employee_id: string;
  name: string;
  job_title: string;
};

type BusSelectorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (assignment: Assignment) => void;
  assignments: Assignment[];
  allEmployees: Employee[];
};

const PAGE_SIZE = 5;

const BusSelectorModal: React.FC<BusSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  assignments,
  allEmployees,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading] = useState(false);

  // Filter and sort assignments (only those not recorded)
  const filteredAssignments = useMemo(() => {
    let filtered = assignments.filter(a => !a.is_expense_recorded);
    
    // Apply search filter
    if (search.trim()) {
      filtered = filtered.filter(a =>
        (a.bus_plate_number?.toLowerCase().includes(search.toLowerCase()) || false) ||
        a.bus_route.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    return filtered.sort(
      (a, b) => new Date(a.date_assigned).getTime() - new Date(b.date_assigned).getTime()
    );
  }, [assignments, search]);

  const totalPages = Math.ceil(filteredAssignments.length / PAGE_SIZE);
  const paginatedAssignments = filteredAssignments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Helper to get employee name
  const getEmployeeName = (assignment: Assignment, field: 'driver' | 'conductor') => {
    if (field === 'driver' && assignment.driver_name) {
      return assignment.driver_name;
    }
    if (field === 'conductor' && assignment.conductor_name) {
      return assignment.conductor_name;
    }
    const id = field === 'driver' ? assignment.driver_id : assignment.conductor_id;
    return allEmployees.find(e => e.employee_id === id)?.name || "N/A";
  };

  // Helper to format bus type correctly
  const formatBusType = (busType: string | null): string => {
    if (!busType) return 'N/A';
    
    // Normalize bus type values to display format
    const normalizedType = busType.toLowerCase();
    if (normalizedType === 'aircon' || normalizedType === 'airconditioned') {
      return 'Airconditioned';
    } else if (normalizedType === 'ordinary' || normalizedType === 'non-aircon') {
      return 'Ordinary';
    } else {
      // For any other values, return the first letter capitalized
      return busType.charAt(0).toUpperCase();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modalOverlay">
      <div className="addExpenseModal">
        <button type="button" className="closeButton" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>
        <div className="modalHeader">
          <h1>Select Bus Assignment</h1>
        </div>
        <div className="modalContent">
          <input
            type="text"
            placeholder="Search by plate or route"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="formInput"
            style={{ marginBottom: 12, width: "100%" }}
          />
          {isLoading ? (
            <Loading />
          ) : (
            <table className="data-table">
            <thead>
              <tr>
                  <th>Date Assigned</th>
                  <th>Trip Fuel Expense</th>
                  <th>Plate Number</th>
                  <th>Bus Type</th>
                  <th>Route</th>
                  <th>Driver</th>
                  <th>Conductor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center" }}>
                      No assignments found.
                    </td>
                  </tr>
                ) : (
                  paginatedAssignments.map(assignment => {
                    // Use bus_trip_id if available, else assignment_id + date_assigned for uniqueness
                    const a = assignment as Assignment & { bus_trip_id?: string };
                    const uniqueKey = a.bus_trip_id
                      ? `${a.assignment_id}-${a.bus_trip_id}`
                      : `${a.assignment_id}-${a.date_assigned}`;
                    return (
                      <tr key={uniqueKey}
                      onClick={() => {
                        onSelect(assignment);
                        onClose();
                    }}
                  >
                    <td>{formatDateTime(assignment.date_assigned)}</td>
                    <td>₱ {assignment.trip_fuel_expense}</td>
                      <td>{assignment.bus_plate_number}</td>
                      <td>{formatBusType(assignment.bus_type)}</td>
                    <td>{assignment.bus_route}</td>
                      <td>{getEmployeeName(assignment, 'driver')}</td>
                      <td>{getEmployeeName(assignment, 'conductor')}</td>
                  </tr>
                    );
                  })
              )}
            </tbody>
          </table>
          )}
          <PaginationComponent
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            onPageSizeChange={() => {}}
          />
        </div>
      </div>
    </div>
  );
};

export default BusSelectorModal;