import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateId } from '@/lib/idGenerator';

// GET: List all payment statuses
export async function GET() {
  const statuses = await prisma.globalPaymentStatus.findMany({ where: { is_deleted: false } });
  return NextResponse.json(statuses);
}

// POST: Create a new payment status
export async function POST(req: NextRequest) {
  const { name, applicable_modules } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const id = await generateId('PAY');
  const status = await prisma.globalPaymentStatus.create({
    data: { id, name, applicable_modules, is_deleted: false }
  });
  return NextResponse.json(status);
}

// PUT: Update a payment status
export async function PUT(req: NextRequest) {
  const { id, name, applicable_modules } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const updated = await prisma.globalPaymentStatus.update({
    where: { id },
    data: { name, applicable_modules }
  });
  return NextResponse.json(updated);
}

// DELETE: Soft delete a payment status
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await prisma.globalPaymentStatus.update({ where: { id }, data: { is_deleted: true } });
  return NextResponse.json({ success: true });
} 