import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

interface HREmployee {
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  employeeStatus: string;
  hiredate: string;
  terminationDate?: string | null;
  basicRate: string;
  position?: {
    positionName?: string;
    department?: {
      departmentName?: string;
    };
  };
  attendances?: Array<{
    date: string;
    status: string;
  }>;
  benefits?: Array<{
    benefitType: {
      name: string;
    };
    value: string | number;
    frequency: string;
    effectiveDate: string;
    endDate?: string | null;
    isActive: boolean;
  }>;
  deductions?: Array<{
    deductionType: {
      name: string;
    };
    type: string;
    value: string | number;
    frequency: string;
    effectiveDate: string;
    endDate?: string | null;
    isActive: boolean;
  }>;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const payrollPeriod = searchParams.get('payrollPeriod')?.toLowerCase();

    if (!start || !end || !payrollPeriod) {
      return NextResponse.json({ success: false, error: 'Missing required params' }, { status: 400 });
    }

    // For now, we'll use mock data that matches your structure
    // In production, this would fetch from your HR API
    const mockHrEmployees: HREmployee[] = [
      {
        "employeeNumber": "EMP-2025-OFAFFC",
        "firstName": "Carl",
        "middleName": "Aldrey D.",
        "lastName": "Bergado",
        "suffix": "",
        "employeeStatus": "active",
        "hiredate": "2025-06-27T00:00:00.000Z",
        "terminationDate": null,
        "basicRate": "500",
        "position": {
          "positionName": "HR Officer",
          "department": {
            "departmentName": "Human Resources"
          }
        },
        "attendances": [
          {
            "date": "2025-06-26T00:00:00.000Z",
            "status": "Present"
          },
          {
            "date": "2025-06-28T00:00:00.000Z",
            "status": "Present"
          }
        ],
        "benefits": [
          {
            "benefitType": {
              "name": "Holiday Pay"
            },
            "value": "500",
            "frequency": "monthly",
            "effectiveDate": "2025-06-17T00:00:00.000Z",
            "endDate": null,
            "isActive": true
          }
        ],
        "deductions": [
          {
            "deductionType": {
              "name": "Philhealth"
            },
            "type": "fixed",
            "value": "500",
            "frequency": "monthly",
            "effectiveDate": "2025-06-26T00:00:00.000Z",
            "endDate": null,
            "isActive": true
          }
        ]
      },
      {
        "employeeNumber": "EMP-2025-1G46NX",
        "firstName": "John Mark",
        "middleName": "Altoveros",
        "lastName": "Garces",
        "suffix": "",
        "employeeStatus": "active",
        "hiredate": "2025-06-26T00:00:00.000Z",
        "terminationDate": null,
        "basicRate": "750",
        "position": {
          "positionName": "Operations Manager",
          "department": {
            "departmentName": "Operations"
          }
        },
        "attendances": [],
        "benefits": [
          {
            "benefitType": {
              "name": "Safety Benefit"
            },
            "value": "500",
            "frequency": "monthly",
            "effectiveDate": "2025-06-24T00:00:00.000Z",
            "endDate": null,
            "isActive": true
          }
        ],
        "deductions": [
          {
            "deductionType": {
              "name": "Philhealth"
            },
            "type": "fixed",
            "value": "500",
            "frequency": "monthly",
            "effectiveDate": "2025-06-27T00:00:00.000Z",
            "endDate": null,
            "isActive": true
          }
        ]
      },
      {
        "employeeNumber": "EMP-2023-GKYTQR",
        "firstName": "Brian",
        "middleName": "Sanoria",
        "lastName": "Caube",
        "suffix": "",
        "employeeStatus": "active",
        "hiredate": "2023-12-17T00:00:00.000Z",
        "terminationDate": null,
        "basicRate": "700",
        "position": {
          "positionName": "Accountant",
          "department": {
            "departmentName": "Finance"
          }
        },
        "attendances": [],
        "benefits": [
          {
            "benefitType": {
              "name": "Holiday Pay"
            },
            "value": "15000",
            "frequency": "annually",
            "effectiveDate": "2025-06-27T00:00:00.000Z",
            "endDate": null,
            "isActive": true
          }
        ],
        "deductions": [
          {
            "deductionType": {
              "name": "SSS"
            },
            "type": "percentage",
            "value": "5",
            "frequency": "monthly",
            "effectiveDate": "2025-06-25T00:00:00.000Z",
            "endDate": null,
            "isActive": true
          }
        ]
      },
      {
        "employeeNumber": "EMP-2024-P84Y18",
        "firstName": "Kristine Mae",
        "middleName": "",
        "lastName": "Cleofas",
        "suffix": "",
        "employeeStatus": "active",
        "hiredate": "2024-11-12T00:00:00.000Z",
        "terminationDate": null,
        "basicRate": "900",
        "position": {
          "positionName": "Stockroom Supervisor",
          "department": {
            "departmentName": "Inventory"
          }
        },
        "attendances": [],
        "benefits": [
          {
            "benefitType": {
              "name": "13th Month Pay"
            },
            "value": "20000",
            "frequency": "annually",
            "effectiveDate": "2025-06-28T00:00:00.000Z",
            "endDate": null,
            "isActive": true
          }
        ],
        "deductions": [
          {
            "deductionType": {
              "name": "Pag-ibig"
            },
            "type": "fixed",
            "value": "300",
            "frequency": "monthly",
            "effectiveDate": "2025-06-28T00:00:00.000Z",
            "endDate": null,
            "isActive": true
          }
        ]
      }
    ];

    // Get payroll frequency config for all employees
    const configs: Array<{employee_number: string; payroll_period: string}> = await prisma.payrollFrequencyConfig.findMany();
    const configMap = new Map(configs.map(cfg => [cfg.employee_number, cfg.payroll_period.toLowerCase()]));

    // Filter employees by payroll period and active status
    const eligible = mockHrEmployees.filter((emp) => {
      // Check if employee is active
      if (emp.employeeStatus.toLowerCase() !== 'active') {
        return false;
      }

      // Get employee's payroll period from config, default to monthly
      const empPeriod = configMap.get(emp.employeeNumber) || 'monthly';
      
      // Filter by requested payroll period
      return empPeriod === payrollPeriod;
    });

    // Transform to match the expected interface for the frontend
    const transformedEmployees = eligible.map(emp => ({
      employeeNumber: emp.employeeNumber,
      firstName: emp.firstName,
      middleName: emp.middleName,
      lastName: emp.lastName,
      suffix: emp.suffix,
      position: emp.position,
      payrollPeriod: configMap.get(emp.employeeNumber) || 'monthly'
    }));

    return NextResponse.json({ success: true, employees: transformedEmployees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 