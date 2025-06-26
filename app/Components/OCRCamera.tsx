'use client';

import React, { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import Swal from 'sweetalert2';
import OCRErrorBoundary from './OCRErrorBoundary';

type OCRCameraProps = {
  onOCRComplete: (data: {
    supplier: string;
    transaction_date: string;
    vat_reg_tin?: string;
    total_amount: number;
    vat_amount?: number;
    items: Array<{
      item_name: string;
      unit: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
    total_amount_due: number;
    terms?: string;
  }) => void;
};

const OCRCamera: React.FC<OCRCameraProps> = ({ onOCRComplete }) => {
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    return () => {
      // Cleanup: stop camera stream when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      Swal.fire('Error', 'Failed to access camera. Please check permissions.', 'error');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      setLoading(true);
      try {
        const result = await Tesseract.recognize(blob, 'eng', {
          logger: m => console.log(m)
        });

        const text = result.data.text;
        console.log('OCR Text:', text);

        // Parse the OCR text to extract relevant information
        const parsedData = parseOCRText(text);
        onOCRComplete(parsedData);
        stopCamera();
      } catch (error) {
        console.error('OCR Error:', error);
        Swal.fire('Error', 'Failed to process image. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    }, 'image/jpeg');
  };

  const parseOCRText = (text: string) => {
    // Initialize default values
    const data = {
      supplier: '',
      transaction_date: new Date().toISOString().split('T')[0],
      vat_reg_tin: '',
      total_amount: 0,
      vat_amount: 0,
      items: [] as Array<{
        item_name: string;
        unit: string;
        quantity: number;
        unit_price: number;
        total_price: number;
      }>,
      total_amount_due: 0,
      terms: undefined as string | undefined,
    };

    // Extract supplier name - Prioritize main company name
    const mainSupplierKeywords = ['CORP', 'INC', 'ENTERPRISES', 'COMPANY', 'HOLDINGS'];
    let supplierFound = false;
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    for (let i = 0; i < Math.min(5, lines.length); i++) { // Check first 5 lines for main supplier
      const line = lines[i];
      if (mainSupplierKeywords.some(keyword => line.toUpperCase().includes(keyword))) {
        data.supplier = line;
        supplierFound = true;
        break;
      }
    }

    if (!supplierFound) {
      // Fallback to "Sold to:" or similar for customer name
      const soldToMatch = text.match(/(?:Sold to|To)[:\s]*([^\n]+)/i);
      if (soldToMatch) {
        data.supplier = soldToMatch[1].trim();
        supplierFound = true;
      }
    }

    if (!supplierFound && lines.length > 0) {
      // Final fallback to the very first non-empty line if nothing else found
      data.supplier = lines[0];
    }

    // Extract transaction date
    // eslint-disable-next-line prefer-const
    let dateMatch = text.match(/(?:Date|Transaction Date)[:\s]*((?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})|((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}))/i);
    if (dateMatch) {
      const dateStr = dateMatch[1];
      let dateObj: Date;

      if (dateStr.match(/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/)) {
        // Handle DD/MM/YYYY, MM/DD/YYYY, DD.MM.YYYY etc.
        const parts = dateStr.split(/[-/.]/);
        // Try parsing as MM/DD/YYYY first, then DD/MM/YYYY
        let testDate = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
        if (isNaN(testDate.getTime())) {
          testDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        dateObj = testDate;
      } else {
        // Handle Month Day, Year (e.g., Apr 5, 2025)
        dateObj = new Date(dateStr.replace(/(st|nd|rd|th)/g, ''));
      }

      if (!isNaN(dateObj.getTime())) {
        data.transaction_date = dateObj.toISOString().split('T')[0];
      }
    }

    // Extract VAT Reg TIN
    const vatTinMatch = text.match(/(?:VAT(?: Reg\.)?|TIN(?:\/SC-TIN)?|Tax ID|TRN)[:\s]*([A-Z0-9-]{5,})/i); // Capture at least 5 chars
    if (vatTinMatch) {
      data.vat_reg_tin = vatTinMatch[1].trim();
    }

    // Extract Terms
    const termsMatch = text.match(/(?:Terms)[:\s]*([^\n]+)/i);
    if (termsMatch) {
      const termsText = termsMatch[1].trim();
      // Simple mapping for common terms
      if (termsText.toLowerCase().includes('net 60')) {
        data.terms = 'Net_60';
      } else if (termsText.toLowerCase().includes('net 30')) {
        data.terms = 'Net_30';
      } else if (termsText.toLowerCase().includes('net 15')) {
        data.terms = 'Net_15';
      } else if (termsText.toLowerCase().includes('cash')) {
        data.terms = 'Cash';
      } else {
        data.terms = termsText; // Use as is if not a standard term
      }
    }
    
    // Extract VAT Amount
    const vatAmountMatch = text.match(/(?:VAT Amount|VAT)[:\s]+(?:₱|P)?\s*([\d,]+\.?\d{0,2})/i);
    if (vatAmountMatch) {
      data.vat_amount = parseFloat(vatAmountMatch[1].replace(/,/g, ''));
    }

    // Extract Total Amount (Net of VAT / VATable Sales)
    // eslint-disable-next-line prefer-const
    let netTotalMatch = text.match(/(?:VATable Sales|Amount: Net of VAT|Total Sales \(VAT Inclusive\)|Subtotal)[:\s]+(?:₱|P)?\s*([\d,]+\.?\d{0,2})/i);
    if (netTotalMatch) {
      data.total_amount = parseFloat(netTotalMatch[1].replace(/,/g, ''));
    } else {
        // Fallback: look for a total amount before explicit VAT/Total Due
        const generalTotalMatch = text.match(/Total[:\s]+(?:₱|P)?\s*([\d,]+\.?\d{0,2})/i);
        if (generalTotalMatch) {
            data.total_amount = parseFloat(generalTotalMatch[1].replace(/,/g, ''));
        }
    }

    // Explicitly extract Total Amount Due
    const totalAmountDueMatch = text.match(/(?:TOTAL AMOUNT DUE|Amount Due|Balance Due)[:\s]+(?:₱|P)?\s*([\d,]+\.?\d{0,2})/i);
    if (totalAmountDueMatch) {
      data.total_amount_due = parseFloat(totalAmountDueMatch[1].replace(/,/g, ''));
    } else {
      // Fallback: calculate if not explicitly found and other values are present
      if (data.total_amount > 0 || data.vat_amount > 0) {
          data.total_amount_due = data.total_amount + data.vat_amount;
      }
    }

    // Improved Item Extraction Strategy
    const allLines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Attempt to find the item table headers to define a processing block
    let itemSectionStartIndex = -1;
    for (let i = 0; i < allLines.length; i++) {
        if (allLines[i].includes('QTY') && allLines[i].includes('UNIT') && allLines[i].includes('ARTICLES') && allLines[i].includes('AMOUNT')) {
            itemSectionStartIndex = i;
            break;
        }
    }

    if (itemSectionStartIndex !== -1) {
        // Process lines after the header row
        for (let i = itemSectionStartIndex + 1; i < allLines.length; i++) {
            const line = allLines[i];

            // Stop if we hit a summary line
            if (line.toLowerCase().includes('total') || line.toLowerCase().includes('vat') || line.toLowerCase().includes('subtotal')) {
                break;
            }

            // Regex to capture Quantity, Unit, Item Name, Unit Price, Total Price
            // This regex is highly flexible to handle OCR flattening and various spacing.
            // It assumes: Quantity, optional Unit, Item Name (greedy), optional Unit Price, mandatory Total Price
            const itemMatch = line.match(/^(\d+\.?\d*)\s*([A-Z]+)?\s*([A-Z0-9\s.\-/,#]+?)(?:\s*(?:₱|P)?\s*([\d,]+\.?\d{0,2}))?\s*(?:₱|P)?\s*([\d,]+\.?\d{0,2})$/i);

            if (itemMatch) {
                const [, quantityStr, unitStr, itemNamePart, unitPriceStr, totalPriceStr] = itemMatch;
                const quantity = parseFloat(quantityStr);
                const unit = unitStr ? unitStr.trim() : 'piece(s)';
                const itemName = itemNamePart.trim();
                const unitPrice = unitPriceStr ? parseFloat(unitPriceStr.replace(/,/g, '')) : 0;
                const totalPrice = parseFloat(totalPriceStr.replace(/,/g, ''));

                data.items.push({
                    item_name: itemName,
                    unit: unit,
                    quantity: quantity,
                    unit_price: unitPrice,
                    total_price: totalPrice
                });
            }
        }
    }

    // Fallback if no items were detected by the structured approach
    if (data.items.length === 0) {
      const generalItemLines = text.split('\n').filter(line => {
        // Filter for lines that likely contain an item: has text, numbers, and is long enough
        return line.trim().length > 5 && /[a-zA-Z]/.test(line) && /[\d,.]/.test(line);
      });

      generalItemLines.forEach(line => {
        // Try to find a simple item name and a single price (assumed total price)
        const simpleItemMatch = line.match(/(.+?)\s+(?:₱|P)?([\d,]+\.?\d{0,2})$/i);
        if (simpleItemMatch) {
          const [, itemName, priceStr] = simpleItemMatch;
          data.items.push({
            item_name: itemName.trim(),
            unit: 'piece(s)',
            quantity: 1,
            unit_price: parseFloat(priceStr.replace(/,/g, '')),
            total_price: parseFloat(priceStr.replace(/,/g, ''))
          });
        }
      });
    }

    return data;
  };

  return (
    <OCRErrorBoundary>
      <div className="ocr-camera-container">
        <div className="camera-section">
          {!stream ? (
            <button onClick={startCamera} className="start-camera-btn">
              <i className="ri-camera-line"></i> Start Camera
            </button>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="camera-preview"
              />
              <div className="camera-controls">
                <button onClick={captureImage} className="capture-btn" disabled={loading}>
                  <i className="ri-camera-line"></i> Capture
                </button>
                <button onClick={stopCamera} className="stop-btn">
                  <i className="ri-close-line"></i> Stop
                </button>
              </div>
            </>
          )}
          {loading && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <p>Processing image...</p>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </OCRErrorBoundary>
  );
};

export default OCRCamera; 