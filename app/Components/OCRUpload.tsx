'use client';
import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import Swal from 'sweetalert2';

type OCRResult = {
  text: string;
  confidence: number;
  bbox: number[][];
};

const OCRUpload: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrResults, setOcrResults] = useState<OCRResult[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [originalImageNaturalDimensions, setOriginalImageNaturalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [displayedImageRenderedDimensions, setDisplayedImageRenderedDimensions] = useState<{ width: number; height: number } | null>(null);

  const processFile = async (file: File) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      Swal.fire('Error', 'Please select a valid image file.', 'error');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      Swal.fire('Error', 'File size must be less than 10MB.', 'error');
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setLoading(true);

    // Get original image dimensions from the file itself
    const img = new window.Image();
    img.src = url;
    img.onload = () => {
      setOriginalImageNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = (err) => {
      console.error("Error loading image for natural dimensions:", err);
      setLoading(false);
      Swal.fire('Error', 'Failed to load image for processing. Please try again.', 'error');
    };

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('OCR processing failed');
      }

      const result = await response.json();
      setOcrResults(result);
      
      console.log('OCR Results:', result);
      
    } catch (error) {
      console.error('OCR Error:', error);
      Swal.fire('Error', 'Failed to process image. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setOcrResults([]);
    setOriginalImageNaturalDimensions(null);
    setDisplayedImageRenderedDimensions(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      Swal.fire({
        title: 'Copied!',
        text: 'Text copied to clipboard',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const exportResults = () => {
    const textContent = ocrResults.map(result => result.text).join('\n');
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr-results-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ocr-container">
      <div className="header">
        <h2 className="title">Document Text Extraction</h2>
        <p className="subtitle">Upload an image to extract text using OCR technology</p>
      </div>

      {!previewUrl ? (
        <div 
          className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleUploadClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="file-input-hidden"
            disabled={loading}
          />
          
          <div className="upload-content">
            <div className="upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <h3>Drop your image here or click to browse</h3>
            <p>Supports JPG, PNG, GIF up to 10MB</p>
          </div>
        </div>
      ) : (
        <div className="content-layout">
          <div className="image-section">
            <div className="image-header">
              <h3>Uploaded Image</h3>
              <div className="image-actions">
                <button onClick={handleClear} className="btn-secondary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"/>
                  </svg>
                  Clear
                </button>
              </div>
            </div>
            
            <div className="preview-container">
              <Image 
                ref={imageRef}
                src={previewUrl} 
                alt="Document preview" 
                className="preview-image"
                width={800}
                height={600}
                style={{ width: '100%', height: 'auto' }}
                onLoadingComplete={(img) => {
                  setDisplayedImageRenderedDimensions({ width: img.offsetWidth, height: img.offsetHeight });
                }}
              />
              
              {originalImageNaturalDimensions && displayedImageRenderedDimensions && ocrResults.map((result, index) => {
                const scaleX = displayedImageRenderedDimensions.width / originalImageNaturalDimensions.width;
                const scaleY = displayedImageRenderedDimensions.height / originalImageNaturalDimensions.height;
                return (
                  <div
                    key={index}
                    className="text-overlay"
                    style={{
                      position: 'absolute',
                      left: `${result.bbox[0][0] * scaleX}px`,
                      top: `${result.bbox[0][1] * scaleY}px`,
                      width: `${(result.bbox[2][0] - result.bbox[0][0]) * scaleX}px`,
                      height: `${(result.bbox[2][1] - result.bbox[0][1]) * scaleY}px`,
                    }}
                    title={`${result.text} (${(result.confidence * 100).toFixed(1)}% confidence)`}
                  />
                );
              })}
            </div>
          </div>

          <div className="results-section">
            <div className="results-header">
              <h3>Extracted Text ({ocrResults.length} items)</h3>
              {ocrResults.length > 0 && (
                <div className="results-actions">
                  <button onClick={exportResults} className="btn-secondary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7,10 12,15 17,10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Export
                  </button>
                </div>
              )}
            </div>
            
            <div className="results-list">
              {ocrResults.length === 0 && !loading ? (
                <div className="empty-state">
                  <p>No text detected in the image.</p>
                </div>
              ) : (
                ocrResults.map((result, index) => (
                  <div key={index} className="result-item">
                    <div className="result-content">
                      <span className="result-text">{result.text}</span>
                      <div className="result-meta">
                        <span className="confidence-badge">
                          {(result.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(result.text)}
                      className="copy-btn"
                      title="Copy to clipboard"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h3>Processing your image...</h3>
            <p>Extracting text using OCR technology</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .ocr-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .title {
          font-size: 2rem;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 0.5rem 0;
        }

        .subtitle {
          color: #666;
          font-size: 1.1rem;
          margin: 0;
        }

        .upload-zone {
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          padding: 3rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #fafafa;
        }

        .upload-zone:hover, .upload-zone.drag-active {
          border-color: #3b82f6;
          background: #f0f9ff;
        }

        .file-input-hidden {
          display: none;
        }

        .upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .upload-icon {
          color: #6b7280;
          margin-bottom: 0.5rem;
        }

        .upload-content h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #374151;
          margin: 0;
        }

        .upload-content p {
          color: #6b7280;
          margin: 0;
        }

        .content-layout {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 2rem;
          margin-top: 2rem;
        }

        .image-section, .results-section {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .image-header, .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .image-header h3, .results-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .image-actions, .results-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-secondary:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .preview-container {
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          background: #f8fafc;
        }

        .preview-image {
          display: block;
          max-width: 100%;
          height: auto;
        }

        .text-overlay {
          border: 2px solid #ef4444;
          background: rgba(239, 68, 68, 0.1);
          pointer-events: none;
          transition: all 0.2s ease;
        }

        .text-overlay:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: #dc2626;
        }

        .results-list {
          max-height: 500px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .result-item {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 1rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .result-item:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .result-content {
          flex: 1;
          min-width: 0;
        }

        .result-text {
          display: block;
          font-size: 0.9rem;
          color: #1f2937;
          line-height: 1.5;
          word-break: break-word;
          margin-bottom: 0.5rem;
        }

        .result-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .confidence-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.5rem;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .copy-btn {
          flex-shrink: 0;
          padding: 0.5rem;
          border: none;
          background: transparent;
          color: #6b7280;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-left: 0.5rem;
        }

        .copy-btn:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .loading-content {
          text-align: center;
          padding: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #f3f4f6;
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s ease-in-out infinite;
          margin: 0 auto 1rem;
        }

        .loading-content h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .loading-content p {
          color: #6b7280;
          margin: 0;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .ocr-container {
            padding: 1rem;
          }

          .content-layout {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .upload-zone {
            padding: 2rem 1rem;
          }

          .image-section, .results-section {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default OCRUpload;