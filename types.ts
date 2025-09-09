

import React from 'react';

// --- USER AUTHENTICATION ---
export interface User {
  id: string;
  username: string;
  password: string; // This will be stored base64 encoded, not plaintext.
}

// --- LOCAL STORAGE DATA STRUCTURE (PER-USER) ---
export interface AppData {
  version: string;
  global_medicine_definitions: MedicineDefinition[];
  user_medicine_data: Record<string, UserMedicineData>;
  medicalStores: MedicalStore[];
  finalizedBills: FinalizedBill[];
  suppliers: Supplier[];
  finalizedPurchases: FinalizedPurchase[];
  billLayoutSettings: BillLayoutSettings;
  salesSettings: SalesSettings;
  // --- Persisted client state ---
  cart: CartItem[];
  purchaseCart: Record<string, PurchaseRowData>;
  purchaseCartOrder: string[];
  currentBillingStoreID: string | null;
  currentPurchaseSupplierID: string | null;
  currentViewingSupplierId: string | null;
  editingBillNo: number | null;
  editingPurchaseId: number | null;
  billFilterStoreID: string | null;
}
// --- END LOCAL STORAGE DATA STRUCTURE ---


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
  distributorName: string;
  distributorTitle: string;
  distributorAddressLine1: string;
  distributorAddressLine2: string;
  footerText?: string;
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


// --- APP CONTEXT ---
export interface AppContextType {
    // Data collections (from app state)
    medicines: Medicine[];
    medicalStores: MedicalStore[];
    finalizedBills: FinalizedBill[];
    suppliers: Supplier[];
    finalizedPurchases: FinalizedPurchase[];
    billLayoutSettings: BillLayoutSettings;
    salesSettings: SalesSettings;

    // Data modification functions
    updateAppData: (updater: (currentData: AppData) => AppData) => void;
    
    // Client-side state
    cart: CartItem[]; setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
    purchaseCart: Record<string, PurchaseRowData>; setPurchaseCart: React.Dispatch<React.SetStateAction<Record<string, PurchaseRowData>>>;
    purchaseCartOrder: string[]; setPurchaseCartOrder: React.Dispatch<React.SetStateAction<string[]>>;
    currentBillingStoreID: string | null; setCurrentBillingStoreID: React.Dispatch<React.SetStateAction<string | null>>;
    currentPurchaseSupplierID: string | null; setCurrentPurchaseSupplierID: React.Dispatch<React.SetStateAction<string | null>>;
    currentViewingSupplierId: string | null; setCurrentViewingSupplierId: React.Dispatch<React.SetStateAction<string | null>>;
    editingBillNo: number | null; setEditingBillNo: React.Dispatch<React.SetStateAction<number | null>>;
    editingPurchaseId: number | null; setEditingPurchaseId: React.Dispatch<React.SetStateAction<number | null>>;
    billFilterStoreID: string | null;
    
    // UI
    addNotification: (message: string, type?: NotificationType) => void;
    activeView: AppView;
    setActiveView: React.Dispatch<React.SetStateAction<AppView>>;
    activeSection: AppSection;
    setActiveSection: React.Dispatch<React.SetStateAction<AppSection>>;
    navigateToSection: (section: AppSection, element?: HTMLElement) => void;
    
    // Business Logic Helpers
    startBillingForStore: (storeId: string) => void;
    startPurchaseForSupplier: (supplierId: string) => void;
    startEditingPurchase: (purchase: FinalizedPurchase) => void;
    viewPurchaseHistoryForSupplier: (supplierId: string) => void;
    viewBillsForStore: (storeId: string) => void;
    clearBillFilter: () => void;
    resetBillingSession: () => void;
    resetPurchaseSession: () => void;
    
    // Transition state
    transitionElement: HTMLElement | null;
    
    // Hover/Focus state
    focusedMed: Medicine | null;
    setFocusedMed: React.Dispatch<React.SetStateAction<Medicine | null>>;
    hoveredMed: Medicine | null;
    setHoveredMed: React.Dispatch<React.SetStateAction<Medicine | null>>;

    // Calculator state
    isCalculatorOpen: boolean;
    setIsCalculatorOpen: React.Dispatch<React.SetStateAction<boolean>>;

    // Data manipulation functions
    addMedicalStore: (store: Omit<MedicalStore, 'id'>) => void;
    updateMedicalStore: (store: MedicalStore) => void;
    deleteMedicalStore: (storeId: string) => void;
    addMedicine: (med: Omit<Medicine, 'id' | 'lastUpdated'>) => string;
    updateMedicine: (med: Medicine) => void;
    deleteMedicine: (medId: string) => void;
    finalizeBill: (billData: Omit<FinalizedBill, 'billNo' | 'date'>, isEditing: boolean, billNo: number) => number | null;
    deleteFinalizedBill: (billNo: number) => void;
    addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
    updateSupplier: (supplier: Supplier) => void;
    deleteSupplier: (supplierId: string) => void;
    postPurchase: (purchaseData: Omit<FinalizedPurchase, 'purchaseId' | 'date'>, editingId: number | null) => void;
    deleteFinalizedPurchase: (purchaseId: number) => void;
    updateBillLayoutSettings: (newSettings: Partial<BillLayoutSettings>) => void;
    
    // Data and auth
    downloadBackup: () => void;
    importData: (jsonData: string) => void;
    initiateImport: (file: File) => void;
    clearAllData: (clearSharedData?: boolean) => void;
    logout: () => void;
}