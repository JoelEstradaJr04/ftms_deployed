import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, table_affected, record_id, performed_by, details } = body;

    const log = await prisma.auditLog.create({
      data: {
        action,
        table_affected,
        record_id,
        performed_by,
        details,
      },
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error('Failed to create audit log:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log' },
      { status: 500 }
    );
  }
} 