
import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode, useMemo, useRef, useLayoutEffect } from 'react';
import { AppView, Medicine, MedicalStore, FinalizedBill, CartItem, NotificationState, NotificationType, Supplier, FinalizedPurchase, AppSection, PurchaseRowData, BillLayoutSettings, SalesSettings, MedicineDefinition, UserMedicineData } from './types';
import { INITIAL_MEDICINES_DATA } from './constants';
import ManageStores from './components/ManageStores';
import Inventory from './components/Inventory';
import CreateBill from './components/CreateBill';
import YourBills from './components/YourBills';
import Settings from './components/Settings';
import ManageSuppliers from './components/ManageSuppliers';
import Purchase from './components/Purchase';
import { Icon, Modal, Button, ToggleSwitch, Input } from './components/ui';
import PurchaseHistory from './components/PurchaseHistory';
import YourPurchases from './components/YourPurchases';
import DiscountSheet from './components/DiscountSheet';
import Welcome from './components/Welcome';
import ProfitReport from './components/ProfitReport';
import Calculator from './components/Calculator';
import { CapsLockModal } from './components/CapsLockModal';
import Auth from './components/Auth';


declare var Fuse: any;

// --- LOCAL STORAGE HOOK ---
// Modified to accept an optional userPrefix to namespace data per user.
function useLocalStorage<T>(key: string, initialValue: T | (() => T), userPrefix?: string) {
    const prefixedKey = userPrefix ? `${userPrefix}_${key}` : key;

    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(prefixedKey);
            return item ? JSON.parse(item) : (typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue);
        } catch (error) {
            console.error(`Error reading localStorage key “${prefixedKey}”:`, error);
            return (typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue);
        }
    });

    useEffect(() => {
        try {
            // Do not persist initial value if it's the same, to avoid cluttering local storage for new users
            const item = window.localStorage.getItem(prefixedKey);
            const currentValueStr = JSON.stringify(storedValue);
            
            // Only write to localStorage if the value is different or if it's a new key
            if (item !== currentValueStr) {
                window.localStorage.setItem(prefixedKey, currentValueStr);
            }
        } catch (error) {
            console.error(`Error setting localStorage key “${prefixedKey}”:`, error);
        }
    }, [prefixedKey, storedValue]);

    return [storedValue, setStoredValue] as const;
}


// --- APP CONTEXT ---
interface AppContextType {
    // Data collections (from local storage)
    medicines: Medicine[];
    medicalStores: MedicalStore[];
    finalizedBills: FinalizedBill[];
    suppliers: Supplier[];
    finalizedPurchases: FinalizedPurchase[];
    billLayoutSettings: BillLayoutSettings;
    salesSettings: SalesSettings;

    // CRUD Operations
    addMedicine: (med: Omit<Medicine, 'id' | 'lastUpdated'>) => Promise<string>;
    updateMedicine: (med: Medicine) => Promise<void>;
    deleteMedicine: (id: string) => Promise<void>;

    addMedicalStore: (store: Omit<MedicalStore, 'id'>) => Promise<void>;
    updateMedicalStore: (store: MedicalStore) => Promise<void>;
    deleteMedicalStore: (id: string) => Promise<void>;
    
    addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
    updateSupplier: (supplier: Supplier) => Promise<void>;
    deleteSupplier: (supplier: Supplier) => Promise<void>;
    
    finalizeBill: (billData: Omit<FinalizedBill, 'billNo' | 'date'>, isEditing: boolean, billNoToUse: number) => Promise<number | undefined>;
    deleteFinalizedBill: (billNo: number) => Promise<void>;
    
    postPurchase: (purchaseData: Omit<FinalizedPurchase, 'purchaseId' | 'date'>, editingPurchaseId?: number | null) => Promise<void>;
    deleteFinalizedPurchase: (purchaseId: number) => Promise<void>;

    updateBillLayoutSettings: (newSettings: Partial<BillLayoutSettings>) => void;
    updateSalesSettings: (newSettings: Partial<SalesSettings>) => void;

    // Data Management
    importData: (data: any) => void;
    clearAllData: (includeShared?: boolean) => void;
    exportData: () => {
        medicineDefinitions: MedicineDefinition[];
        userMedicineData: Record<string, UserMedicineData>;
        medicalStores: MedicalStore[];
        suppliers: Supplier[];
        finalizedBills: FinalizedBill[];
        finalizedPurchases: FinalizedPurchase[];
        billLayoutSettings: BillLayoutSettings;
        salesSettings: SalesSettings;
    };


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
    startBillingForStore: (storeId: string) => void;
    startPurchaseForSupplier: (supplierId: string) => void;
    startEditingPurchase: (purchase: FinalizedPurchase) => void;
    viewPurchaseHistoryForSupplier: (supplierId: string) => void;
    viewBillsForStore: (storeId: string) => void;
    clearBillFilter: () => void;
    resetBillingSession: () => void;
    resetPurchaseSession: () => void;
    // Track transition state
    transitionElement: HTMLElement | null;
    
    // UI - Hover/Focus state for bill item discount
    focusedMed: Medicine | null;
    setFocusedMed: React.Dispatch<React.SetStateAction<Medicine | null>>;
    hoveredMed: Medicine | null;
    setHoveredMed: React.Dispatch<React.SetStateAction<Medicine | null>>;

    // Calculator state
    isCalculatorOpen: boolean;
    setIsCalculatorOpen: React.Dispatch<React.SetStateAction<boolean>>;
}
const AppContext = createContext<AppContextType | null>(null);
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppContext must be used within an AppProvider");
    return context;
};

// --- MODAL FOR RESUMING BILL ---
const ResumeBillModal: React.FC<{
    isOpen: boolean;
    onContinue: () => void;
    onStartNew: () => void;
    onClose: () => void;
}> = ({ isOpen, onContinue, onStartNew, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Unfinished Bill">
            <div className="text-center p-4">
                <Icon name="help" className="text-5xl text-violet-400 mb-4" />
                <p className="text-slate-300 mb-2 text-lg">You have a bill in progress.</p>
                <p className="text-slate-400 mb-8">
                    Would you like to continue where you left off or start a new one?
                </p>
                <div className="flex justify-center gap-4">
                    <Button onClick={onStartNew} variant="secondary" icon="post_add">
                        Start New Bill
                    </Button>
                    <Button onClick={onContinue} variant="primary" icon="login" autoFocus>
                        Continue Editing
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// --- MODAL FOR RESUMING PURCHASE ---
const ResumePurchaseModal: React.FC<{
    isOpen: boolean;
    onContinue: () => void;
    onStartNew: () => void;
    onClose: () => void;
}> = ({ isOpen, onContinue, onStartNew, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Unfinished Purchase">
            <div className="text-center p-4">
                <Icon name="help" className="text-5xl text-violet-400 mb-4" />
                <p className="text-slate-300 mb-2 text-lg">You have a purchase in progress.</p>
                <p className="text-slate-400 mb-8">
                    Would you like to continue where you left off or start a new one?
                </p>
                <div className="flex justify-center gap-4">
                    <Button onClick={onStartNew} variant="secondary" icon="post_add">
                        Start New Purchase
                    </Button>
                    <Button onClick={onContinue} variant="primary" icon="login" autoFocus>
                        Continue Editing
                    </Button>
                </div>
            </div>
        </Modal>
    );
};


// --- APP PROVIDER ---
const AppProvider: React.FC<{ 
    children: ReactNode; 
    currentUser: string; 
    onLogout: () => void; 
    isAnimatingIn: boolean; 
    addNotification: (message: string, type?: NotificationType) => void;
    activeView: AppView;
    setActiveView: React.Dispatch<React.SetStateAction<AppView>>;
    activeSection: AppSection;
    setActiveSection: React.Dispatch<React.SetStateAction<AppSection>>;
    navigateToSection: (section: AppSection, element?: HTMLElement) => void;
    transitionElement: HTMLElement | null; 
    transitionTargetView: AppView | null;
    handleTransitionEnd: () => void;
    renderViewComponent: (view: AppView) => React.ReactNode;
}> = ({ children, currentUser, onLogout, isAnimatingIn, addNotification, activeView, setActiveView, activeSection, setActiveSection, navigateToSection, transitionElement, transitionTargetView, handleTransitionEnd, renderViewComponent }) => {
    // --- Data from Local Storage ---
    // NEW: Shared global medicine definitions (no user prefix)
    const [globalMedicines, setGlobalMedicines] = useLocalStorage<MedicineDefinition[]>('global_medicine_definitions', [], undefined);
    // NEW: User-specific medicine data
    const [userMedicineData, setUserMedicineData] = useLocalStorage<Record<string, UserMedicineData>>('user_medicine_data', {}, currentUser);

    const [medicalStores, setMedicalStores] = useLocalStorage<MedicalStore[]>('medicalStores', [], currentUser);
    const [finalizedBills, setFinalizedBills] = useLocalStorage<FinalizedBill[]>('finalizedBills', [], currentUser);
    const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('suppliers', [], currentUser);
    const [finalizedPurchases, setFinalizedPurchases] = useLocalStorage<FinalizedPurchase[]>('finalizedPurchases', [], currentUser);
    
    // --- Client-side State (Persisted) ---
    const [cart, setCart] = useLocalStorage<CartItem[]>('cart', [], currentUser);
    const [purchaseCart, setPurchaseCart] = useLocalStorage<Record<string, PurchaseRowData>>('purchaseCart', {}, currentUser);
    const [purchaseCartOrder, setPurchaseCartOrder] = useLocalStorage<string[]>('purchaseCartOrder', [], currentUser);
    const [currentBillingStoreID, setCurrentBillingStoreID] = useLocalStorage<string | null>('currentBillingStoreID', null, currentUser);
    const [currentPurchaseSupplierID, setCurrentPurchaseSupplierID] = useLocalStorage<string | null>('currentPurchaseSupplierID', null, currentUser);
    const [currentViewingSupplierId, setCurrentViewingSupplierId] = useLocalStorage<string | null>('currentViewingSupplierId', null, currentUser);
    const [editingBillNo, setEditingBillNo] = useLocalStorage<number | null>('editingBillNo', null, currentUser);
    const [editingPurchaseId, setEditingPurchaseId] = useLocalStorage<number | null>('editingPurchaseId', null, currentUser);
    const [billFilterStoreID, setBillFilterStoreID] = useLocalStorage<string | null>('billFilterStoreID', null, currentUser);
    const [billLayoutSettings, setBillLayoutSettings] = useLocalStorage<BillLayoutSettings>('billLayoutSettings', {
        showPhoneNumber: true,
        showBillDate: true,
        phoneNumber: '03040297400',
    }, currentUser);
    const [salesSettings, setSalesSettings] = useLocalStorage<SalesSettings>('salesSettings', {
        showSalesTaxColumn: false,
        showBatchNo: true,
    }, currentUser);
    
    // --- Transient State (Not Persisted) ---
    const [isResumeBillModalOpen, setIsResumeBillModalOpen] = useState(false);
    const [isResumePurchaseModalOpen, setIsResumePurchaseModalOpen] = useState(false);
    const [focusedMed, setFocusedMed] = useState<Medicine | null>(null);
    const [hoveredMed, setHoveredMed] = useState<Medicine | null>(null);
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    
    // --- DATA MIGRATION from user-specific inventory to shared inventory ---
    useEffect(() => {
        const migrationKey = `${currentUser}_migration_v2_shared_inventory`;
        if (localStorage.getItem(migrationKey)) return;

        const oldUserMedicinesRaw = localStorage.getItem(`${currentUser}_medicines`);
        if (!oldUserMedicinesRaw) {
            localStorage.setItem(migrationKey, 'true');
            return;
        }

        console.log(`Running migration to shared inventory for user: ${currentUser}`);
        
        const oldUserMedicines: Medicine[] = JSON.parse(oldUserMedicinesRaw);
        
        setGlobalMedicines(currentGlobalDefs => {
            const newGlobalDefs = [...currentGlobalDefs];
            const globalDefMap = new Map(newGlobalDefs.map(d => [d.name.toLowerCase().trim(), d]));
            
            const newUserMedicineData: Record<string, UserMedicineData> = {};

            oldUserMedicines.forEach(oldMed => {
                const normalizedName = oldMed.name.toLowerCase().trim();
                let globalDef = globalDefMap.get(normalizedName);

                if (!globalDef) {
                    globalDef = {
                        id: crypto.randomUUID(),
                        name: oldMed.name,
                        company: oldMed.company,
                        type: oldMed.type,
                        tags: oldMed.tags,
                    };
                    newGlobalDefs.push(globalDef);
                    globalDefMap.set(normalizedName, globalDef);
                }

                newUserMedicineData[globalDef.id] = {
                    price: oldMed.price,
                    discount: oldMed.discount,
                    saleDiscount: oldMed.saleDiscount,
                    batchNo: oldMed.batchNo,
                    lastUpdated: oldMed.lastUpdated,
                };
            });

            setUserMedicineData(newUserMedicineData); 
            return newGlobalDefs;
        });

        localStorage.removeItem(`${currentUser}_medicines`);
        localStorage.setItem(migrationKey, 'true');
        addNotification('Inventory system updated successfully.', 'success');
    }, [currentUser, setGlobalMedicines, setUserMedicineData, addNotification]);


    // Seed initial data if global storage is empty
    useEffect(() => {
        const appInitializedKey = `global_appInitialized`; // Use a global key
        const appInitialized = localStorage.getItem(appInitializedKey);
        if (!appInitialized && globalMedicines.length === 0) {
            console.log("Seeding initial global medicine data...");
            const initialDefs: MedicineDefinition[] = [];
            const initialUserData: Record<string, UserMedicineData> = {};

            INITIAL_MEDICINES_DATA.forEach(med => {
                const id = crypto.randomUUID();
                initialDefs.push({
                    id,
                    name: med.name,
                    company: med.company,
                    type: med.type,
                    tags: med.name.toLowerCase().split(/\s+/).filter(Boolean),
                });
                initialUserData[id] = {
                    price: null,
                    discount: med.discount,
                    saleDiscount: med.saleDiscount,
                    batchNo: '',
                    lastUpdated: new Date().toISOString(),
                };
            });

            setGlobalMedicines(initialDefs);
            setUserMedicineData(initialUserData);

            if (medicalStores.length === 0) {
                setMedicalStores([{ id: crypto.randomUUID(), name: 'Demo Store', address: 'For testing and demonstration purposes' }]);
            }
            if (suppliers.length === 0) {
                setSuppliers([{ id: crypto.randomUUID(), name: 'Demo Supplier', address: 'Default vendor for purchases' }]);
            }
            localStorage.setItem(appInitializedKey, 'true');
        }
    }, [globalMedicines.length, medicalStores.length, suppliers.length, setGlobalMedicines, setUserMedicineData, setMedicalStores, setSuppliers]); 

    // NEW: Create the combined `medicines` array for the rest of the app to use
    const medicines = useMemo<Medicine[]>(() => {
        return globalMedicines.map(def => {
            const userData = userMedicineData[def.id];
            return {
                ...def,
                price: userData?.price ?? null,
                discount: userData?.discount ?? null,
                saleDiscount: userData?.saleDiscount ?? null,
                batchNo: userData?.batchNo ?? '',
                lastUpdated: userData?.lastUpdated ?? new Date(0).toISOString(),
            };
        });
    }, [globalMedicines, userMedicineData]);

    // --- CRUD Functions for Local Storage ---
    const addMedicine = useCallback(async (medData: Omit<Medicine, 'id' | 'lastUpdated'>): Promise<string> => {
        let definitionId: string;
        
        const existingDef = globalMedicines.find(def => def.name.trim().toLowerCase() === medData.name.trim().toLowerCase());

        if (existingDef) {
            definitionId = existingDef.id;
        } else {
            definitionId = crypto.randomUUID();
            const newDefinition: MedicineDefinition = {
                id: definitionId,
                name: medData.name,
                company: medData.company,
                type: medData.type,
                tags: medData.tags,
            };
            setGlobalMedicines(prev => [...prev, newDefinition]);
        }
        
        const newUserData: UserMedicineData = {
            price: medData.price,
            discount: medData.discount,
            saleDiscount: medData.saleDiscount,
            batchNo: medData.batchNo,
            lastUpdated: new Date().toISOString(),
        };
        setUserMedicineData(prev => ({...prev, [definitionId]: newUserData}));

        return definitionId;
    }, [globalMedicines, setGlobalMedicines, setUserMedicineData]);

    const updateMedicine = useCallback(async (med: Medicine) => {
        const { id, name, company, type, tags, ...userData } = med;
        
        const definitionUpdate: MedicineDefinition = { id, name, company, type, tags };
        setGlobalMedicines(prev => prev.map(m => m.id === id ? definitionUpdate : m));

        const userMedicineUpdate: UserMedicineData = { ...userData, lastUpdated: new Date().toISOString() };
        setUserMedicineData(prev => ({ ...prev, [id]: userMedicineUpdate }));
    }, [setGlobalMedicines, setUserMedicineData]);
    
    const deleteMedicine = useCallback(async (id: string) => {
        // NOTE: This only deletes the user's data (price, etc.), not the global name.
        // This prevents one user from deleting a medicine name for everyone.
        setUserMedicineData(prev => {
            const { [id]: _, ...rest } = prev;
            return rest;
        });
        addNotification("Removed medicine data from your personal inventory.", "info");
    }, [setUserMedicineData, addNotification]);
    
    const addMedicalStore = useCallback(async (storeData: Omit<MedicalStore, 'id'>) => {
        const newStore: MedicalStore = { ...storeData, id: crypto.randomUUID() };
        setMedicalStores(prev => [...prev, newStore]);
    }, [setMedicalStores]);
    
    const updateMedicalStore = useCallback(async (store: MedicalStore) => {
        setMedicalStores(prev => prev.map(s => s.id === store.id ? store : s));
    }, [setMedicalStores]);
    
    const deleteMedicalStore = useCallback(async (id: string) => {
        setMedicalStores(prev => prev.filter(s => s.id !== id));
    }, [setMedicalStores]);

    const addSupplier = useCallback(async (supplierData: Omit<Supplier, 'id'>) => {
        const newSupplier: Supplier = { ...supplierData, id: crypto.randomUUID() };
        setSuppliers(prev => [...prev, newSupplier]);
    }, [setSuppliers]);
    
    const updateSupplier = useCallback(async (supplier: Supplier) => {
        setSuppliers(prev => prev.map(s => s.id === supplier.id ? supplier : s));
    }, [setSuppliers]);
    
    const deleteSupplier = useCallback(async (supplier: Supplier) => {
        setSuppliers(prev => prev.filter(s => s.id !== supplier.id));
    }, [setSuppliers]);

    const finalizeBill = useCallback(async (billData: Omit<FinalizedBill, 'billNo' | 'date'>, isEditing: boolean, billNoToUse: number) => {
        if (isEditing) {
            const originalBill = finalizedBills.find(b => b.billNo === billNoToUse);
            const updatedBill: FinalizedBill = {
                ...billData,
                billNo: billNoToUse,
                date: originalBill?.date || new Date().toISOString(),
            };
            setFinalizedBills(prev => prev.map(b => b.billNo === billNoToUse ? updatedBill : b));
            return billNoToUse;
        } else {
            const newBill: FinalizedBill = {
                ...billData,
                billNo: billNoToUse,
                date: new Date().toISOString(),
            };
            setFinalizedBills(prev => [...prev, newBill]);
            return billNoToUse;
        }
    }, [finalizedBills, setFinalizedBills]);
    
    const deleteFinalizedBill = useCallback(async (billNo: number) => {
        setFinalizedBills(prev => prev.filter(b => b.billNo !== billNo));
        addNotification(`Bill #${billNo} deleted.`, 'info');
    }, [setFinalizedBills, addNotification]);
    
    const postPurchase = useCallback(async (purchaseData: Omit<FinalizedPurchase, 'purchaseId' | 'date'>, editingPurchaseId?: number | null) => {
        if (editingPurchaseId) { // --- UPDATE EXISTING PURCHASE ---
            setFinalizedPurchases(prev =>
                prev.map(p => {
                    if (p.purchaseId === editingPurchaseId) {
                        return {
                            ...purchaseData,
                            purchaseId: editingPurchaseId,
                            date: p.date, // Keep original date
                        };
                    }
                    return p;
                })
            );
            addNotification(`Purchase #${editingPurchaseId} updated successfully!`, 'success');
        } else { // --- CREATE NEW PURCHASE ---
            const maxId = finalizedPurchases.reduce((max, p) => Math.max(max, p.purchaseId), 0);
            const newPurchaseId = maxId + 1;

            const newPurchase: FinalizedPurchase = {
                ...purchaseData,
                purchaseId: newPurchaseId,
                date: new Date().toISOString(),
            };
            setFinalizedPurchases(prev => [...prev, newPurchase]);
            addNotification(`Purchase #${newPurchaseId} posted successfully!`, 'success');
        }

        // --- UPDATE MEDICINE PRICES (COMMON FOR BOTH CREATE AND UPDATE) ---
        setUserMedicineData(currentUserData => {
            const updatedUserData = { ...currentUserData };
            purchaseData.items.forEach(item => {
                updatedUserData[item.medicineId] = {
                    ...(updatedUserData[item.medicineId] || {} as UserMedicineData),
                    price: item.rate,
                    discount: item.discount, // This updates the PURCHASE discount
                    batchNo: item.batchNo,
                    lastUpdated: new Date().toISOString(),
                };
            });
            return updatedUserData;
        });
    }, [finalizedPurchases, setFinalizedPurchases, setUserMedicineData, addNotification]);

    const deleteFinalizedPurchase = useCallback(async (purchaseId: number) => {
        setFinalizedPurchases(prev => prev.filter(p => p.purchaseId !== purchaseId));
        addNotification(`Purchase #${purchaseId} deleted.`, 'info');
    }, [setFinalizedPurchases, addNotification]);

    const updateBillLayoutSettings = useCallback((newSettings: Partial<BillLayoutSettings>) => {
        setBillLayoutSettings(prev => ({ ...prev, ...newSettings }));
        addNotification("Bill layout settings updated.", "success");
    }, [setBillLayoutSettings, addNotification]);

    const updateSalesSettings = useCallback((newSettings: Partial<SalesSettings>) => {
        setSalesSettings(prev => ({ ...prev, ...newSettings }));
        addNotification("Sales settings updated.", "success");
    }, [setSalesSettings, addNotification]);

    // Data Management for Settings
    const exportData = useCallback(() => ({
        medicineDefinitions: globalMedicines,
        userMedicineData,
        medicalStores,
        suppliers,
        finalizedBills,
        finalizedPurchases,
        billLayoutSettings,
        salesSettings
    }), [globalMedicines, userMedicineData, medicalStores, suppliers, finalizedBills, finalizedPurchases, billLayoutSettings, salesSettings]);

    const importData = (data: any) => {
        if (data.medicineDefinitions) {
            // Merge global definitions to avoid overwriting data from other users
            setGlobalMedicines(currentGlobal => {
                const newDefs = [...currentGlobal];
                const existingIds = new Set(currentGlobal.map(d => d.id));
                data.medicineDefinitions.forEach((def: MedicineDefinition) => {
                    if (!existingIds.has(def.id)) {
                        newDefs.push(def);
                    }
                });
                return newDefs;
            });
        }
        if (data.userMedicineData) setUserMedicineData(data.userMedicineData);
        if (data.medicalStores) setMedicalStores(data.medicalStores);
        if (data.finalizedBills) setFinalizedBills(data.finalizedBills);
        if (data.suppliers) setSuppliers(data.suppliers);
        if (data.finalizedPurchases) setFinalizedPurchases(data.finalizedPurchases);
        if (data.billLayoutSettings) setBillLayoutSettings(data.billLayoutSettings);
        if (data.salesSettings) setSalesSettings(data.salesSettings);
    };

    const clearAllData = (includeShared = false) => {
        // Clear user-specific data
        const userKeys = Object.keys(localStorage).filter(key => key.startsWith(currentUser));
        userKeys.forEach(key => localStorage.removeItem(key));
        
        // Optionally clear shared data
        if (includeShared) {
            localStorage.removeItem('global_medicine_definitions');
            localStorage.removeItem('global_appInitialized');
        }

        window.location.reload();
    };

    const resetBillingSession = useCallback(() => {
        setCurrentBillingStoreID(null);
        setEditingBillNo(null);
        setCart([]);
    }, [setCart, setCurrentBillingStoreID, setEditingBillNo]);

    const startBillingForStore = useCallback((storeId: string) => {
        const store = medicalStores.find(s => s.id === storeId);
        if (store) {
            if(cart.length > 0 || currentBillingStoreID) {
                const previousStoreName = medicalStores.find(s => s.id === currentBillingStoreID)?.name || 'previous session';
                addNotification(`Discarded unfinished bill for ${previousStoreName}.`, 'warning');
            }
            resetBillingSession();
            setCurrentBillingStoreID(store.id);
            setEditingBillNo(null);
            setCart([]);
            setActiveView('create-bill');
            addNotification(`Billing started for ${store.name}.`, "success");
        }
    }, [medicalStores, addNotification, cart.length, currentBillingStoreID, resetBillingSession, setCart, setCurrentBillingStoreID, setEditingBillNo, setActiveView]);

    const resetPurchaseSession = useCallback(() => {
        setCurrentPurchaseSupplierID(null);
        setEditingPurchaseId(null);
        setPurchaseCart({});
        setPurchaseCartOrder([]);
    }, [setCurrentPurchaseSupplierID, setEditingPurchaseId, setPurchaseCart, setPurchaseCartOrder]);

    const startPurchaseForSupplier = useCallback((supplierId: string) => {
        const supplier = suppliers.find(s => s.id === supplierId);
        if (supplier) {
            if(purchaseCartOrder.length > 0 || currentPurchaseSupplierID) {
                const previousSupplierName = suppliers.find(s => s.id === currentPurchaseSupplierID)?.name || 'previous session';
                addNotification(`Discarded unfinished purchase for ${previousSupplierName}.`, 'warning');
            }
            resetPurchaseSession();
            setCurrentPurchaseSupplierID(supplier.id);
            setActiveView('purchase-entry');
            addNotification(`Purchase entry started for ${supplier.name}.`, "success");
        }
    }, [suppliers, addNotification, purchaseCartOrder.length, currentPurchaseSupplierID, resetPurchaseSession, setCurrentPurchaseSupplierID, setActiveView]);
    
    const startEditingPurchase = useCallback((purchase: FinalizedPurchase) => {
        if (purchaseCartOrder.length > 0 || currentPurchaseSupplierID) {
            if (!window.confirm("This will discard your current unfinished purchase. Are you sure?")) {
                return;
            }
            addNotification("Unfinished purchase discarded.", 'warning');
        }

        const newCart: Record<string, PurchaseRowData> = {};
        const newOrder: string[] = [];
        purchase.items.forEach(item => {
            newCart[item.medicineId] = {
                srch: '',
                quantity: item.quantity,
                rate: item.rate,
                discount: item.discount,
                batchNo: item.batchNo,
            };
            newOrder.push(item.medicineId);
        });

        setPurchaseCart(newCart);
        setPurchaseCartOrder(newOrder);
        setCurrentPurchaseSupplierID(purchase.supplierId);
        setEditingPurchaseId(purchase.purchaseId);
        setActiveView('purchase-entry');
        addNotification(`Editing Purchase #${purchase.purchaseId}.`, 'info');
    }, [addNotification, setActiveView, setPurchaseCart, setPurchaseCartOrder, setCurrentPurchaseSupplierID, setEditingPurchaseId, purchaseCartOrder, currentPurchaseSupplierID]);

    const viewPurchaseHistoryForSupplier = useCallback((supplierId: string) => {
        const supplier = suppliers.find(s => s.id === supplierId);
        if (supplier) {
            setCurrentViewingSupplierId(supplier.id);
            setActiveView('purchase-history');
            addNotification(`Viewing purchase history for ${supplier.name}.`, "info");
        }
    }, [suppliers, addNotification, setCurrentViewingSupplierId, setActiveView]);

    const viewBillsForStore = useCallback((storeId: string) => {
        const store = medicalStores.find(s => s.id === storeId);
        if (store) {
            setBillFilterStoreID(store.id);
            setActiveView('your-bills');
            addNotification(`Viewing bills for ${store.name}.`, "info");
        }
    }, [medicalStores, addNotification, setBillFilterStoreID, setActiveView]);
    
    const clearBillFilter = useCallback(() => {
        setBillFilterStoreID(null);
        addNotification('Bill filter cleared.', 'info');
    }, [setBillFilterStoreID, addNotification]);

    // Auto-cancel purchase editing when navigating away
    useEffect(() => {
        if (editingPurchaseId && activeView !== 'purchase-entry') {
            resetPurchaseSession();
            addNotification('Purchase editing has been cancelled.', 'info');
        }
    }, [activeView, editingPurchaseId, resetPurchaseSession, addNotification]);
    
    const handleContinueEditingBill = () => {
        setActiveSection('sales');
        setActiveView('create-bill');
        setIsResumeBillModalOpen(false);
    };

    const handleStartNewBill = () => {
        resetBillingSession();
        addNotification("Unfinished bill discarded.", 'warning');
        setActiveSection('sales');
        setActiveView('manage-stores');
        setIsResumeBillModalOpen(false);
    };
    
    const handleContinueEditingPurchase = () => {
        setActiveSection('purchase');
        setActiveView('purchase-entry');
        setIsResumePurchaseModalOpen(false);
    };

    const handleStartNewPurchase = () => {
        resetPurchaseSession();
        addNotification("Unfinished purchase discarded.", 'warning');
        setActiveSection('purchase');
        setActiveView('manage-suppliers');
        setIsResumePurchaseModalOpen(false);
    };

    const value = useMemo(() => ({
        medicines, medicalStores, finalizedBills, suppliers, finalizedPurchases, billLayoutSettings, salesSettings,
        addMedicine, updateMedicine, deleteMedicine,
        addMedicalStore, updateMedicalStore, deleteMedicalStore,
        addSupplier, updateSupplier, deleteSupplier,
        finalizeBill, deleteFinalizedBill, postPurchase, deleteFinalizedPurchase,
        updateBillLayoutSettings, updateSalesSettings,
        importData, clearAllData, exportData,
        cart, setCart,
        purchaseCart, setPurchaseCart,
        purchaseCartOrder, setPurchaseCartOrder,
        currentBillingStoreID, setCurrentBillingStoreID,
        currentPurchaseSupplierID, setCurrentPurchaseSupplierID,
        currentViewingSupplierId, setCurrentViewingSupplierId,
        editingBillNo, setEditingBillNo,
        editingPurchaseId, setEditingPurchaseId,
        billFilterStoreID,
        addNotification,
        activeView, setActiveView,
        activeSection, setActiveSection,
        navigateToSection,
        startBillingForStore, resetBillingSession,
        startPurchaseForSupplier, resetPurchaseSession, startEditingPurchase,
        viewPurchaseHistoryForSupplier, viewBillsForStore, clearBillFilter,
        transitionElement,
        focusedMed, setFocusedMed, hoveredMed, setHoveredMed,
        isCalculatorOpen, setIsCalculatorOpen
    }), [
        medicines, medicalStores, finalizedBills, suppliers, finalizedPurchases,
        cart, purchaseCart, purchaseCartOrder, currentBillingStoreID, currentPurchaseSupplierID,
        currentViewingSupplierId, editingBillNo, editingPurchaseId, activeView, activeSection, billFilterStoreID,
        transitionElement,
        focusedMed, hoveredMed, isCalculatorOpen, billLayoutSettings, salesSettings,
        addNotification, addMedicine, updateMedicine, deleteMedicine, addMedicalStore,
        updateMedicalStore, deleteMedicalStore, addSupplier, updateSupplier, deleteSupplier,
        finalizeBill, deleteFinalizedBill, postPurchase, deleteFinalizedPurchase, updateBillLayoutSettings, updateSalesSettings,
        importData, clearAllData, exportData, navigateToSection, startBillingForStore, resetBillingSession,
        startPurchaseForSupplier, resetPurchaseSession, startEditingPurchase,
        viewPurchaseHistoryForSupplier, viewBillsForStore, clearBillFilter,
        setCart, setPurchaseCart, setPurchaseCartOrder, setCurrentBillingStoreID,
        setCurrentPurchaseSupplierID, setCurrentViewingSupplierId, setEditingBillNo,
        setEditingPurchaseId, setBillFilterStoreID, setActiveView, setActiveSection,
        setFocusedMed, setHoveredMed, setIsCalculatorOpen
    ]);

    return (
        <AppContext.Provider value={value}>
            <div className="flex flex-col h-screen bg-slate-900">
                <Header onLogout={onLogout} isAnimatingIn={isAnimatingIn} />
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <MainContent isAnimatingIn={isAnimatingIn} />
                </div>
            </div>
             <ResumeBillModal
                isOpen={isResumeBillModalOpen}
                onContinue={handleContinueEditingBill}
                onStartNew={handleStartNewBill}
                onClose={() => setIsResumeBillModalOpen(false)}
            />
            <ResumePurchaseModal
                isOpen={isResumePurchaseModalOpen}
                onContinue={handleContinueEditingPurchase}
                onStartNew={handleStartNewPurchase}
                onClose={() => setIsResumePurchaseModalOpen(false)}
            />
            <Calculator 
                isOpen={isCalculatorOpen}
                onClose={() => setIsCalculatorOpen(false)}
            />
             {transitionElement && transitionTargetView && (
                <SectionTransition
                    element={transitionElement}
                    onAnimationEnd={handleTransitionEnd}
                >
                    {renderViewComponent(transitionTargetView)}
                </SectionTransition>
            )}
        </AppContext.Provider>
    );
};

const Notification: React.FC<NotificationState & { onClose: () => void, onExited: () => void }> = ({ message, type, isExiting, onClose, onExited }) => {
    const [title, description] = useMemo(() => {
        const parts = message.split('\n');
        return [parts[0], parts.length > 1 ? parts.slice(1).join('\n') : undefined];
    }, [message]);

    const config = useMemo(() => ({
        success: {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"></path>
                </svg>
            ),
            color: 'text-emerald-500'
        },
        error: {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'text-red-500'
        },
        warning: {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
            ),
            color: 'text-amber-500'
        },
        info: {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'text-violet-400'
        }
    }), []);

    const handleAnimationEnd = () => {
        if (isExiting) {
            onExited();
        }
    };

    return (
        <div
            onAnimationEnd={handleAnimationEnd}
            className={`cursor-default flex items-start justify-between w-full min-h-12 sm:min-h-14 rounded-lg bg-[#232531] px-[10px] py-2 sm:py-3 ${isExiting ? 'animate-notification-out' : 'animate-notification-in'}`}
        >
            <div className="flex gap-2 items-start min-w-0">
                <div className={`${config[type].color} bg-white/5 backdrop-blur-xl p-1 rounded-lg flex-shrink-0`}>
                    {config[type].icon}
                </div>
                <div className="min-w-0">
                    <p className="text-white font-medium">{title}</p>
                    {description && <p className="text-gray-500">{description}</p>}
                </div>
            </div>
            <button
                onClick={onClose}
                className="text-gray-600 hover:bg-white/5 p-1 rounded-md transition-colors ease-linear flex-shrink-0"
                aria-label="Close notification"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    );
};

const Header: React.FC<{ onLogout: () => void; isAnimatingIn: boolean; }> = ({ onLogout, isAnimatingIn }) => {
  const { 
      activeView, setActiveView, activeSection, navigateToSection, 
      focusedMed, hoveredMed, setIsCalculatorOpen, salesSettings, updateSalesSettings,
      billLayoutSettings, updateBillLayoutSettings
  } = useAppContext();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; }>({ visible: false, x: 0, y: 0 });
  const [isSettingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuTimeoutRef = useRef<number | null>(null);


  const activeItemDiscount = useMemo(() => {
    if (activeView !== 'create-bill') return null;
    const med = focusedMed || hoveredMed;
    return med ? med.saleDiscount : null;
  }, [focusedMed, hoveredMed, activeView]);
  
  const closeContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0 });
    setSettingsMenuOpen(false);
  }, []);

  useEffect(() => {
      if (!contextMenu.visible) return;
      const handleClickOutside = (e: MouseEvent) => {
          if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
              closeContextMenu();
          }
      };
      const handleKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && closeContextMenu();
      window.addEventListener('click', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
      return () => {
          window.removeEventListener('click', handleClickOutside);
          window.removeEventListener('keydown', handleKeyDown);
      };
  }, [contextMenu.visible, closeContextMenu]);
  
  const handleSettingsMenuEnter = useCallback(() => {
      if (settingsMenuTimeoutRef.current) {
          clearTimeout(settingsMenuTimeoutRef.current);
          settingsMenuTimeoutRef.current = null;
      }
      setSettingsMenuOpen(true);
  }, []);

  const handleSettingsMenuLeave = useCallback(() => {
      settingsMenuTimeoutRef.current = window.setTimeout(() => {
          setSettingsMenuOpen(false);
      }, 200);
  }, []);

  const handleLogoContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  };
  
  const handleCalculatorClick = () => {
      setIsCalculatorOpen(true);
      closeContextMenu();
  };

  const handleLogoClick = () => {
      if (activeSection === 'sales-only') {
          setActiveView('manage-stores');
      } else {
          navigateToSection('welcome');
      }
  };

  const handleSalesFocusClick = () => {
      if (activeSection !== 'sales-only') {
          navigateToSection('sales-only');
      } else {
          navigateToSection('welcome');
      }
      closeContextMenu();
  };

  const handleLogoutClick = () => {
      onLogout();
      closeContextMenu();
  }

  const sectionNavItems: Record<Exclude<AppSection, 'welcome'>, { id: AppView; name: string; icon: string }[]> = {
    sales: [
        { id: 'manage-stores', name: 'Stores', icon: 'storefront' },
        { id: 'create-bill', name: 'Create Bill', icon: 'receipt_long' },
        { id: 'your-bills', name: 'Bills', icon: 'history' },
    ],
    'sales-only': [
        { id: 'manage-stores', name: 'Stores', icon: 'storefront' },
        { id: 'create-bill', name: 'Create Bill', icon: 'receipt_long' },
        { id: 'your-bills', name: 'Bills', icon: 'history' },
    ],
    purchase: [
        { id: 'manage-suppliers', name: 'Suppliers', icon: 'local_shipping' },
        { id: 'your-purchases', name: 'Purchases', icon: 'receipt' },
        { id: 'inventory', name: 'Inventory', icon: 'inventory_2' },
    ],
    reports: [
        { id: 'settings', name: 'Overview', icon: 'pie_chart' },
        { id: 'profit-report', name: 'Profit', icon: 'paid' },
        { id: 'discount-sheet', name: 'Discounts', icon: 'sell' },
    ],
  };

  const navItems = activeSection !== 'welcome' ? sectionNavItems[activeSection] : [];

  const handleNavClick = (view: AppView) => {
    setActiveView(view);
    if(isMobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  const NavLinks: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => (
    <nav className={isMobile ? "flex flex-col space-y-1 p-3" : "hidden md:flex items-center gap-2"}>
      {navItems.map(item => {
        const isActive = activeView === item.id;
        const desktopClasses = `relative flex items-center gap-1.5 px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 ${
          isActive
            ? 'text-white bg-slate-700/50'
            : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
        }`;
        const mobileClasses = `flex items-center gap-2 px-4 py-3 rounded-lg font-semibold text-base transition-colors ${
           isActive ? 'bg-violet-600 text-white' : 'text-slate-200 hover:bg-slate-700'
        }`;
        
        return (
          <a
            key={item.id}
            href="#"
            onClick={(e) => { e.preventDefault(); handleNavClick(item.id); }}
            className={isMobile ? mobileClasses : desktopClasses}
          >
            <Icon name={item.icon} className={`text-violet-300 ${isMobile ? 'text-2xl' : 'text-xl'}`} />
            <span>{item.name}</span>
            {!isMobile && isActive && (
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 h-1 w-8 bg-violet-500 rounded-full"></div>
            )}
          </a>
        );
      })}
    </nav>
  );

  return (
    <>
      <header className={`h-16 bg-slate-800/70 backdrop-blur-md border-b border-slate-700/80 flex items-center px-4 md:px-6 sticky top-0 z-[102] no-print ${isAnimatingIn ? 'animate-header-in' : ''}`}>
        {/* Left: Logo */}
        <div className="flex-1 flex justify-start">
            <div className="flex items-center gap-3 cursor-pointer" onClick={handleLogoClick} onContextMenu={handleLogoContextMenu}>
                <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2 rounded-xl shadow-lg flex items-center justify-center ring-1 ring-white/10 ring-inset">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
                        <path d="M7 17V7L12 14L17 7V17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <div className="hidden md:block">
                    <h1 className="text-base font-bold text-white leading-tight">MUGHAL</h1>
                    <p className="text-xs text-violet-300 leading-tight">DISTRIBUTORS</p>
                </div>
            </div>
        </div>
        
        {/* Center: Nav */}
        {activeSection !== 'welcome' && (
             <div className="flex-shrink-0">
                <NavLinks />
            </div>
        )}

        {/* Right: Discount & Controls */}
        <div className="flex-1 flex justify-end items-center gap-4">
             {activeSection !== 'welcome' && (
                <>
                    {/* Discount Display */}
                    <div
                        className="hidden md:flex items-center transition-all duration-300 ease-out"
                        style={{
                            opacity: activeItemDiscount !== null ? 1 : 0,
                            transform: `scale(${activeItemDiscount !== null ? 1 : 0.95})`,
                            pointerEvents: activeItemDiscount !== null ? 'auto' : 'none',
                        }}
                    >
                        <div className="bg-slate-700 text-violet-300 font-bold text-sm px-3 py-1.5 rounded-lg shadow-md border border-slate-600 flex items-baseline whitespace-nowrap">
                            <span className="text-xs font-medium text-slate-400 mr-2">Item Sale Disc:</span>
                            {activeItemDiscount !== null ? `${activeItemDiscount}%` : ''}
                        </div>
                    </div>
                    
                    {/* Mobile Menu Toggle */}
                    <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-full hover:bg-slate-700/80 transition-colors focus:outline-none md:hidden">
                        <Icon name="menu" className="text-xl text-slate-300" />
                    </button>
                </>
             )}
        </div>
      </header>
      
      {/* Mobile Drawer */}
      {isMobileMenuOpen && activeSection !== 'welcome' && (
        <div className="fixed inset-0 z-[110] no-print" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-modal-bg" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative bg-slate-800 h-full w-72 max-w-[80vw] shadow-2xl flex flex-col animate-slide-in-left">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="font-bold text-white">Menu</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-full hover:bg-slate-700/80">
                <Icon name="close" className="text-xl" />
              </button>
            </div>
            <div className="overflow-y-auto custom-scrollbar">
              <NavLinks isMobile={true} />
            </div>
          </div>
        </div>
      )}
      
      {/* Context Menu */}
       {contextMenu.visible && (
            <div
                ref={contextMenuRef}
                style={{ top: contextMenu.y, left: contextMenu.x }}
                className="fixed bg-slate-800/70 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-2xl p-1.5 z-[200] w-56 animate-modal-content text-sm"
                onContextMenu={(e) => e.preventDefault()}
            >
                <ul className="space-y-1">
                    <li onClick={handleLogoutClick} className="flex items-center gap-3 px-3 py-1.5 text-slate-200 hover:bg-red-500 hover:text-white rounded-md cursor-pointer transition-colors">
                         <Icon name="logout" className="w-4 text-center" />
                         <span>Logout</span>
                    </li>
                    <li onClick={handleCalculatorClick} className="flex items-center gap-3 px-3 py-1.5 text-slate-200 hover:bg-violet-600 hover:text-white rounded-md cursor-pointer transition-colors">
                        <Icon name="calculate" className="w-4 text-center" />
                        <span>Calculator</span>
                    </li>
                    <li onClick={handleSalesFocusClick} className={`flex items-center gap-3 px-3 py-1.5 text-slate-200 rounded-md cursor-pointer transition-colors ${activeSection === 'sales-only' ? 'hover:bg-red-500 hover:text-white' : 'hover:bg-emerald-600 hover:text-white'}`}>
                        {activeSection === 'sales-only' ? (
                            <>
                                <Icon name="meeting_room" className="w-4 text-center" />
                                <span>Exit Focus Mode</span>
                            </>
                        ) : (
                            <>
                                <Icon name="adjust" className="w-4 text-center" />
                                <span>Sales Focus Mode</span>
                            </>
                        )}
                    </li>
                    <li 
                        onMouseEnter={handleSettingsMenuEnter}
                        onMouseLeave={handleSettingsMenuLeave}
                        className="relative flex justify-between items-center gap-3 px-3 py-1.5 text-slate-200 hover:bg-violet-600 hover:text-white rounded-md cursor-pointer transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Icon name="settings" className="w-4 text-center" />
                            <span>Settings</span>
                        </div>
                        <Icon name="chevron_right" className="!text-xs" />

                        {isSettingsMenuOpen && (activeSection === 'sales' || activeSection === 'sales-only') && (
                            <div
                                onMouseEnter={handleSettingsMenuEnter}
                                onMouseLeave={handleSettingsMenuLeave}
                                className="absolute left-full top-[-6px] ml-1 bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-2xl p-4 w-80"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h4 className="font-bold text-violet-300 mb-4 text-base">Sales Settings</h4>
                                <div className="space-y-5 text-sm">
                                    <div className="px-1">
                                        <Input
                                            label="Company Phone Number"
                                            value={billLayoutSettings.phoneNumber}
                                            onChange={(e) => updateBillLayoutSettings({ phoneNumber: e.target.value })}
                                            className="!p-1.5 !h-8 text-sm w-full"
                                            placeholder="Enter phone number"
                                        />
                                    </div>
                                     <ToggleSwitch
                                        label="Show Sales Tax Column"
                                        checked={salesSettings.showSalesTaxColumn}
                                        onChange={checked => updateSalesSettings({ showSalesTaxColumn: checked })}
                                    />
                                    <ToggleSwitch
                                        label="Show Batch No. Column"
                                        checked={salesSettings.showBatchNo}
                                        onChange={checked => updateSalesSettings({ showBatchNo: checked })}
                                    />
                                </div>
                            </div>
                        )}
                    </li>
                </ul>
            </div>
        )}
    </>
  );
};

const GlobalKeyboardShortcuts = () => {
    const { setActiveView, setActiveSection } = useAppContext();
    useEffect(() => {
        const handleGlobalKeyDown = (event: KeyboardEvent) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement || document.querySelector('[role="dialog"]')) return;
            
            const keyMap: { [key: string]: { section: AppSection; view: AppView } } = {
                'F1': { section: 'sales', view: 'manage-stores' },
                'F2': { section: 'sales', view: 'create-bill' },
                'F3': { section: 'sales', view: 'your-bills' },
                'F4': { section: 'purchase', view: 'inventory' },
                'F9': { section: 'purchase', view: 'manage-suppliers' }
            };

            if (keyMap[event.key]) {
                event.preventDefault();
                setActiveSection(keyMap[event.key].section);
                setActiveView(keyMap[event.key].view);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [setActiveView, setActiveSection]);
    return null;
};

const AuthenticatedApp: React.FC<{ 
    currentUser: string; 
    onLogout: () => void; 
    isAnimatingIn: boolean; 
    addNotification: (message: string, type?: NotificationType) => void; 
    activeView: AppView;
    setActiveView: React.Dispatch<React.SetStateAction<AppView>>;
    activeSection: AppSection;
    setActiveSection: React.Dispatch<React.SetStateAction<AppSection>>;
    navigateToSection: (section: AppSection, element?: HTMLElement) => void;
    transitionElement: HTMLElement | null;
    transitionTargetView: AppView | null;
    handleTransitionEnd: () => void;
    renderViewComponent: (view: AppView) => React.ReactNode;
}> = (props) => {
    return (
        <AppProvider {...props}>
            <GlobalKeyboardShortcuts />
        </AppProvider>
    );
};

const SectionTransition: React.FC<{
    element: HTMLElement;
    onAnimationEnd: () => void;
    children: React.ReactNode;
}> = ({ element, onAnimationEnd, children }) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [initialStyle, setInitialStyle] = useState<React.CSSProperties>({ opacity: 0 });

    useLayoutEffect(() => {
        if (!element) return;
        
        const headerHeight = 64; // Corresponds to h-16 in Tailwind (4rem)
        const firstRect = element.getBoundingClientRect();
        const styles = window.getComputedStyle(element);
        const bgColor = styles.backgroundColor;
        const borderRadius = styles.borderRadius;
        
        const screenW = window.innerWidth;
        const contentAreaHeight = window.innerHeight - headerHeight;
        
        // Calculate scale factors
        const scaleX = firstRect.width / screenW;
        const scaleY = firstRect.height / contentAreaHeight;
        
        // Calculate translation
        // Center of the card relative to the viewport
        const cardCenterX_viewport = firstRect.left + firstRect.width / 2;
        const cardCenterY_viewport = firstRect.top + firstRect.height / 2;
        
        // Center of the overlay relative to the viewport
        const overlayCenterX_viewport = screenW / 2;
        const overlayCenterY_viewport = headerHeight + (contentAreaHeight / 2);

        const transX = cardCenterX_viewport - overlayCenterX_viewport;
        const transY = cardCenterY_viewport - overlayCenterY_viewport;

        setInitialStyle({
            opacity: 1,
            backgroundColor: bgColor,
            transform: `translate(${transX}px, ${transY}px) scale(${scaleX}, ${scaleY})`,
            clipPath: `inset(0% round ${borderRadius})`,
        });

        const frameId = requestAnimationFrame(() => {
            setIsAnimating(true);
        });
        
        return () => cancelAnimationFrame(frameId);
    }, [element]);

    const finalStyle: React.CSSProperties = isAnimating ? {
        backgroundColor: '#0f172a', // slate-900
        transform: 'translate(0px, 0px) scale(1, 1)',
        clipPath: 'inset(0% round 0px)',
    } : {};
    
    return (
        <div
            ref={overlayRef}
            className="section-transition-overlay"
            style={{ ...initialStyle, ...finalStyle }}
            onTransitionEnd={onAnimationEnd}
        >
            <div className={`section-transition-content ${isAnimating ? 'is-visible' : ''}`}>
                {children}
            </div>
        </div>
    );
};

export default function App() {
    const [currentUser, setCurrentUser] = useLocalStorage<string | null>('currentUser', null);
    const [uiState, setUiState] = useState<'auth' | 'transitioning' | 'app'>(currentUser ? 'app' : 'auth');
    const [notifications, setNotifications] = useState<NotificationState[]>([]);
    
    const [activeSection, setActiveSection] = useLocalStorage<AppSection>('activeSection', 'welcome', currentUser || 'global');
    const [activeView, setActiveView] = useLocalStorage<AppView>('activeView', 'welcome', currentUser || 'global');
    
    const [transitionElement, setTransitionElement] = useState<HTMLElement | null>(null);
    const [transitionTargetView, setTransitionTargetView] = useState<AppView | null>(null);

    const startExitAnimation = useCallback((id: number) => {
        setNotifications(current =>
            current.map(n => n.id === id ? { ...n, isExiting: true } : n)
        );
    }, []);
    
    const removeNotification = useCallback((id: number) => {
        setNotifications(current => current.filter(n => n.id !== id));
    }, []);
    
    const addNotification = useCallback((message: string, type: NotificationType = 'info') => {
        const newNotification: NotificationState = { id: Date.now(), message, type };
        setNotifications(prev => [...prev, newNotification]);
        setTimeout(() => {
            startExitAnimation(newNotification.id);
        }, 5000);
    }, [startExitAnimation]);

    const handleLoginSuccess = (username: string) => {
        setCurrentUser(username);
        setUiState('transitioning');
        setTimeout(() => {
            setUiState('app');
        }, 700);
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setActiveSection('welcome');
        setActiveView('welcome');
        setUiState('auth');
    };
    
    const navigateToSection = useCallback((section: AppSection, element?: HTMLElement) => {
        if (element) {
            setTransitionElement(element);
            element.classList.add('is-transitioning');

            let targetView: AppView = 'welcome';
            switch (section) {
                case 'sales': case 'sales-only': targetView = 'manage-stores'; break;
                case 'purchase': targetView = 'manage-suppliers'; break;
                case 'reports': targetView = 'settings'; break;
                default: targetView = 'welcome'; break;
            }
            setTransitionTargetView(targetView);
        } else {
            setActiveSection(section);
             switch (section) {
                case 'sales': case 'sales-only': setActiveView('manage-stores'); break;
                case 'purchase': setActiveView('manage-suppliers'); break;
                case 'reports': setActiveView('settings'); break;
                default: setActiveView('welcome'); break;
            }
        }
    }, [setActiveSection, setActiveView]);

    const handleTransitionEnd = () => {
        if (transitionTargetView) {
            const sectionMapView: Record<AppSection, AppView[]> = {
                'welcome': ['welcome'],
                'sales': ['manage-stores', 'create-bill', 'your-bills'],
                'sales-only': ['manage-stores', 'create-bill', 'your-bills'],
                'purchase': ['manage-suppliers', 'purchase-entry', 'purchase-history', 'inventory', 'your-purchases'],
                'reports': ['settings', 'profit-report', 'discount-sheet']
            };
            const newSection = (Object.keys(sectionMapView) as AppSection[]).find(sec => 
                sectionMapView[sec].includes(transitionTargetView)
            ) || 'welcome';
            
            setActiveSection(newSection);
            setActiveView(transitionTargetView);
        }
        if (transitionElement) {
            transitionElement.classList.remove('is-transitioning');
        }
        setTransitionElement(null);
        setTransitionTargetView(null);
    };
    
    const renderViewComponent = (view: AppView): React.ReactNode => {
        switch (view) {
            case 'manage-stores': return <ManageStores />;
            case 'create-bill': return <CreateBill />;
            case 'your-bills': return <YourBills />;
            case 'inventory': return <Inventory />;
            case 'settings': return <Settings />;
            case 'manage-suppliers': return <ManageSuppliers />;
            case 'purchase-entry': return <Purchase />;
            case 'purchase-history': return <PurchaseHistory />;
            case 'your-purchases': return <YourPurchases />;
            case 'discount-sheet': return <DiscountSheet />;
            case 'profit-report': return <ProfitReport />;
            default: return null;
        }
    };

    const showAuth = uiState === 'auth' || uiState === 'transitioning';
    const showApp = uiState === 'app' || uiState === 'transitioning';
    const isAnimatingIn = uiState === 'transitioning';

    return (
        <>
            {showAuth && (
                <div className={`auth-container ${uiState === 'transitioning' ? 'animate-auth-exit' : ''}`}>
                    <Auth onLoginSuccess={handleLoginSuccess} addNotification={addNotification} />
                </div>
            )}
            {showApp && currentUser && (
                <AuthenticatedApp 
                    currentUser={currentUser} 
                    onLogout={handleLogout} 
                    isAnimatingIn={isAnimatingIn}
                    addNotification={addNotification}
                    activeSection={activeSection}
                    setActiveSection={setActiveSection}
                    activeView={activeView}
                    setActiveView={setActiveView}
                    navigateToSection={navigateToSection}
                    transitionElement={transitionElement}
                    transitionTargetView={transitionTargetView}
                    handleTransitionEnd={handleTransitionEnd}
                    renderViewComponent={renderViewComponent}
                />
            )}
            <div className="fixed bottom-6 right-6 z-[201] flex flex-col gap-2 w-60 sm:w-72 text-xs sm:text-sm">
                {notifications.map(n => 
                    <Notification 
                        key={n.id} 
                        {...n} 
                        onClose={() => startExitAnimation(n.id)} 
                        onExited={() => removeNotification(n.id)}
                    />
                )}
            </div>
        </>
    );
}

const MainContent: React.FC<{ isAnimatingIn: boolean; }> = ({ isAnimatingIn }) => {
    const { activeView, transitionElement } = useAppContext();

    const renderView = () => {
        switch (activeView) {
            case 'welcome': return <Welcome isExiting={!!transitionElement} />;
            case 'manage-stores': return <ManageStores />;
            case 'create-bill': return <CreateBill />;
            case 'your-bills': return <YourBills />;
            case 'inventory': return <Inventory />;
            case 'settings': return <Settings />;
            case 'manage-suppliers': return <ManageSuppliers />;
            case 'purchase-entry': return <Purchase />;
            case 'purchase-history': return <PurchaseHistory />;
            case 'your-purchases': return <YourPurchases />;
            case 'discount-sheet': return <DiscountSheet />;
            case 'profit-report': return <ProfitReport />;
            default: return <Welcome isExiting={!!transitionElement} />;
        }
    };
    return (
        <main className={`flex-1 ${isAnimatingIn ? 'animate-main-in' : ''}`}>
            {renderView()}
        </main>
    )
}
