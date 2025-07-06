// Test script to verify payroll API endpoints
const BASE_URL = 'http://localhost:3000';

async function testPayrollAPI() {
  console.log('Testing Payroll API endpoints...\n');

  try {
    // Test HR Employees endpoint
    console.log('1. Testing HR Employees endpoint...');
    const hrResponse = await fetch(`${BASE_URL}/api/hr-employees?start=2025-06-01&end=2025-06-30&payrollPeriod=monthly`);
    const hrData = await hrResponse.json();
    console.log('HR Employees Response:', JSON.stringify(hrData, null, 2));
    console.log('');

    // Test Payroll Generation endpoint
    console.log('2. Testing Payroll Generation endpoint...');
    const genResponse = await fetch(`${BASE_URL}/api/payroll/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start: '2025-06-01',
        end: '2025-06-30',
        periodType: 'monthly'
      })
    });
    const genData = await genResponse.json();
    console.log('Payroll Generation Response:', JSON.stringify(genData, null, 2));
    console.log('');

    // Test Payroll Records endpoint
    console.log('3. Testing Payroll Records endpoint...');
    const recordsResponse = await fetch(`${BASE_URL}/api/payroll?page=1&pageSize=10`);
    const recordsData = await recordsResponse.json();
    console.log('Payroll Records Response:', JSON.stringify(recordsData, null, 2));

  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testPayrollAPI(); 