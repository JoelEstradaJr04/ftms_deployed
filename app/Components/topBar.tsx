"use client";

import React, { useState } from 'react';
import '../styles/topbar.css';

const TopBar = () => {
    //const [activeModule, setActiveModule] = useState('Accounting'); // State to track the active module
    const [activeSystem, setActiveSystem] = useState(''); // State to track the active submodule

    const handleSystemClick = (systemName: string) => {
        setActiveSystem(systemName);
    };

  return (
    <>
        <div className='topBar'>
            <div className='topBarItems'> 
                {/* Module for Accounting */}
                <div
                    className={`topBarItem ${activeSystem === 'Accounting' ? 'active' : ''}`}
                    onClick={() => handleSystemClick('Accounting')}
                >
                    Accounting
                </div>

                {/* Module for Human Resource */}
                <div
                    className={`topBarItem ${activeSystem === 'HumanResource' ? 'active' : ''}`}
                    onClick={() => handleSystemClick('HumanResource')}
                >
                    Human Resource
                </div>

                {/* Module for Inventory */}
                <div
                    className={`topBarItem ${activeSystem === 'Inventory' ? 'active' : ''}`}
                    onClick={() => handleSystemClick('Inventory')}
                >
                    Inventory
                </div>

                {/* Module for Operation */}
                <div
                    className={`topBarItem ${activeSystem === 'Operation' ? 'active' : ''}`}
                    onClick={() => handleSystemClick('Operation')}
                >
                    Operation
                </div>
            </div>
        </div>
    </>
    )
};

export default TopBar;