// api\assignments\[id]\route.ts
import { NextResponse } from 'next/server'
import { getAssignmentById, updateAssignmentIsRecorded } from '../../../../lib/supabase/assignments'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.pathname.split('/').pop()

  if (!id) {
    return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 })
  }

  try {
    const assignment = await getAssignmentById(id)

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    return NextResponse.json(assignment)
  } catch (error: unknown) {
    console.error('Failed to fetch assignment from Supabase:', error)

    const errorMessage = error instanceof Error
      ? error.message
      : 'Internal Server Error'

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const id = req.nextUrl.pathname.split('/').pop()

  if (!id) {
    return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const { is_recorded } = body

    if (typeof is_recorded !== 'boolean') {
      return NextResponse.json({ error: 'Invalid value for is_recorded' }, { status: 400 })
    }

    const updated = await updateAssignmentIsRecorded(id, is_recorded)

    return NextResponse.json({ success: true, updated })
  } catch (error: unknown) {
    console.error('Failed to update assignment is_recorded:', error)

    const errorMessage = error instanceof Error
      ? error.message
      : 'Internal Server Error'

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
