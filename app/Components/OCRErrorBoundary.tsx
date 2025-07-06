// ftms_deployed\app\Components\OCRErrorBoundary.tsx
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
      padding: '40px 24px',
      margin: '20px 0',
      border: '1px solid #f1c0c7',
      borderRadius: '12px',
      backgroundColor: 'linear-gradient(135deg, #f8d7da 0%, #ffffff 100%)',
      color: '#721c24',
      textAlign: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
    }}
  >
    <div style={{ fontSize: '56px', marginBottom: '20px' }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="64" height="64" style={{ color: '#dc3545' }}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"></path>
      </svg>
    </div>
    <h3 style={{ 
      color: '#721c24', 
      margin: '0 0 12px 0', 
      fontSize: '1.375rem',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    }}>
      <i className="ri-error-warning-line" style={{ fontSize: '1.5rem' }}></i>
      OCR Service Error
    </h3>
    <p style={{ 
      margin: '0 0 24px 0', 
      fontSize: '16px',
      lineHeight: '1.5',
      color: '#721c24'
    }}>
      We encountered a problem with the OCR service. This could be due to network issues or service unavailability.
    </p>
    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '12px 24px',
          backgroundColor: '#961C1E',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 4px rgba(150, 28, 30, 0.2)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#80181a';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#961C1E';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <i className="ri-refresh-line"></i>
        Try Again
      </button>
      <button
        onClick={() => window.history.back()}
        style={{
          padding: '12px 24px',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 4px rgba(108, 117, 125, 0.2)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#5a6268';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#6c757d';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <i className="ri-arrow-left-line"></i>
        Go Back
      </button>
    </div>
    <div style={{ 
      marginTop: '20px', 
      padding: '16px', 
      backgroundColor: 'rgba(255, 255, 255, 0.5)', 
      borderRadius: '8px',
      fontSize: '14px',
      color: '#6c757d'
    }}>
      <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>Troubleshooting Tips:</p>
      <ul style={{ margin: 0, paddingLeft: '20px', textAlign: 'left' }}>
        <li>Check your internet connection</li>
        <li>Ensure the image is clear and well-lit</li>
        <li>Try uploading a different image format</li>
        <li>Use manual entry if the issue persists</li>
      </ul>
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
