// app\Components\sideBar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import "../styles/sidebar.css";

const routeToItem: { [key: string]: string } = {
  "/dashboard": "dashboard",
  "/revenue": "revenue",
  "/expense": "expense",
  "/receipt": "receipt",
  "/audit": "audit",
  "/report": "report",
  "/reimbursement": "reimbursement",
  "/JEV": "JEV",
  "/financial-management/payroll": "payroll",
};

const expenseSubItems = [
  "/expense",
  "/reimbursement",
];

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

  useEffect(() => {
    const matched = routeToItem[pathname] || null;
    setActiveItem(matched);

    if (expenseSubItems.includes(pathname)) {
      setOpenSubMenu("expense-management");
    }
  }, [pathname]);

  const toggleSubMenu = (id: string) => {
    setOpenSubMenu((prev) => (prev === id ? null : id));
  };

  return (
    <div className="sidebar shadow-lg" id="sidebar">
      <div className="sidebar-content">
        <div className="logo-img">
          <Image src="/agilaLogo.png" alt="logo" width={150} height={50} priority />
        </div>

        <div className="nav-links">
          <Link
            href="/dashboard"
            className={`nav-item ${activeItem === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveItem("dashboard")}
          >
            <i className="ri-dashboard-line" />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/revenue"
            className={`nav-item ${activeItem === "revenue" ? "active" : ""}`}
            onClick={() => setActiveItem("revenue")}
          >
            <i className="ri-money-dollar-circle-line" />
            <span>Revenue Management</span>
          </Link>

          {/* Expenses Submenu */}
          <div
            className={`nav-item module ${
              ["expense", "reimbursement"].includes(activeItem!) ? "active" : ""
            }`}
            onClick={() => toggleSubMenu("expense-management")}
          >
            <i className="ri-wallet-3-line"></i>
            <span>Expenses</span>
            <i
              className={`dropdown-arrow ri-arrow-down-s-line ${
                openSubMenu === "expense-management" ? "rotate" : ""
              }`}
            />
          </div>

          {openSubMenu === "expense-management" && (
            <div className="sub-menu active">
              <Link
                href="/expense"
                className={`sub-item ${activeItem === "expense" ? "active" : ""}`}
              >
                Expenses
              </Link>
              <Link
                href="/reimbursement"
                className={`sub-item ${activeItem === "reimbursement" ? "active" : ""}`}
              >
                Reimbursements
              </Link>
            </div>
          )}

          <Link
            href="/receipt"
            className={`nav-item ${activeItem === "receipt" ? "active" : ""}`}
            onClick={() => setActiveItem("receipt")}
          >
            <i className="ri-receipt-line" />
            <span>Receipt Management</span>
          </Link>

          {/* <Link
            href="/financial-management/payroll"
            className={`nav-item ${activeItem === "payroll" ? "active" : ""}`}
            onClick={() => setActiveItem("payroll")}
          >
            <i className="ri-group-line" />
            <span>Payroll</span>
          </Link> */}
          {/* 
          <Link
            href="/report"
            className={`nav-item ${activeItem === "report" ? "active" : ""}`}
            onClick={() => setActiveItem("report")}
          >
            <i className="ri-file-chart-line" />
            <span>Financial Reports</span>
          </Link>
          */}

{/* 
          <Link
            href="/JEV"
            className={`nav-item ${activeItem === "JEV" ? "active" : ""}`}
            onClick={() => setActiveItem("JEV")}
          >
            <i className="ri-book-2-line"></i>
            <span>JEV</span>
          </Link>
*/}


          <Link
            href="/audit"
            className={`nav-item ${activeItem === "audit" ? "active" : ""}`}
            onClick={() => setActiveItem("audit")}
          >
            <i className="ri-booklet-line" />
            <span>Audit Logs</span>
          </Link>
        </div>

        <div className="logout">
          <a href="#">
            <i className="ri-logout-box-r-line" />
            <span>Logout</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
