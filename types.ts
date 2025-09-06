

import React from 'react';

// --- NEW DATA STRUCTURE ---
// Shared data across all users
export interface MedicineDefinition {
  id: string;
  name: string;
  company: string;
  type: string;
  tags: string[];
}

// Data specific to a user for a given medicine
export interface UserMedicineData {
  price: number | null;
  discount: number | null; // Purchase discount
  saleDiscount: number | null;
  batchNo: string;
  lastUpdated: string;
}
// --- END NEW DATA STRUCTURE ---

export interface Medicine {
  id: string;
  name: string;
  company: string;
  price: number | null;
  discount: number | null; // This is now the PURCHASE discount
  saleDiscount: number | null; // This is the new SALE discount
  batchNo: string;
  lastUpdated: string;
  tags: string[];
  type: string;
}

export interface MedicalStore {
  id: string;
  name: string;
  address: string;
}

export interface CartItem extends Medicine {
  quantity: number;
  discountValue: number | null; // The discount % applied to this item in the cart
  purchaseDiscount: number | null;
  mrp: number; // The price at the time of adding to cart
  calculatedDiscountAmount: number;
  netAmount: number;
  salesTaxAmount?: number | null;
}

export interface FinalizedBill {
  billNo: number;
  storeId: string;
  storeName: string;
  storeAddress: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  grandTotal: number;
}

export interface Supplier {
  id:string;
  name: string;
  address: string;
  contactPerson?: string;
  phone?: string;
}

export interface PurchaseItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  rate: number;
  discount: number;
  batchNo: string;
  netAmount: number;
}

export interface FinalizedPurchase {
  purchaseId: number;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  grandTotal: number;
}

export interface PurchaseRowData {
    srch: string;
    quantity: number;
    rate: number;
    discount: number;
    batchNo: string;
}

export interface DiscountEntry {
    id: string;
    company: string;
    itemName: string;
    discount: string;
}

export type AppSection = 'welcome' | 'sales' | 'purchase' | 'reports' | 'sales-only';
export type AppView = 'welcome' | 'manage-stores' | 'create-bill' | 'your-bills' | 'inventory' | 'settings' | 'manage-suppliers' | 'purchase-entry' | 'purchase-history' | 'your-purchases' | 'discount-sheet' | 'profit-report';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationState {
  id: number;
  message: string;
  type: NotificationType;
  isExiting?: boolean;
}

export interface BillLayoutSettings {
  showPhoneNumber: boolean;
  showBillDate: boolean;
  phoneNumber: string;
}

export interface SalesSettings {
  showSalesTaxColumn: boolean;
  showBatchNo: boolean;
}

// --- Spreadsheet Specific Types ---
export interface CellStyle {
  fontWeight?: string | number;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: string;
  verticalAlign?: string | number;
  backgroundColor?: string;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  whiteSpace?: string;
  textIndent?: string;
}

export interface CellData {
  value: string | number; // The calculated/displayed value
  formula: string; // The raw input, e.g., "10" or "=A1+B1"
  error?: string | null; // Optional error message for this cell
  style?: CellStyle;
  numberFormat?: string;
}

export type GridData = CellData[][];

export interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'pie';
  dataRange: string;
  labelRange: string;
  position: { top: number; left: number };
  size: { width: number; height: number };
}