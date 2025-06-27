// lib/operations/assignments.ts
// New assignments service that uses Operations API instead of Supabase

export type Assignment = {
  assignment_id: string;
  bus_trip_id: string;
  bus_route: string;
  is_revenue_recorded: boolean;
  is_expense_recorded: boolean;
  date_assigned: string;
  trip_fuel_expense: number;
  trip_revenue: number;
  assignment_type: string;
  assignment_value: number;
  payment_method: string;
  driver_name: string | null;
  conductor_name: string | null;
  bus_plate_number: string | null;
  bus_type: string | null;
  body_number: string | null;
  // Legacy fields for backward compatibility
  driver_id?: string | undefined;
  conductor_id?: string | undefined;
};

// Raw assignment type from Operations API - matches exact API response
type RawAssignment = {
  assignment_id: string;
  bus_trip_id: string;
  bus_route: string;
  is_revenue_recorded: boolean;
  is_expense_recorded: boolean;
  date_assigned: string;
  trip_fuel_expense: number;
  trip_revenue: number;
  assignment_type: string;
  assignment_value: number;
  payment_method: string | null;
  driver_name: string | null;
  conductor_name: string | null;
  bus_plate_number: string | null;
  bus_type: string | null;
  body_number: string | null;
};

// Operations API base URL - must be set in environment variables
// Use NEXT_PUBLIC_ prefix for client-side access, fallback to server-side variable
const OP_API_BASE_URL = process.env.NEXT_PUBLIC_OP_API_BASE_URL || process.env.OP_API_BASE_URL;

if (!OP_API_BASE_URL) {
  throw new Error('OP_API_BASE_URL or NEXT_PUBLIC_OP_API_BASE_URL environment variable is required');
}

// Fetch all assignments from Operations API (client-side uses API route)
export async function getAllAssignments(): Promise<Assignment[]> {
  try {
    // Client-side: use local API route to avoid CORS
    const response = await fetch('/api/assignments?RequestType=revenue');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    return data;
  } catch (error) {
    console.error('Error fetching assignments from Operations API:', error);
    throw new Error(`Failed to fetch assignments: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Server-side only function for direct API calls
export async function fetchAssignmentsFromOperationsAPI(): Promise<Assignment[]> {
  if (!process.env.OP_API_BASE_URL) {
    throw new Error('OP_API_BASE_URL environment variable is required for server-side fetching');
  }

  try {
    const response = await fetch(`${process.env.OP_API_BASE_URL}?RequestType=revenue`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format: expected array');
    }
    
    // Transform the data to match our Assignment type and deduplicate
    const transformedData = data.map((assignment: RawAssignment) => {
      let normalizedBusType = assignment.bus_type;
      if (normalizedBusType === 'Non-Aircon') normalizedBusType = 'Ordinary';
      return {
        assignment_id: assignment.assignment_id,
        bus_trip_id: assignment.bus_trip_id,
        bus_route: assignment.bus_route,
        is_revenue_recorded: assignment.is_revenue_recorded ?? false,
        is_expense_recorded: assignment.is_expense_recorded ?? false,
        date_assigned: assignment.date_assigned,
        trip_fuel_expense: Number(assignment.trip_fuel_expense) || 0,
        trip_revenue: Number(assignment.trip_revenue) || 0,
        assignment_type: assignment.assignment_type,
        assignment_value: Number(assignment.assignment_value) || 0,
        payment_method: assignment.payment_method ?? '',
        driver_name: assignment.driver_name,
        conductor_name: assignment.conductor_name,
        bus_plate_number: assignment.bus_plate_number,
        bus_type: normalizedBusType,
        body_number: assignment.body_number,
        driver_id: assignment.driver_name || undefined,
        conductor_id: assignment.conductor_name || undefined,
      };
    });

    // Deduplicate based on assignment_id and date_assigned combination
    const uniqueAssignments = transformedData.filter((assignment, index, self) => {
      const key = `${assignment.assignment_id}-${assignment.date_assigned}`;
      return index === self.findIndex(a => `${a.assignment_id}-${a.date_assigned}` === key);
    });

    // console.log(`Fetched ${data.length} assignments from Operations API, deduplicated to ${uniqueAssignments.length}`);
    // console.log('Sample assignment data:', uniqueAssignments[0]);

    return uniqueAssignments;
  } catch (error) {
    console.error('Error fetching assignments from Operations API:', error);
    throw new Error(`Failed to fetch assignments: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get assignment by ID
export async function getAssignmentById(id: string): Promise<Assignment | null> {
  try {
    const isServerSide = typeof window === 'undefined' && process.env.OP_API_BASE_URL;
    if (isServerSide) {
      const assignments = await fetchAssignmentsFromOperationsAPI();
      const assignment = assignments.find(assignment => assignment.assignment_id === id);
      return assignment || null;
    } else {
      // Client-side: use local API route
      const assignments = await getAllAssignments();
      const assignment = assignments.find(assignment => assignment.assignment_id === id);
      return assignment || null;
    }
  } catch (error) {
    console.error('Error fetching assignment by ID:', error);
    return null;
  }
}

// Get unrecorded revenue assignments (for revenue module)
export async function getUnrecordedRevenueAssignments(): Promise<Assignment[]> {
  try {
    const assignments = await getAllAssignments();
    // Since we don't have is_revenue_recorded from Operations API,
    // we'll return all assignments and let the frontend handle filtering
    return assignments;
  } catch (error) {
    console.error('Error fetching unrecorded revenue assignments:', error);
    throw error;
  }
}

// Get unrecorded expense assignments (for expense module)
export async function getUnrecordedExpenseAssignments(): Promise<Assignment[]> {
  try {
    const assignments = await getAllAssignments();
    // Since we don't have is_expense_recorded from Operations API,
    // we'll return all assignments and let the frontend handle filtering
    return assignments;
  } catch (error) {
    console.error('Error fetching unrecorded expense assignments:', error);
    throw error;
  }
}

// Get all assignments with recorded status (for backward compatibility)
export async function getAllAssignmentsWithRecorded(): Promise<Assignment[]> {
  try {
    const assignments = await getAllAssignments();
    // Since we don't have recorded status from Operations API,
    // we'll return all assignments with default values
    return assignments.map(assignment => ({
      ...assignment,
      is_expense_recorded: false,
      is_revenue_recorded: false,
    }));
  } catch (error) {
    console.error('Error fetching assignments with recorded status:', error);
    throw error;
  }
}

// Update assignment recorded status (placeholder - Operations API doesn't support this)
export async function updateAssignmentIsRecorded(): Promise<{ success: boolean; message: string }> {
  console.warn('updateAssignmentIsRecorded called but Operations API does not support updating recorded status');
  // This is a placeholder since Operations API doesn't support updating recorded status
  // In a real implementation, you might want to store this in your local database
  return { success: true, message: 'Recorded status would be updated in local database' };
}

// Refresh assignments cache (placeholder - no cache with Operations API)
export async function refreshAssignmentsCache(): Promise<Assignment[]> {
  //console.log('Refreshing assignments from Operations API');
  return await getAllAssignments();
} 