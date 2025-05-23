// FOR ADMIN ONLY
import { prisma } from '../../../lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
  })
  return NextResponse.json(logs)
}
