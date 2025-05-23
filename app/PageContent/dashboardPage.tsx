"use client";

import React, { useState, useEffect } from "react";
import PieChart from "../Components/pieChart";
import "../styles/dashboard.css"; // External CSS for styling

const dashboardPage = () => {
  const [dateFilter, setDateFilter] = useState(""); // Tracks the selected filter
  const [dateFrom, setDateFrom] = useState(""); // Tracks the start date
  const [dateTo, setDateTo] = useState(""); // Tracks the end date
  const [profit, setProfit] = useState (500); // initial/dummy value

  // Example: Update profit dynamically (optional) //DELETE THIS LATER
  useEffect(() => {
    const interval = setInterval(() => {
      const randomProfit = Math.floor(Math.random() * 1000) - 500; // Random profit between -500 and 500
      setProfit(randomProfit);
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, []);



  return (
    <>
    <div className="dashboardPage">
      <div className="accounting">
        {/* CONTAINER FOR THE SETTINGS */}
        <div className="settings">
          <div className="filterDate">
            {/* DROPDOWN FILTER OF PERIODS */}
            <div className="filter">
              <label htmlFor="dateFilter">Date By:</label>
              <select
                value={dateFilter}
                id="dateFilter"
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="Day">Today</option>
                <option value="Month">This Month</option>
                <option value="Year">This Year</option>
                <option value="Custom">Custom</option>
              </select>
            </div>


            {/* Date Range, From-To */}
            {/* Appears only when CUSTOM date is selected */}
            {/* This is a custom date range picker */}
            {/* It allows the user to select a start and end date */}
            {/* The dates are stored in the state variables dateFrom and dateTo */}
            {/* The onChange event handlers update the state variables */}
            {dateFilter === "Custom" && (
                
                <div className="dateRangePicker">
                    <div className="date">
                        <label htmlFor="startDate">Start Date:</label>
                        <input
                            type="date"
                            id="startDate"
                            name="startDate"
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>

                    <div className="date">
                        <label htmlFor="endDate">End Date:</label>
                        <input
                            type="date"
                            id="endDate"
                            name="endDate"
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>
                </div>
            )}
          </div>


          {/* EXPORT BUTTON */}
          <div className="exportButton">
              <button id="exportButton">Export</button>
          </div>
        </div>

        {/* CONTAINER FOR THE DATA */}
        {/* CONTAINS REVENUE, EXPENSES, AND PROFIT */}
        {/* GRAPHS FOR THE EXPENSES */}
        <div className="dataContainer">
              <div className="data">
                  <div className="dataGrid" id="revenue">
                      <div className="title"><h2>Revenue</h2></div>
                      <p>$1000</p>
                      <p></p>
                  </div>
                  <div className="dataGrid" id="expenses">  
                      <div className="title"><h2>Expenses</h2></div>  
                      <p>$500</p>
                      <p></p>
                  </div>
                  <div className="dataGrid" id="profit">
                      <div className="title"><h2>Profit</h2></div>
                      <p>${profit}</p>
                      <p></p>
                  </div>
                  {/* AUTOMATICALLY UPDATING EMOJI BASED ON THE PROFIT */}
                  <div className="dataGrid" id="emoji">
                      <div className="emoji">
                        <video
                          src={profit > 0 ? "/happy.webm" : "/sad.webm"}
                          autoPlay
                          loop
                          muted
                        />
                      </div>
                  </div>
              </div>


              {/* CONTAINER FOR THE GRAPHS */}
              {/* CONTAINS THE REVENUE, EXPENSES, AND PROFIT GRAPHS */}
              <div className="graph">
                  <div className="title"><h2>Expenses per Department</h2></div>
                  {/* PIE CHART */}
                  {/* This is a pie chart that shows the expenses */}
                  {/* The data is passed as props to the PieChart component */}
                  {/* The PieChart component is imported from the Components folder */}
                  <PieChart />
              </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default dashboardPage;