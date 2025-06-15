import { PrismaClient, ReceiptStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clean up existing data
  await prisma.itemTransaction.deleteMany()
  await prisma.receiptItem.deleteMany()
  await prisma.receipt.deleteMany()
  await prisma.item.deleteMany()
  await prisma.expenseRecord.deleteMany()
  await prisma.auditLog.deleteMany()

  // Create receipts
  const receipts = [
    {
      receipt_id: 'FTMS-RCP-00000001',
      supplier: 'HH ALL VENTURES ENTERPRISES CORP.',
      transaction_date: new Date('2025-04-05'),
      vat_reg_tin: '423-666-644-000',
      terms: 'Net 60 Days',
      status: 'Paid' as ReceiptStatus,
      total_amount: 120535.71,
      vat_amount: 14464.29,
      total_amount_due: 135000.00,
      created_by: 'system'
    },
    {
      receipt_id: 'FTMS-RCP-00000002',
      supplier: 'Philippine Bearing Corporation',
      transaction_date: new Date('2025-04-22'),
      vat_reg_tin: '202-336-644-0000',
      terms: 'Net 30 Days',
      status: 'Paid' as ReceiptStatus,
      total_amount: 5000.00,
      vat_amount: 535.71,
      total_amount_due: 5000.00,
      created_by: 'system'
    },
    {
      receipt_id: 'FTMS-RCP-00000003',
      supplier: 'AIR J GAS SUPPLY',
      transaction_date: new Date('2025-04-23'),
      vat_reg_tin: '249-558-705-000',
      status: 'Paid' as ReceiptStatus,
      total_amount: 400,
      vat_amount: 0,
      total_amount_due: 400,
      created_by: 'system'
    },
    {
      receipt_id: 'FTMS-RCP-00000004',
      supplier: 'AIR J GAS SUPPLY',
      transaction_date: new Date('2025-04-22'),
      vat_reg_tin: '249-558-705-000',
      status: 'Paid' as ReceiptStatus,
      total_amount: 800,
      vat_amount: 0,
      total_amount_due: 800,
      created_by: 'system'
    },
    {
      receipt_id: 'FTMS-RCP-00000005',
      supplier: 'AIR J GAS SUPPLY',
      transaction_date: new Date('2025-03-10'),
      vat_reg_tin: '249-558-705-000',
      status: 'Paid' as ReceiptStatus,
      total_amount: 3200.00,
      vat_amount: 0,
      total_amount_due: 3200.00,
      created_by: 'system'
    },
    {
      receipt_id: 'FTMS-RCP-00000006',
      supplier: 'JP GLOBAL VENTURES CORPORATION',
      transaction_date: new Date('2025-02-22'),
      vat_reg_tin: '004-008-932-00014',
      terms: 'Net 30 Days',
      date_paid: new Date('2025-03-11'),
      status: 'Paid' as ReceiptStatus,
      total_amount: 502000.00,
      vat_amount: 0,
      total_amount_due: 502000.00,
      created_by: 'system'
    },
    {
      receipt_id: 'FTMS-RCP-00000007',
      supplier: 'EDS AGUILA AUTO GLASS AND ALUMINUM WORKS',
      transaction_date: new Date('2025-02-09'),
      status: 'Paid' as ReceiptStatus,
      total_amount: 4890.00,
      vat_amount: 0,
      total_amount_due: 4890.00,
      created_by: 'system'
    },
    {
      receipt_id: 'FTMS-RCP-00000008',
      supplier: 'ROBLES PAINT CENTER & GENERAL MERCHANDISE',
      transaction_date: new Date('2025-04-07'),
      status: 'Pending' as ReceiptStatus,
      total_amount: 18905.00,
      vat_amount: 0,
      total_amount_due: 18905.00,
      created_by: 'system'
    },
    {
      receipt_id: 'FTMS-RCP-00000009',
      supplier: 'COLUMBIAN MOTORS CORPORATION',
      transaction_date: new Date('2025-02-01'),
      vat_reg_tin: '000-306-170-00000',
      status: 'Paid' as ReceiptStatus,
      total_amount: 12410.71,
      vat_amount: 1489.29,
      total_amount_due: 13900.00,
      created_by: 'system'
    },
    {
      receipt_id: 'FTMS-RCP-00000010',
      supplier: 'COLUMBIAN MOTORS CORPORATION',
      transaction_date: new Date('2025-02-16'),
      vat_reg_tin: '000-306-170-00000',
      status: 'Paid' as ReceiptStatus,
      total_amount: 7560.00,
      vat_amount: 810,
      total_amount_due: 7560.00,
      created_by: 'system'
    },
    {
      receipt_id: 'FTMS-RCP-00000011',
      supplier: 'COLUMBIAN MOTORS CORPORATION',
      transaction_date: new Date('2025-02-28'),
      vat_reg_tin: '000-306-170-00000',
      status: 'Paid' as ReceiptStatus,
      total_amount: 68700.00,
      vat_amount: 7432.14,
      total_amount_due: 68700.00,
      created_by: 'system'
    }
  ]

  // Create receipt items
  const receiptItems = [
    {
      receipt_item_id: 'FTMS-RCI-00000001',
      receipt_id: 'FTMS-RCP-00000001',
      item_name: 'Tire (11 R22.5 16PR GSR225 RIB GITI)',
      unit: 'PC(S)',
      quantity: 10,
      unit_price: 12053.57,
      total_price: 120535.71,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000002',
      receipt_id: 'FTMS-RCP-00000002',
      item_name: 'KOYO Bearing',
      unit: 'PC(S)',
      quantity: 2,
      unit_price: 2500.00,
      total_price: 5000.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000003',
      receipt_id: 'FTMS-RCP-00000003',
      item_name: 'OXYGEN FULL w/ M.T',
      unit: 'CYL',
      quantity: 1,
      unit_price: 400,
      total_price: 400,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000004',
      receipt_id: 'FTMS-RCP-00000004',
      item_name: 'OXYGEN FULL w/ M.T',
      unit: 'CYL',
      quantity: 2,
      unit_price: 400,
      total_price: 800,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000005',
      receipt_id: 'FTMS-RCP-00000005',
      item_name: 'ACETYLENE FULL w/ M.T',
      unit: 'CYL',
      quantity: 2,
      unit_price: 1600.00,
      total_price: 3200.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000006',
      receipt_id: 'FTMS-RCP-00000006',
      item_name: 'Diesel',
      unit: 'L',
      quantity: 10000,
      unit_price: 50.2,
      total_price: 502000.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000007',
      receipt_id: 'FTMS-RCP-00000007',
      item_name: 'Passenger Window Glass',
      unit: 'PC(S)',
      quantity: 3,
      unit_price: 600,
      total_price: 1800.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000008',
      receipt_id: 'FTMS-RCP-00000007',
      item_name: 'Sealant Sausage',
      unit: 'PC(S)',
      quantity: 6,
      unit_price: 500,
      total_price: 3000.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000009',
      receipt_id: 'FTMS-RCP-00000007',
      item_name: 'Masking Tape',
      unit: 'PC(S)',
      quantity: 2,
      unit_price: 45,
      total_price: 90,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000010',
      receipt_id: 'FTMS-RCP-00000008',
      item_name: 'ANZ 888 Red Paint',
      unit: 'GAL',
      quantity: 2.5,
      unit_price: 4200.00,
      total_price: 10500.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000011',
      receipt_id: 'FTMS-RCP-00000008',
      item_name: 'ANZ Yellow Paint',
      unit: 'GAL',
      quantity: 1,
      unit_price: 3800.00,
      total_price: 3800.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000012',
      receipt_id: 'FTMS-RCP-00000008',
      item_name: 'ANZ Green Paint',
      unit: 'GAL',
      quantity: 0.5,
      unit_price: 1900.00,
      total_price: 1900.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000013',
      receipt_id: 'FTMS-RCP-00000008',
      item_name: 'Top Coat ORT',
      unit: 'PC(S)',
      quantity: 8,
      unit_price: 260,
      total_price: 2080.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000014',
      receipt_id: 'FTMS-RCP-00000008',
      item_name: 'Masking Tape #3/4',
      unit: 'PC(S)',
      quantity: 25,
      unit_price: 25,
      total_price: 625,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000015',
      receipt_id: 'FTMS-RCP-00000009',
      item_name: 'Brake Pad Set',
      unit: 'SET',
      quantity: 1,
      unit_price: 12410.71,
      total_price: 12410.71,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000016',
      receipt_id: 'FTMS-RCP-00000010',
      item_name: 'Hub Bolt F/LH',
      unit: 'PC(S)',
      quantity: 8,
      unit_price: 120,
      total_price: 960,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000017',
      receipt_id: 'FTMS-RCP-00000010',
      item_name: 'Hub Bolt F/RH',
      unit: 'PC(S)',
      quantity: 12,
      unit_price: 120,
      total_price: 1440.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000018',
      receipt_id: 'FTMS-RCP-00000010',
      item_name: 'Hub Bolt LH',
      unit: 'PC(S)',
      quantity: 7,
      unit_price: 120,
      total_price: 840,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000019',
      receipt_id: 'FTMS-RCP-00000010',
      item_name: 'Hub Bolt R/LH',
      unit: 'PC(S)',
      quantity: 9,
      unit_price: 120,
      total_price: 1080.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000020',
      receipt_id: 'FTMS-RCP-00000010',
      item_name: 'Hub Bolt R/RH',
      unit: 'PC(S)',
      quantity: 11,
      unit_price: 120,
      total_price: 1320.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000021',
      receipt_id: 'FTMS-RCP-00000010',
      item_name: 'Hub Bolt RH',
      unit: 'PC(S)',
      quantity: 5,
      unit_price: 120,
      total_price: 600,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000022',
      receipt_id: 'FTMS-RCP-00000010',
      item_name: 'Hub Bolt M/LH',
      unit: 'PC(S)',
      quantity: 4,
      unit_price: 120,
      total_price: 480,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000023',
      receipt_id: 'FTMS-RCP-00000010',
      item_name: 'Hub Bolt M/RH',
      unit: 'PC(S)',
      quantity: 7,
      unit_price: 120,
      total_price: 840,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000024',
      receipt_id: 'FTMS-RCP-00000011',
      item_name: 'Fuel Filter Iveco',
      unit: 'PC(S)',
      quantity: 23,
      unit_price: 350,
      total_price: 8050.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000025',
      receipt_id: 'FTMS-RCP-00000011',
      item_name: 'Fuel Filter Nissan Diesel',
      unit: 'PC(S)',
      quantity: 17,
      unit_price: 380,
      total_price: 6460.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000026',
      receipt_id: 'FTMS-RCP-00000011',
      item_name: 'Oil Filter Iveco',
      unit: 'PC(S)',
      quantity: 19,
      unit_price: 280,
      total_price: 5320.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000027',
      receipt_id: 'FTMS-RCP-00000011',
      item_name: 'Oil Filter Nissan Diesel',
      unit: 'PC(S)',
      quantity: 12,
      unit_price: 300,
      total_price: 3600.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000028',
      receipt_id: 'FTMS-RCP-00000011',
      item_name: 'Oil Filter Doosan',
      unit: 'PC(S)',
      quantity: 11,
      unit_price: 320,
      total_price: 3520.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000029',
      receipt_id: 'FTMS-RCP-00000011',
      item_name: 'Lining',
      unit: 'PC(S)',
      quantity: 32,
      unit_price: 150,
      total_price: 4800.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000030',
      receipt_id: 'FTMS-RCP-00000011',
      item_name: 'AdBlue Diesel Exhaust Fluid',
      unit: 'GAL',
      quantity: 20,
      unit_price: 250,
      total_price: 5000.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000031',
      receipt_id: 'FTMS-RCP-00000011',
      item_name: 'Clutch Disc',
      unit: 'PC(S)',
      quantity: 12,
      unit_price: 1200.00,
      total_price: 14400.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000032',
      receipt_id: 'FTMS-RCP-00000011',
      item_name: 'Air Dryer Cartridge',
      unit: 'PC(S)',
      quantity: 23,
      unit_price: 450,
      total_price: 10350.00,
      created_by: 'system'
    },
    {
      receipt_item_id: 'FTMS-RCI-00000033',
      receipt_id: 'FTMS-RCP-00000011',
      item_name: 'Hose, Rubber',
      unit: 'PACK',
      quantity: 12,
      unit_price: 600,
      total_price: 7200.00,
      created_by: 'system'
    }
  ]

  // Create receipts first
  for (const receipt of receipts) {
    await prisma.receipt.create({
      data: receipt
    })
  }

  // Create receipt items
  for (const item of receiptItems) {
    await prisma.receiptItem.create({
      data: item
    })
  }

  // Create master items from receipt items
  const uniqueItems = new Set(receiptItems.map(item => JSON.stringify({ 
    item_name: item.item_name, 
    unit: item.unit 
  })))

  for (const itemStr of uniqueItems) {
    const { item_name, unit } = JSON.parse(itemStr)
    await prisma.item.create({
      data: {
        item_id: `FTMS-ITM-${String(Array.from(uniqueItems).indexOf(itemStr) + 1).padStart(8, '0')}`,
        item_name,
        unit,
        created_at: new Date(),
      }
    })
  }

  // Create item transactions
  for (const receiptItem of receiptItems) {
    const item = await prisma.item.findFirst({
      where: { item_name: receiptItem.item_name }
    })

    if (item) {
      await prisma.itemTransaction.create({
        data: {
          transaction_id: `FTMS-TXN-${String(receiptItems.indexOf(receiptItem) + 1).padStart(8, '0')}`,
          item_id: item.item_id,
          receipt_id: receiptItem.receipt_id,
          quantity: receiptItem.quantity,
          unit_price: receiptItem.unit_price,
          transaction_date: receipts.find(r => r.receipt_id === receiptItem.receipt_id)?.transaction_date || new Date(),
          created_by: 'system'
        }
      })
    }
  }

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