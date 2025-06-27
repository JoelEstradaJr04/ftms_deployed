// app\api\assignments\route.ts
import { NextResponse } from 'next/server'
import { fetchAssignmentsFromOperationsAPI } from '../../../lib/operations/assignments'

export async function GET() {
  try {
    const assignments = await fetchAssignmentsFromOperationsAPI();
    return NextResponse.json(assignments);
  } catch (error: unknown) {
    console.error('Failed to fetch assignments from Operations API:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Internal Server Error';
      
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  }
}