export interface Receipt {
  receipt_id: string;
  supplier: string;
  transaction_date: string;
  vat_reg_tin?: string;
  terms?: {
    id: string;
    name: string;
  };
  date_paid?: string;
  payment_status: {
    id: string;
    name: string;
  };
  total_amount: number;
  vat_amount?: number;
  total_amount_due: number;
  category: {
    category_id: string;
    name: string;
  };
  remarks?: string;
  ocr_confidence?: number;
  ocr_file_path?: string;
  is_expense_recorded: boolean;
  items: ReceiptItem[];
  source?: {
    source_id: string;
    name: string;
  };
  created_by: string;
  created_at: string;
  updated_at?: string;
  updated_by?: string;
  is_deleted: boolean;
}

export interface ReceiptItem {
  receipt_item_id: string;
  receipt_id: string;
  item_id: string;
  item: {
    item_id: string;
    item_name: string;
    unit: {
      id: string;
      name: string;
    };
    category: {
      category_id: string;
      name: string;
    };
    other_unit?: string;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  updated_at?: string;
  created_by: string;
  updated_by?: string;
  is_deleted: boolean;
  ocr_confidence?: number;
  is_inventory_processed?: boolean;
  // Flattened properties for backward compatibility
  item_name?: string;
  unit?: string;
}