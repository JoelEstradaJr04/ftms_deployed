import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPayrollConfig() {
  try {
    // Employee numbers from the mock data
    const employees = [
      'EMP-2025-OFAFFC',
      'EMP-2025-1G46NX', 
      'EMP-2023-GKYTQR',
      'EMP-2024-P84Y18'
    ];

    console.log('Seeding payroll frequency configurations...');

    for (const employeeNumber of employees) {
      await prisma.payrollFrequencyConfig.upsert({
        where: { employee_number: employeeNumber },
        update: { payroll_period: 'monthly' },
        create: {
          employee_number: employeeNumber,
          payroll_period: 'monthly'
        }
      });
    }

    console.log('Payroll frequency configurations seeded successfully!');
  } catch (error) {
    console.error('Error seeding payroll config:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedPayrollConfig(); 