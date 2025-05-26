import { NextResponse } from 'next/server';
import { logAudit } from '@/lib/auditLogger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, table_affected, record_id, details } = body;

    await logAudit({
      action,
      table_affected,
      record_id,
      performed_by: 'ftms_user',
      details,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log' },
      { status: 500 }
    );
  }
} 