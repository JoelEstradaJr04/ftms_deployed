import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // --- GlobalCategory ---
  const categories = [
    { name: 'Fuel', modules: ['expense', 'receipt'] },
    { name: 'Vehicle_Parts', modules: ['expense', 'receipt'] },
    { name: 'Tools', modules: ['expense', 'receipt'] },
    { name: 'Equipment', modules: ['expense', 'receipt'] },
    { name: 'Supplies', modules: ['expense', 'receipt'] },
    { name: 'Multiple_Categories', modules: ['expense', 'receipt'] },
    { name: 'Boundary', modules: ['revenue'] },
    { name: 'Percentage', modules: ['revenue'] },
    { name: 'Bus_Rental', modules: ['revenue'] },
  ];
  for (const { name, modules } of categories) {
    await prisma.globalCategory.upsert({
      where: { name },
      update: { applicable_modules: modules },
      create: { name, applicable_modules: modules, is_deleted: false },
    });
  }

  // --- GlobalReimbursementStatus (for receipts and reimbursements) ---
  const statuses = [
    { name: 'Paid', modules: ['receipt'] },
    { name: 'Pending', modules: ['receipt'] },
    { name: 'Cancelled', modules: ['receipt'] },
    { name: 'Dued', modules: ['receipt'] },
    { name: 'PENDING', modules: ['reimbursement'] },
    { name: 'APPROVED', modules: ['reimbursement'] },
    { name: 'REJECTED', modules: ['reimbursement'] },
    { name: 'PAID', modules: ['reimbursement'] },
    { name: 'CANCELLED', modules: ['reimbursement'] },
  ];
  // Only one entry per unique name, merge modules
  const statusMap = {};
  for (const { name, modules } of statuses) {
    if (!statusMap[name]) statusMap[name] = new Set();
    modules.forEach(m => statusMap[name].add(m));
  }
  for (const name in statusMap) {
    await prisma.globalReimbursementStatus.upsert({
      where: { name },
      update: { applicable_modules: Array.from(statusMap[name]) },
      create: { name, applicable_modules: Array.from(statusMap[name]), is_deleted: false },
    });
  }

  // --- GlobalSource ---
  const sources = [
    { name: 'Manual_Entry', modules: ['receipt'] },
    { name: 'OCR_Camera', modules: ['receipt'] },
    { name: 'OCR_File', modules: ['receipt'] },
    { name: 'Boundary_Assignment', modules: ['revenue'] },
    { name: 'Percentage_Assignment', modules: ['revenue'] },
    { name: 'Bus_Rental_Assignment', modules: ['revenue'] },
  ];
  for (const { name, modules } of sources) {
    await prisma.globalSource.upsert({
      where: { name },
      update: { applicable_modules: modules },
      create: { name, applicable_modules: modules, is_deleted: false },
    });
  }

  // --- GlobalTerms ---
  const terms = [
    { name: 'Net_15', modules: ['receipt'] },
    { name: 'Net_30', modules: ['receipt'] },
    { name: 'Net_60', modules: ['receipt'] },
    { name: 'Net_90', modules: ['receipt'] },
    { name: 'Cash', modules: ['receipt'] },
  ];
  for (const { name, modules } of terms) {
    await prisma.globalTerms.upsert({
      where: { name },
      update: {},
      create: { name, applicable_modules: modules, is_deleted: false },
    });
  }

  // --- GlobalItemUnit ---
  const itemUnits = [
    'piece', 'box', 'pack', 'liter', 'gallon', 'milliliter', 'kilogram', 'gram', 'meter', 'foot', 'roll', 'set', 'pair'
  ];
  for (const name of itemUnits) {
    await prisma.globalItemUnit.upsert({
      where: { name },
      update: {},
      create: { name, is_deleted: false },
    });
  }

  // --- GlobalPaymentMethod ---
  const paymentMethods = [
    { name: 'CASH', modules: ['expense'] },
    { name: 'REIMBURSEMENT', modules: ['expense'] },
  ];
  for (const { name } of paymentMethods) {
    await prisma.globalPaymentMethod.upsert({
      where: { name },
      update: {},
      create: { name, is_deleted: false },
    });
  }

  // --- GlobalPaymentStatus ---
  const paymentStatuses = [
    { name: 'Paid' },
    { name: 'Pending' },
    { name: 'Cancelled' },
    { name: 'Dued' },
  ];
  for (const { name } of paymentStatuses) {
    await prisma.globalPaymentStatus.upsert({
      where: { name },
      update: {},
      create: { name, is_deleted: false },
    });
  }

  console.log('Seeded all global tables.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect()); 