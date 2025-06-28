// app\api\assignments\route.ts
import { NextResponse } from 'next/server'
import { fetchAssignmentsFromOperationsAPI } from '../../../lib/operations/assignments'

export async function GET() {
  try {
    const assignments = await fetchAssignmentsFromOperationsAPI();
    
    // If assignments is empty, it means the API failed but we're returning empty array as fallback
    if (assignments.length === 0) {
      console.warn('Operations API returned empty assignments array - this may indicate connectivity issues');
      return NextResponse.json([], { 
        status: 200,
        headers: {
          'X-API-Status': 'fallback-empty',
          'X-API-Message': 'Operations API unavailable, returning empty assignments'
        }
      });
    }
    
    return NextResponse.json(assignments);
  } catch (error: unknown) {
    console.error('Failed to fetch assignments from Operations API:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Internal Server Error';
      
    // Return empty array with error status instead of throwing
    return NextResponse.json([], { 
      status: 200,
      headers: {
        'X-API-Status': 'error-fallback',
        'X-API-Error': errorMessage
      }
    });
  }
}