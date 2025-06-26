import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateId } from '@/lib/idGenerator';

// GET: List all item units
export async function GET() {
  const units = await prisma.globalItemUnit.findMany({ where: { is_deleted: false } });
  return NextResponse.json(units);
}

// POST: Create a new item unit
export async function POST(req: NextRequest) {
  const { name, applicable_modules } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const id = await generateId('UNIT');
  const unit = await prisma.globalItemUnit.create({
    data: { id, name, applicable_modules, is_deleted: false }
  });
  return NextResponse.json(unit);
} 