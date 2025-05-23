'use client';

import React, { useState } from 'react'; 
import './styles/layout.css';
import NavBar from './Components/navBar'; 
import TopBar from './Components/topBar';
import RevenuePage from './PageContent/revenuePage';
import ExpensePage from './PageContent/expensePage'; 
import DashboardPage from './PageContent/dashboardPage';
import AuditPage from './PageContent/auditPage';
import FinancialRequestPage from './PageContent/financialRequestPage';

const Page = () => {
  // === Create states to manage the active module and submodule ===
  const [activeModule, setActiveModule] = useState<string>('Dashboard');
  const [activeSubModule, setActiveSubModule] = useState<string>('');

  // === Render content based on active module/submodule ===
  const renderContent = () => {
    switch (activeModule) {
      case 'Dashboard':
        return <DashboardPage />;
      
      case 'Revenue Management':
        return <RevenuePage />;

      case 'Expense Management':
        return <ExpensePage />;
      
      case 'Financial Requests':
        return <FinancialRequestPage />;

      case 'Audit Logs':
        return <AuditPage />;

      default:
        return <div>Module not found</div> //YOU REPLACE THIS WITH ERROR 404 or something similar
    }
  }

  return (
    <div className="mainContainer">
      
      {/* Sidebar Navbar */}
      <div className="navBarContainer">
        <NavBar 
          activeModule={activeModule}
          activeSubModule={activeSubModule}
          setActiveModule={setActiveModule}
          setActiveSubModule={setActiveSubModule}
        />
      </div>

      {/* Main Content */}
      <div className="mainContent">
        <div className="topBarContainer">
          <TopBar />
        </div>

        <div className="pageContainer">
          <div className="contentContainer">
            {renderContent()}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Page;
