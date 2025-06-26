import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateId } from '@/lib/idGenerator';

// Define proper types for the where clause
interface WhereClause {
  is_deleted: boolean;
  applicable_modules?: {
    has: string;
  };
}

// GET: List all categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleParam = searchParams.get('module');

    const whereClause: WhereClause = {
      is_deleted: false
    };

    // If module is specified, filter by applicable_modules
    if (moduleParam) {
      whereClause.applicable_modules = {
        has: moduleParam
      };
    }

    const categories = await prisma.globalCategory.findMany({
      where: whereClause,
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST: Create a new category
export async function POST(req: NextRequest) {
  const { name, applicable_modules } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const category_id = await generateId('CAT');
  const category = await prisma.globalCategory.create({
    data: { category_id, name, applicable_modules, is_deleted: false }
  });
  return NextResponse.json(category);
}

// PUT: Update a category
export async function PUT(req: NextRequest) {
  const { category_id, name, applicable_modules } = await req.json();
  if (!category_id) return NextResponse.json({ error: 'category_id is required' }, { status: 400 });
  const updated = await prisma.globalCategory.update({
    where: { category_id },
    data: { name, applicable_modules }
  });
  return NextResponse.json(updated);
}

// DELETE: Soft delete a category
export async function DELETE(req: NextRequest) {
  const { category_id } = await req.json();
  if (!category_id) return NextResponse.json({ error: 'category_id is required' }, { status: 400 });
  await prisma.globalCategory.update({ where: { category_id }, data: { is_deleted: true } });
  return NextResponse.json({ success: true });
}