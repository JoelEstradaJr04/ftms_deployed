import { NextResponse } from 'next/server'
import { generateExportId } from '@/lib/idGenerator'

export async function GET() {
  try {
    const exportId = await generateExportId()
    return NextResponse.json({ exportId })
  } catch (error) {
    console.error('Failed to generate export ID:', error)
    return NextResponse.json(
      { error: 'Failed to generate export ID' },
      { status: 500 }
    )
  }
} 