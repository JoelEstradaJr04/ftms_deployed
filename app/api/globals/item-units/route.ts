import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List all item units
export async function GET() {
  const units = await prisma.globalItemUnit.findMany({ where: { is_deleted: false } });
  return NextResponse.json(units);
} 