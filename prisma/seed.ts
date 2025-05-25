import { PrismaClient, ExpenseCategory, Department } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clean up existing data
  await prisma.itemTransaction.deleteMany()
  await prisma.receiptItem.deleteMany()
  await prisma.receipt.deleteMany()
  await prisma.item.deleteMany()
  await prisma.expenseRecord.deleteMany()
  await prisma.auditLog.deleteMany()

  // Create some items in the master list
  const items = await Promise.all([
    prisma.item.create({
      data: {
        item_name: 'Brake Pads',
        unit: 'pairs',
      }
    }),
    prisma.item.create({
      data: {
        item_name: 'Engine Oil',
        unit: 'liters',
      }
    }),
    prisma.item.create({
      data: {
        item_name: 'Air Filter',
        unit: 'piece',
      }
    })
  ])

  // Create a receipt with items
  const receipt1 = await prisma.receipt.create({
    data: {
      supplier: 'Auto Parts Supply',
      receipt_date: new Date('2024-03-15'),
      vat_reg_tin: '123-456-789',
      terms: 'Cash',
      status: 'Paid',
      total_amount: 15000,
      vat_amount: 1800,
      total_amount_due: 16800,
      created_by: 'system',
      items: {
        create: [
          {
            item_name: items[0].item_name,
            unit: items[0].unit,
            quantity: 2,
            unit_price: 5000,
            total_price: 10000,
            created_by: 'system'
          },
          {
            item_name: items[1].item_name,
            unit: items[1].unit,
            quantity: 5,
            unit_price: 1000,
            total_price: 5000,
            created_by: 'system'
          }
        ]
      }
    }
  })

  // Create item transactions for the receipt
  await Promise.all([
    prisma.itemTransaction.create({
      data: {
        item_id: items[0].item_id,
        receipt_id: receipt1.receipt_id,
        quantity: 2,
        unit_price: 5000,
        created_by: 'system',
        transaction_date: receipt1.receipt_date
      }
    }),
    prisma.itemTransaction.create({
      data: {
        item_id: items[1].item_id,
        receipt_id: receipt1.receipt_id,
        quantity: 5,
        unit_price: 1000,
        created_by: 'system',
        transaction_date: receipt1.receipt_date
      }
    })
  ])

  // Create an expense record linked to the receipt
  await prisma.expenseRecord.create({
    data: {
      expense_id: 'EXP001',
      category: ExpenseCategory.Vehicle_Parts,
      department_from: Department.Operations,
      total_amount: receipt1.total_amount,
      date: receipt1.receipt_date,
      receipt_id: receipt1.receipt_id,
      recorded_by: 'system',
    }
  })

  // Create an expense record without receipt (e.g., fuel expense)
  await prisma.expenseRecord.create({
    data: {
      expense_id: 'EXP002',
      category: ExpenseCategory.Fuel,
      department_from: Department.Operations,
      total_amount: 5000,
      date: new Date('2024-03-16'),
      recorded_by: 'system',
    }
  })

  console.log('Seed data created successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 