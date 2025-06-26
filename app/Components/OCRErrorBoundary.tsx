'use client';

import React from 'react';
import ErrorBoundary from './ErrorBoundary';

interface OCRErrorBoundaryProps {
  children: React.ReactNode;
}

const OCRErrorFallback: React.FC = () => (
  <div 
    role="alert"
    style={{
      padding: '20px',
      margin: '10px',
      border: '1px solid #ff9800',
      borderRadius: '8px',
      backgroundColor: '#fff3e0',
      color: '#e65100',
      textAlign: 'center'
    }}
  >
    <div style={{ fontSize: '48px', marginBottom: '10px' }}>📷</div>
    <h3>Camera/OCR Service Unavailable</h3>
    <p>
      The camera or OCR service is currently unavailable. This could be due to:
    </p>
    <ul style={{ textAlign: 'left', margin: '10px 0' }}>
      <li>Camera permissions not granted</li>
      <li>No camera device available</li>
      <li>OCR service connection issues</li>
      <li>Browser compatibility issues</li>
    </ul>
    <p>
      <strong>What you can do:</strong>
    </p>
    <ul style={{ textAlign: 'left', margin: '10px 0' }}>
      <li>Check camera permissions in your browser</li>
      <li>Try refreshing the page</li>
      <li>Use manual data entry instead</li>
      <li>Contact support if the issue persists</li>
    </ul>
    <div style={{ marginTop: '15px' }}>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginRight: '10px',
          padding: '8px 16px',
          backgroundColor: '#961C1E',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Retry
      </button>
      <button
        onClick={() => window.history.back()}
        style={{
          padding: '8px 16px',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Go Back
      </button>
    </div>
  </div>
);

const OCRErrorBoundary: React.FC<OCRErrorBoundaryProps> = ({ children }) => {
  const handleError = (error: Error) => {
    // Log OCR-specific errors
    console.error('OCR Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
    
    // You could send this to an error reporting service
    // Example: Sentry, LogRocket, etc.
  };

  return (
    <ErrorBoundary 
      fallback={<OCRErrorFallback />}
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
};

export default OCRErrorBoundary;
