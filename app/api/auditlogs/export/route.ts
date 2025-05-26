import { prisma } from '@/lib/prisma';
import { generateId } from '@/lib/idGenerator';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, table_affected, record_id, details } = body;

    const log = await prisma.auditLog.create({
      data: {
        log_id: await generateId('LOG'),
        action,
        table_affected,
        record_id,
        performed_by: 'ftms_user',
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