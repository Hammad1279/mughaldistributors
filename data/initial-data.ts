import { AppData, MedicineDefinition, UserMedicineData } from '../types';
import { INITIAL_MEDICINES_DATA } from '../constants';

// This file provides a clean, initial state for the application, generated
// statically from the constants file. This prevents build errors from
// corrupted data snapshots and ensures a reliable starting point for new users.

const generatedData: { defs: MedicineDefinition[], userData: Record<string, UserMedicineData> } = (() => {
    const defs: MedicineDefinition[] = [];
    const userData: Record<string, UserMedicineData> = {};

    INITIAL_MEDICINES_DATA.forEach((med, index) => {
        // Create a pseudo-random but deterministic ID based on index and name to ensure stability.
        const id = `med-${index}-${med.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
        
        defs.push({
            id,
            name: med.name,
            company: med.company,
            type: med.type,
            tags: med.name.toLowerCase().split(/\s+/).filter(Boolean).map(tag => tag.replace(/[()]/g, '')),
        });
        
        userData[id] = {
            price: null,
            discount: med.discount,
            saleDiscount: med.saleDiscount,
            batchNo: '',
            lastUpdated: new Date(0).toISOString(),
        };
    });

    return { defs, userData };
})();

export const initialAppData: AppData = {
    version: '1.0.0',
    global_medicine_definitions: generatedData.defs,
    user_medicine_data: generatedData.userData,
    medicalStores: [],
    finalizedBills: [],
    suppliers: [],
    finalizedPurchases: [],
    billLayoutSettings: {
        distributorName: 'Mughal Distributors',
        distributorTitle: 'ESTIMATE',
        distributorAddressLine1: 'Bismillah Plaza, Opp. Sonari Bank',
        distributorAddressLine2: 'Chinioat Bazar, Faisalabad',
        footerText: '',
        showPhoneNumber: true,
        showBillDate: true,
        phoneNumber: '03040297400'
    },
    salesSettings: { showSalesTaxColumn: false, showBatchNo: false },
    cart: [],
    purchaseCart: {},
    purchaseCartOrder: [],
    currentBillingStoreID: null,
    currentPurchaseSupplierID: null,
    currentViewingSupplierId: null,
    editingBillNo: null,
    editingPurchaseId: null,
    billFilterStoreID: null,
};
