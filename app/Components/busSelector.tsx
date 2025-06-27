import React, { useState, useMemo, useEffect, useRef } from "react";
import PaginationComponent from "./pagination"; // Reuse your pagination
import "../styles/busSelector.css"
import "../styles/table.css"

type Assignment = {
  assignment_id: string;
  bus_plate_number: string | null;
  bus_route: string;
  bus_type: string | null;
  driver_name: string | null;
  conductor_name: string | null;
  date_assigned: string;
  trip_fuel_expense: number;
  is_expense_recorded?: boolean;
  payment_method: string;
  // Legacy fields for backward compatibility
  driver_id?: string;
  conductor_id?: string;
};

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
<<<<<<< Updated upstream
  const [isLoading,] = useState(false);
=======
>>>>>>> Stashed changes
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus the search input when modal opens
      searchInputRef.current?.focus();

      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isOpen, onClose]);

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  // Filter and sort assignments (only those not recorded)
  const filteredAssignments = useMemo(() => {
    let filtered = assignments.filter(a => !a.is_expense_recorded);
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
  const getEmployeeName = (id: string) =>
    allEmployees.find(e => e.employee_id === id)?.name || "N/A";

  if (!isOpen) return null;

  return (
    <div
      className="modalOverlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bus-selector-title"
      aria-describedby="bus-selector-description"
    >
      <div
        className="addExpenseModal"
        ref={modalRef}
        role="document"
      >
        <button
          type="button"
          className="closeButton"
          onClick={onClose}
          aria-label="Close bus selector modal"
        >
          <i className="ri-close-line"></i>
        </button>
        <div className="modalHeader">
          <h1 id="bus-selector-title">Select Bus Assignment</h1>
        </div>
        <div className="modalContent">
          <div id="bus-selector-description" className="sr-only">
            Search and select a bus assignment from the list below. Use the search field to filter by plate number or route.
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by plate or route"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="formInput"
            style={{ marginBottom: 12, width: "100%" }}
            aria-label="Search bus assignments by plate number or route"
          />
          <table className="data-table" role="table" aria-label="Bus assignments">
            <thead>
              <tr>
                <th scope="col">Date Assigned</th>
                <th scope="col">Trip Fuel Expense</th>
                <th scope="col">Plate Number</th>
                <th scope="col">Bus Type</th>
                <th scope="col">Route</th>
                <th scope="col">Driver</th>
                <th scope="col">Conductor</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAssignments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center" }}>
                    No assignments found.
                  </td>
                </tr>
<<<<<<< Updated upstream
              </thead>
              <tbody>
                {paginatedAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center" }}>
                      No assignments found.
                    </td>
                  </tr>
                ) : (
                  paginatedAssignments.map((assignment) => (
                    <tr
                      key={assignment.assignment_id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Select bus assignment ${assignment.bus_plate_number} on route ${assignment.bus_route}`}
                      onClick={() => {
=======
              ) : (
                paginatedAssignments.map((assignment, index) => (
                  <tr
                    key={`${assignment.assignment_id}-${assignment.date_assigned}-${index}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select bus assignment ${assignment.bus_plate_number || 'N/A'} on route ${assignment.bus_route}`}
                    onClick={() => {
                      onSelect(assignment);
                      onClose();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
>>>>>>> Stashed changes
                        onSelect(assignment);
                        onClose();
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                    className="selectable-row"
                  >
                    <td>{assignment.date_assigned.split("T")[0]}</td>
                    <td>₱ {assignment.trip_fuel_expense}</td>
                    <td>{assignment.bus_plate_number || 'N/A'}</td>
                    <td>{assignment.bus_type ? (assignment.bus_type === "Airconditioned" ? "A" : "O") : 'N/A'}</td>
                    <td>{assignment.bus_route}</td>
                    <td>{assignment.driver_name || (assignment.driver_id ? getEmployeeName(assignment.driver_id) : 'N/A')}</td>
                    <td>{assignment.conductor_name || (assignment.conductor_id ? getEmployeeName(assignment.conductor_id) : 'N/A')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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