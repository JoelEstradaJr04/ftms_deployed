import React, { useState, useMemo } from "react";
import PaginationComponent from "./pagination"; // Reuse your pagination
import Loading from "./loading"; // Reuse your loading spinner
import "../styles/revenueBusSelector.css";

type Assignment = {
  assignment_id: string;
  date_assigned: string;
  trip_revenue: number;
  bus_plate_number: string;
  bus_type: string;
  bus_route: string;
  driver_id: string;
  conductor_id: string;
  assignment_type: string;
  assignment_value?: number;
};

type Employee = {
  employee_id: string;
  name: string;
};

type Category = {
  category_id: string;
  name: string;
};


type RevenueSourceSelectorProps = {
  assignments: Assignment[];
  employees: Employee[];
  categories: Category[]; 
  selectedCategoryId: string;
  onSelect: (assignment: Assignment) => void;
  onClose: () => void;
  isOpen: boolean;
};

const PAGE_SIZE = 5;

const RevenueSourceSelector: React.FC<RevenueSourceSelectorProps> = ({
  assignments,
  employees,
  categories,
  selectedCategoryId,
  onSelect,
  onClose,
  isOpen,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading] = useState(false);

  // Filter assignments based on selected category (Boundary/Percentage) and search
  const filteredAssignments = useMemo(() => {
    let filtered = assignments.filter(a => {
      if (!selectedCategoryId) return false;
      const selectedCategory = categories.find(cat => cat.category_id === selectedCategoryId);
      if (!selectedCategory) return false;
      if (selectedCategory.name === "Boundary") return a.assignment_type === "Boundary";
      if (selectedCategory.name === "Percentage") return a.assignment_type === "Percentage";
      return false;
    });
    if (search.trim()) {
      filtered = filtered.filter(a =>
        a.bus_plate_number.toLowerCase().includes(search.toLowerCase()) ||
        a.bus_route.toLowerCase().includes(search.toLowerCase())
      );
    }
    return filtered.sort(
      (a, b) => new Date(a.date_assigned).getTime() - new Date(b.date_assigned).getTime()
    );
  }, [assignments, categories, selectedCategoryId, search]);

  const totalPages = Math.ceil(filteredAssignments.length / PAGE_SIZE);
  const paginatedAssignments = filteredAssignments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const formatAmount = (assignment: Assignment) => {
    const selectedCategory = categories.find(cat => cat.category_id === selectedCategoryId);
    let amount = assignment.trip_revenue;
    if (selectedCategory?.name === "Percentage" && assignment.assignment_value) {
      amount = assignment.trip_revenue * (assignment.assignment_value / 100);
    }
    return `₱${amount.toLocaleString()}`;
  };

  const getEmployeeName = (id: string) =>
    employees.find(e => e.employee_id === id)?.name || "N/A";

  if (!isOpen) return null;

  return (
    <div className="modalOverlay">
      <div className="addRevenueModal">
        <button type="button" className="closeButton" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>
        <div className="modalHeader">
          <h1>Select Assignment</h1>
        </div>
        <div className="revenue_modalContent">
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
            <table id="revenue-assignment-table">
              <thead>
                <tr>
                  <th>Date Assigned</th>
                  <th>Amount</th>
                  <th>Bus Plate Number</th>
                  <th>Bus Type</th>
                  <th>Bus Route</th>
                  <th>Driver</th>
                  <th>Conductor</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center" }}>
                      No assignments found.
                    </td>
                  </tr>
                ) : (
                  paginatedAssignments.map(assignment => (
                    <tr
                      key={assignment.assignment_id}
                      onClick={() => {
                        onSelect(assignment);
                        onClose();
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{assignment.date_assigned.split("T")[0]}</td>
                      <td>{formatAmount(assignment)}</td>
                      <td>{assignment.bus_plate_number}</td>
                      <td>{assignment.bus_type}</td>
                      <td>{assignment.bus_route}</td>
                      <td>{getEmployeeName(assignment.driver_id)}</td>
                      <td>{getEmployeeName(assignment.conductor_id)}</td>
                    </tr>
                  ))
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

export default RevenueSourceSelector;