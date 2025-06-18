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
  "/financial-management/balancePayment": "balancePayment",
  "/financial-management/payroll": "payroll",
};

const financialSubItems = [
  "/financial-management/balancePayment",
  "/financial-management/payroll",
];

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

  useEffect(() => {
    const matched = routeToItem[pathname] || null;
    setActiveItem(matched);

    if (financialSubItems.includes(pathname)) {
      setOpenSubMenu("financial-management");
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

          <Link
            href="/expense"
            className={`nav-item ${activeItem === "expense" ? "active" : ""}`}
            onClick={() => setActiveItem("expense")}
          >
            <i className="ri-wallet-3-line"></i>
            <span>Expense Management</span>
          </Link>

          <Link
            href="/receipt"
            className={`nav-item ${activeItem === "receipt" ? "active" : ""}`}
            onClick={() => setActiveItem("receipt")}
          >
            <i className="ri-receipt-line" />
            <span>Receipt Management</span>
          </Link>

          {/* Financial Submenu */}
          <div
            className={`nav-item module ${
              ["balancePayment", "payroll"].includes(activeItem!) ? "active" : ""
            }`}
            onClick={() => toggleSubMenu("financial-management")}
          >
            <i className="ri-group-line" />
            <span>Employee Financial Mgmt</span>
            <i
              className={`dropdown-arrow ri-arrow-down-s-line ${
                openSubMenu === "financial-management" ? "rotate" : ""
              }`}
            />
          </div>

          {openSubMenu === "financial-management" && (
            <div className="sub-menu active">
              <Link
                href="/financial-management/payroll"
                className={`sub-item ${activeItem === "payroll" ? "active" : ""}`}
              >
                Payroll
              </Link>
            </div>
          )}

          <Link
            href="/report"
            className={`nav-item ${activeItem === "report" ? "active" : ""}`}
            onClick={() => setActiveItem("report")}
          >
            <i className="ri-file-chart-line" />
            <span>Financial Reports</span>
          </Link>

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
