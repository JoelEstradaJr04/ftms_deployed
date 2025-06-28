'use client';

import "./globals.css";
import './styles/index.css';
import SideBar from "./Components/sideBar";
import TopBar from './Components/topBar';


// Root Layout Component
export default function RootLayout({children,}: Readonly<{children: React.ReactNode;}>) {
  return (
    <html lang="en">
      <head>
        <title>FTMS</title>
        <link rel="icon" href="/agilaLogo.png" />

        {/* Include required CSS */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/remixicon/4.6.0/remixicon.css"/>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"/>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/jquery-resizable-columns@0.2.3/dist/jquery.resizableColumns.min.css"/>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-table@1.24.1/dist/bootstrap-table.min.css"/>

        {/* Include required JS */}
        <script src="https://code.jquery.com/jquery-3.6.0.min.js" defer></script>
        <script src="https://cdn.jsdelivr.net/npm/jquery-resizable-columns@0.2.3/dist/jquery.resizableColumns.min.js" defer></script>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap-table@1.24.1/dist/bootstrap-table.min.js" defer></script>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap-table@1.24.1/dist/extensions/resizable/bootstrap-table-resizable.min.js" defer></script>
      </head>

      <body>
        <div className="app-wrapper">
          {/* Sidebar Navbar */}
          <SideBar />

          <div className="layout-right">
              <TopBar /> 

              <div className="content">
                  {children}
              </div>
          </div>

        </div>
      </body>


    </html>
  );
}