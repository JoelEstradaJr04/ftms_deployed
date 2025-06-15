import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateId } from '@/lib/idGenerator';

export async function POST(req: NextRequest) {
  try {
    const {
      action,
      table_affected,
      record_id,
      performed_by,
      details
    } = await req.json();

    const audit = await prisma.auditLog.create({
      data: {
        log_id: await generateId('LOG'),
        action,
        table_affected,
        record_id,
        performed_by,
        details,
        timestamp: new Date(),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    return NextResponse.json(audit);
  } catch (error) {
    console.error('Failed to create audit log:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    );
  }
} 