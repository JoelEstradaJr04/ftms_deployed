import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateId } from '@/lib/idGenerator'

// POST /api/receipts/ocr
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const source = formData.get('source') as 'OCR_Camera' | 'OCR_File'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Create FormData for OCR service
    const ocrFormData = new FormData()
    ocrFormData.append('file', file)

    // Call OCR service
    const ocrResponse = await fetch('http://localhost:8001/process-receipt', {
      method: 'POST',
      body: ocrFormData,
    })

    if (!ocrResponse.ok) {
      throw new Error('OCR service failed')
    }

    const ocrResult = await ocrResponse.json()

    if (!ocrResult.success) {
      throw new Error(ocrResult.error || 'OCR processing failed')
    }

    // Debug logging
    console.log('=== OCR API ROUTE DEBUG ===');
    console.log('ocrResult.field_count:', ocrResult.field_count);
    console.log('ocrResult.fields_detected:', ocrResult.fields_detected);
    console.log('ocrResult.ocr_fields length:', ocrResult.ocr_fields?.length);
    console.log('ocrResult.overall_confidence:', ocrResult.overall_confidence);
    console.log('ocrResult.accuracy:', ocrResult.accuracy);

    // Process the OCR results for frontend
    const processedResult = {
      success: true,
      source,
      extracted_data: ocrResult.extracted_data,
      confidence: ocrResult.overall_confidence,
      
      // ADD: Pass through all the field count and confidence properties
      overall_confidence: ocrResult.overall_confidence,
      field_count: ocrResult.field_count,
      fields_detected: ocrResult.fields_detected,
      fields_found: ocrResult.fields_found,
      total_fields: ocrResult.total_fields,
      accuracy: ocrResult.accuracy,
      confidence_percentage: ocrResult.confidence_percentage,
      overall_accuracy: ocrResult.overall_accuracy,
      
      // Pass through OCR fields and debug info
      ocr_fields: ocrResult.ocr_fields,
      raw_ocr_fields: ocrResult.ocr_fields, // Legacy support
      keywords: ocrResult.keywords,
      raw_text: ocrResult.raw_text,
      debug_info: ocrResult.debug_info,
      
      suggestions: await generateFieldSuggestions(ocrResult.extracted_data)
    }

    return NextResponse.json(processedResult)
  } catch (error) {
    console.error('Error processing OCR:', error)
    return NextResponse.json(
      { error: 'Failed to process OCR: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}

// Generate suggestions for dropdowns based on extracted data
async function generateFieldSuggestions(extractedData: any) {
  const suggestions: any = {}

  try {
    // Get existing data for suggestions
    const [categories, paymentStatuses, terms, itemUnits] = await Promise.all([
      prisma.globalCategory.findMany({ where: { is_deleted: false } }),
      prisma.globalPaymentStatus.findMany({ where: { is_deleted: false } }),
      prisma.globalTerms.findMany({ where: { is_deleted: false } }),
      prisma.globalItemUnit.findMany({ where: { is_deleted: false } })
    ])

    // Suggest payment status based on amount and context
    if (extractedData.total_amount) {
      suggestions.payment_status_id = paymentStatuses.find(ps => ps.name === 'Paid')?.id || 
                                     paymentStatuses.find(ps => ps.name === 'Pending')?.id
    }

    // Suggest terms based on common patterns
    suggestions.terms_id = terms.find(t => t.name === 'Cash')?.id || terms[0]?.id

    // Suggest categories based on items
    if (extractedData.items && extractedData.items.length > 0) {
      const itemCategories = extractedData.items.map((item: any) => item.category)
      const uniqueCategories = [...new Set(itemCategories)]
      
      if (uniqueCategories.length === 1) {
        const categoryName = uniqueCategories[0]
        suggestions.category_id = categories.find(c => c.name === categoryName)?.category_id ||
                                 categories.find(c => c.name === 'Other')?.category_id
      } else if (uniqueCategories.length > 1) {
        suggestions.category_id = categories.find(c => c.name === 'Multiple_Categories')?.category_id
      }

      // Suggest units for items
      suggestions.item_units = extractedData.items.map((item: any) => {
        const suggestedUnit = itemUnits.find(u => 
          u.name.toLowerCase().includes(item.item_name?.toLowerCase().split(' ')[0] || '')
        )
        return {
          item_name: item.item_name,
          suggested_unit_id: suggestedUnit?.id || itemUnits.find(u => u.name === 'Piece')?.id
        }
      })
    }

    return suggestions
  } catch (error) {
    console.error('Error generating suggestions:', error)
    return {}
  }
}

// POST /api/receipts/ocr/save
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      receipt_id, 
      ocr_fields, 
      keywords, 
      confidence_score,
      file_path 
    } = body

    if (!receipt_id) {
      return NextResponse.json(
        { error: 'Receipt ID is required' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Update receipt with OCR metadata
      await tx.receipt.update({
        where: { receipt_id },
        data: {
          ocr_confidence: confidence_score,
          ocr_file_path: file_path
        }
      })

      // Save OCR fields
      if (ocr_fields && ocr_fields.length > 0) {
        for (const field of ocr_fields) {
          await tx.receiptOCRField.upsert({
            where: {
              receipt_id_field_name: {
                receipt_id,
                field_name: field.field_name
              }
            },
            update: {
              extracted_value: field.extracted_value,
              confidence_score: field.confidence_score,
              original_image_coords: field.coordinates || null
            },
            create: {
              field_id: await generateId('OCR'),
              receipt_id,
              field_name: field.field_name,
              extracted_value: field.extracted_value,
              confidence_score: field.confidence_score,
              original_image_coords: field.coordinates || null
            }
          })
        }
      }

      // Save keywords for search
      if (keywords && keywords.length > 0) {
        for (const keyword of keywords) {
          await tx.receiptKeyword.create({
            data: {
              keyword_id: await generateId('KWD'),
              receipt_id,
              keyword: keyword,
              source: 'OCR',
              confidence: 0.8
            }
          })
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'OCR data saved successfully'
    })
  } catch (error) {
    console.error('Error saving OCR data:', error)
    return NextResponse.json(
      { error: 'Failed to save OCR data' },
      { status: 500 }
    )
  }
}