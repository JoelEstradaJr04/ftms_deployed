'use client';
import React, { useState, useRef } from 'react';
import '../styles/components/OCRUpload.css';

interface OCRUploadProps {
  onOCRComplete?: (data: any) => void;
  onError?: (error: string) => void;
}

const OCRUpload: React.FC<OCRUploadProps> = ({ onOCRComplete, onError }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError?.('Please select a valid image file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      onError?.('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setIsProcessing(true);

    try {
      // Show image preview
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);

      // Process with OCR
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source', 'OCR_File');

      console.log('Sending OCR request...');
      const response = await fetch('/api/receipts/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OCR API Error:', errorData);
        throw new Error(errorData.error || 'OCR processing failed');
      }

      const result = await response.json();
      console.log('OCR Result:', result); // Debug log

      // ADD: Detailed debugging of the received data
      console.log('=== OCR RESULT DEBUGGING ===');
      console.log('result.ocr_fields:', result.ocr_fields);
      console.log('result.ocr_fields length:', result.ocr_fields?.length);
      console.log('result.overall_confidence:', result.overall_confidence);
      console.log('result.field_count:', result.field_count);
      console.log('result.fields_detected:', result.fields_detected);
      console.log('result.debug_info:', result.debug_info);
      console.log('result.accuracy:', result.accuracy);
      console.log('result.confidence:', result.confidence);

      if (result.success) {
        setExtractedText(result);
        onOCRComplete?.(result.extracted_data);
      } else {
        throw new Error(result.error || 'OCR processing failed');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      onError?.(error instanceof Error ? error.message : 'OCR processing failed');
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const clearUpload = () => {
    setUploadedImage(null);
    setExtractedText(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  return (
    <div className="ocr-upload-container">
      <div className="upload-header">
        <h3>Upload an image to extract text using OCR technology</h3>
      </div>

      <div className="upload-content">
        <div className="upload-section">
          <div className="upload-area">
            {!uploadedImage ? (
              <div 
                className="upload-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <i className="ri-upload-cloud-line upload-icon"></i>
                <p>Click to upload an image</p>
                <p className="upload-hint">Supports JPG, PNG, GIF up to 10MB</p>
              </div>
            ) : (
              <div className="uploaded-image-container">
                <img src={uploadedImage} alt="Uploaded receipt" className="uploaded-image" />
                {isProcessing && (
                  <div className="processing-overlay">
                    <div className="spinner"></div>
                    <p>Processing image...</p>
                  </div>
                )}
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          {uploadedImage && (
            <div className="upload-actions">
              <button onClick={clearUpload} className="clear-btn">
                <i className="ri-delete-bin-line"></i> Clear
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="reupload-btn"
                disabled={isProcessing}
              >
                <i className="ri-upload-line"></i> Upload Different Image
              </button>
            </div>
          )}
        </div>

        {/* Always show extraction section with outline */}
        <div className="extraction-section">
          {extractedText ? (
            <>
              <div className="extraction-header">
                <h4>
                  Extracted Data ({
                    extractedText.field_count || 
                    extractedText.fields_detected || 
                    extractedText.ocr_fields?.length || 
                    extractedText.debug_info?.fields_detected || 
                    0
                  } fields detected)
                </h4>
                <div className="confidence-badge">
                  <span className="confidence-label">Accuracy:</span>
                  <span className={`confidence-value ${
                    (extractedText.overall_confidence || extractedText.accuracy || 0) > 0.8 ? 'high' : 
                    (extractedText.overall_confidence || extractedText.accuracy || 0) > 0.6 ? 'medium' : 'low'
                  }`}>
                    {(() => {
                      // Try multiple confidence sources
                      const confidence = extractedText.overall_confidence || 
                                        extractedText.accuracy || 
                                        extractedText.confidence_percentage || 
                                        (extractedText.confidence / 100) || 
                                        0;
                      
                      // If confidence is already a percentage (>1), use as-is, otherwise convert to percentage
                      const percentage = confidence > 1 ? confidence : confidence * 100;
                      return percentage.toFixed(1);
                    })()}%
                  </span>
                </div>
              </div>

              <div className="extracted-content">
              {/* Raw Text Debug Section */}
              {extractedText.raw_text && extractedText.raw_text.length > 0 && (
                <div className="raw-text-debug">
                  <details>
                    <summary>🔍 Raw Extracted Text ({extractedText.raw_text.length} text regions)</summary>
                    <div className="raw-text-content">
                      {extractedText.raw_text.map((text: string, index: number) => (
                        <div key={index} className="raw-text-item">
                          <span className="text-index">{index + 1}:</span>
                          <span className="text-content">{text}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {extractedText.extracted_data && (
                <div className="extracted-fields">
                  <div className="field-grid">
                    {extractedText.extracted_data.supplier && (
                      <div className="field-item">
                        <label>Supplier:</label>
                        <div className="field-value">
                          <span>{extractedText.extracted_data.supplier}</span>
                          <button 
                            onClick={() => copyToClipboard(extractedText.extracted_data.supplier)}
                            className="copy-btn"
                            title="Copy to clipboard"
                          >
                            <i className="ri-file-copy-line"></i>
                          </button>
                        </div>
                      </div>
                    )}

                    {extractedText.extracted_data.transaction_date && (
                      <div className="field-item">
                        <label>Date:</label>
                        <div className="field-value">
                          <span>{new Date(extractedText.extracted_data.transaction_date).toLocaleDateString()}</span>
                          <button 
                            onClick={() => copyToClipboard(extractedText.extracted_data.transaction_date)}
                            className="copy-btn"
                            title="Copy to clipboard"
                          >
                            <i className="ri-file-copy-line"></i>
                          </button>
                        </div>
                      </div>
                    )}

                    {extractedText.extracted_data.payment_terms && (
                      <div className="field-item">
                        <label>Terms:</label>
                        <div className="field-value">
                          <span>{extractedText.extracted_data.payment_terms}</span>
                          <button 
                            onClick={() => copyToClipboard(extractedText.extracted_data.payment_terms)}
                            className="copy-btn"
                            title="Copy to clipboard"
                          >
                            <i className="ri-file-copy-line"></i>
                          </button>
                        </div>
                      </div>
                    )}

                    {extractedText.extracted_data.vat_reg_tin && (
                      <div className="field-item">
                        <label>TIN:</label>
                        <div className="field-value">
                          <span>{extractedText.extracted_data.vat_reg_tin}</span>
                          <button 
                            onClick={() => copyToClipboard(extractedText.extracted_data.vat_reg_tin)}
                            className="copy-btn"
                            title="Copy to clipboard"
                          >
                            <i className="ri-file-copy-line"></i>
                          </button>
                        </div>
                      </div>
                    )}

                    {extractedText.extracted_data.total_amount && (
                      <div className="field-item">
                        <label>Total Amount:</label>
                        <div className="field-value">
                          <span>{formatCurrency(extractedText.extracted_data.total_amount)}</span>
                          <button 
                            onClick={() => copyToClipboard(extractedText.extracted_data.total_amount.toString())}
                            className="copy-btn"
                            title="Copy to clipboard"
                          >
                            <i className="ri-file-copy-line"></i>
                          </button>
                        </div>
                      </div>
                    )}

                    {extractedText.extracted_data.vat_amount && (
                      <div className="field-item">
                        <label>VAT Amount:</label>
                        <div className="field-value">
                          <span>{formatCurrency(extractedText.extracted_data.vat_amount)}</span>
                          <button 
                            onClick={() => copyToClipboard(extractedText.extracted_data.vat_amount.toString())}
                            className="copy-btn"
                            title="Copy to clipboard"
                          >
                            <i className="ri-file-copy-line"></i>
                          </button>
                        </div>
                      </div>
                    )}

                    {extractedText.extracted_data.total_amount_due && (
                      <div className="field-item">
                        <label>Total Amount Due:</label>
                        <div className="field-value">
                          <span>{formatCurrency(extractedText.extracted_data.total_amount_due)}</span>
                          <button 
                            onClick={() => copyToClipboard(extractedText.extracted_data.total_amount_due.toString())}
                            className="copy-btn"
                            title="Copy to clipboard"
                          >
                            <i className="ri-file-copy-line"></i>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {extractedText.extracted_data.items && extractedText.extracted_data.items.length > 0 && (
                    <div className="extracted-items">
                      <h5>Detected Items ({extractedText.extracted_data.items.length}):</h5>
                      <div className="items-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Item Name</th>
                              <th>Qty</th>
                              <th>Unit</th>
                              <th>Unit Price</th>
                              <th>Total</th>
                              <th>Category</th>
                            </tr>
                          </thead>
                          <tbody>
                            {extractedText.extracted_data.items.map((item: any, index: number) => (
                              <tr key={index}>
                                <td className="item-name">{item.item_name}</td>
                                <td className="quantity">{item.quantity}</td>
                                <td className="unit">{item.unit}</td>
                                <td className="unit-price">{formatCurrency(item.unit_price)}</td>
                                <td className="total-price">{formatCurrency(item.total_price)}</td>
                                <td className="category">
                                  <span className={`category-badge ${item.category.toLowerCase().replace('_', '-')}`}>
                                    {item.category.replace('_', ' ')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* No items found message */}
                  {(!extractedText.extracted_data.items || extractedText.extracted_data.items.length === 0) && (
                    <div className="no-items-message">
                      <p>⚠️ No items detected. This might be due to:</p>
                      <ul>
                        <li>Poor image quality or resolution</li>
                        <li>Complex table structure</li>
                        <li>Handwritten text</li>
                        <li>Non-standard receipt format</li>
                      </ul>
                      <p>Try uploading a clearer image or use manual entry.</p>
                    </div>
                  )}
                </div>
              )}

              {extractedText.debug_info && (
                <div className="debug-info">
                  <small>
                    Debug: {extractedText.debug_info.regions_detected} text regions detected, 
                    {extractedText.debug_info.items_found} items extracted
                  </small>
                </div>
              )}

              {/* OCR Fields Debug */}
              {extractedText.ocr_fields && extractedText.ocr_fields.length > 0 && (
                <div className="ocr-fields-debug">
                  <details>
                    <summary>🔧 OCR Fields Debug ({extractedText.ocr_fields.length} fields)</summary>
                    <div className="ocr-fields-content">
                      {extractedText.ocr_fields.map((field: any, index: number) => {
                        const formatFieldValue = (fieldName: string, value: string) => {
                          // Format money fields with commas and currency symbol
                          if (['total_amount', 'vat_amount', 'total_amount_due'].includes(fieldName)) {
                            try {
                              const amount = parseFloat(value);
                              return formatCurrency(amount);
                            } catch {
                              return value;
                            }
                          }
                          return value;
                        };

                        return (
                          <div key={index} className="ocr-field-item">
                            <strong>{field.field_name}:</strong> {formatFieldValue(field.field_name, field.extracted_value)}
                            <span className="confidence">({(field.confidence_score * 100).toFixed(1)}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </div>
              )}
            </div>
          </>
          ) : (
            <div className="extraction-placeholder">
              <div className="placeholder-icon">
                <i className="ri-file-text-line"></i>
              </div>
              <h4>Scanned Details</h4>
              <p>Scanned details will appear here</p>
              <small>Upload an image to extract text and data automatically</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OCRUpload;