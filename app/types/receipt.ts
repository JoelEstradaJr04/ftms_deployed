export type ReceiptItem = {
  receipt_item_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  ocr_confidence?: number;
  item: {
    item_id: string;
    item_name: string;
    unit: string;
    category: string;
    other_unit?: string;
    other_category?: string;
  };
};

export type Receipt = {
  receipt_id: string;
  supplier: string;
  transaction_date: string;
  vat_reg_tin?: string;
  terms?: string;
  date_paid?: string;
  payment_status: 'Paid' | 'Pending' | 'Cancelled' | 'Dued';
  total_amount: number;
  vat_amount?: number;
  total_amount_due: number;
  created_at: string;
  updated_at?: string;
  created_by: string;
  updated_by?: string;
  source: 'Manual_Entry' | 'OCR_Camera' | 'OCR_File';
  category: string;
  other_category?: string;
  remarks?: string;
  ocr_confidence?: number;
  ocr_file_path?: string;
  is_inventory_processed?: boolean;
  items: ReceiptItem[];
};