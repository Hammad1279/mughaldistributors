

import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode, useMemo, useRef, useLayoutEffect } from 'react';
import { AppView, Medicine, MedicalStore, FinalizedBill, CartItem, NotificationState, NotificationType, Supplier, FinalizedPurchase, AppSection, PurchaseRowData, BillLayoutSettings, SalesSettings, MedicineDefinition, UserMedicineData, AppContextType, AppData } from './types';
import { getInitialAppData } from './constants';

// Firebase Imports
import { auth, db } from './firebase';

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

const AppContext = createContext<AppContextType | null>(null);
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppContext must be used within an AppProvider");
    return context;
};

// --- APP PROVIDER ---
const AppProvider: React.FC<{ 
    children: ReactNode; 
    appData: AppData;
    updateAppData: (updater: (currentData: AppData) => AppData) => void;
    addNotification: (message: string, type?: NotificationType) => void;
    isLoggedIn: boolean;
}> = ({ children, appData, updateAppData, addNotification, isLoggedIn }) => {
    const [activeSection, setActiveSection] = useState<AppSection>('welcome');
    const [activeView, setActiveView] = useState<AppView>('welcome');
    
    const [transitionElement, setTransitionElement] = useState<HTMLElement | null>(null);
    const [transitionTargetView, setTransitionTargetView] = useState<AppView | null>(null);
    
    const { 
        global_medicine_definitions: globalMedicines,
        user_medicine_data: userMedicineData
    } = appData;

    // --- Re-hydrating client-side state from loaded user data file ---
    const [cart, setCart] = useState<CartItem[]>(appData.cart);
    const [purchaseCart, setPurchaseCart] = useState<Record<string, PurchaseRowData>>(appData.purchaseCart);
    const [purchaseCartOrder, setPurchaseCartOrder] = useState<string[]>(appData.purchaseCartOrder);
    const [currentBillingStoreID, setCurrentBillingStoreID] = useState<string | null>(appData.currentBillingStoreID);
    const [currentPurchaseSupplierID, setCurrentPurchaseSupplierID] = useState<string | null>(appData.currentPurchaseSupplierID);
    const [currentViewingSupplierId, setCurrentViewingSupplierId] = useState<string | null>(appData.currentViewingSupplierId);
    const [editingBillNo, setEditingBillNo] = useState<number | null>(appData.editingBillNo);
    const [editingPurchaseId, setEditingPurchaseId] = useState<number | null>(appData.editingPurchaseId);
    const [billFilterStoreID, setBillFilterStoreID] = useState<string | null>(appData.billFilterStoreID);
    
    // --- Save client state back to the main data object before saving to file ---
    useEffect(() => { updateAppData(ud => ({ ...ud, cart })); }, [cart, updateAppData]);
    useEffect(() => { updateAppData(ud => ({ ...ud, purchaseCart })); }, [purchaseCart, updateAppData]);
    useEffect(() => { updateAppData(ud => ({ ...ud, purchaseCartOrder })); }, [purchaseCartOrder, updateAppData]);
    useEffect(() => { updateAppData(ud => ({ ...ud, currentBillingStoreID })); }, [currentBillingStoreID, updateAppData]);
    useEffect(() => { updateAppData(ud => ({ ...ud, currentPurchaseSupplierID })); }, [currentPurchaseSupplierID, updateAppData]);
    useEffect(() => { updateAppData(ud => ({ ...ud, currentViewingSupplierId })); }, [currentViewingSupplierId, updateAppData]);
    useEffect(() => { updateAppData(ud => ({ ...ud, editingBillNo })); }, [editingBillNo, updateAppData]);
    useEffect(() => { updateAppData(ud => ({ ...ud, editingPurchaseId })); }, [editingPurchaseId, updateAppData]);
    useEffect(() => { updateAppData(ud => ({ ...ud, billFilterStoreID })); }, [billFilterStoreID, updateAppData]);

    // --- Transient State (Not Persisted) ---
    const [focusedMed, setFocusedMed] = useState<Medicine | null>(null);
    const [hoveredMed, setHoveredMed] = useState<Medicine | null>(null);
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [isCapsLockOn, setIsCapsLockOn] = useState(true);

    useEffect(() => {
        const checkCapsLock = (event: KeyboardEvent | MouseEvent) => {
            if (typeof event.getModifierState === 'function') {
                setIsCapsLockOn(event.getModifierState("CapsLock"));
            }
        };
        window.addEventListener('keydown', checkCapsLock);
        window.addEventListener('keyup', checkCapsLock);
        window.addEventListener('mousedown', checkCapsLock);
        return () => {
            window.removeEventListener('keydown', checkCapsLock);
            window.removeEventListener('keyup', checkCapsLock);
            window.removeEventListener('mousedown', checkCapsLock);
        };
    }, []);

    const capsLockRequired = activeView === 'create-bill';
    const showCapsLockModal = capsLockRequired && !isCapsLockOn;
    
    const { 
        medicalStores, finalizedBills, suppliers, finalizedPurchases,
        billLayoutSettings, salesSettings
    } = appData;
    
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

    // Data manipulation functions
    const addMedicalStore = useCallback((store: Omit<MedicalStore, 'id'>) => {
        updateAppData(ad => ({ ...ad, medicalStores: [...ad.medicalStores, { ...store, id: crypto.randomUUID() }] }));
    }, [updateAppData]);

    const updateMedicalStore = useCallback((store: MedicalStore) => {
        updateAppData(ad => ({ ...ad, medicalStores: ad.medicalStores.map(s => s.id === store.id ? store : s) }));
    }, [updateAppData]);

    const deleteMedicalStore = useCallback((storeId: string) => {
        updateAppData(ad => ({ ...ad, medicalStores: ad.medicalStores.filter(s => s.id !== storeId) }));
    }, [updateAppData]);

    const addMedicine = useCallback((medData: Omit<Medicine, 'id' | 'lastUpdated'>): string => {
        const newId = crypto.randomUUID();
        const newDef: MedicineDefinition = { id: newId, name: medData.name, company: medData.company, type: medData.type, tags: medData.tags };
        const newUserData: UserMedicineData = { price: medData.price, discount: medData.discount, saleDiscount: medData.saleDiscount, batchNo: medData.batchNo, lastUpdated: new Date().toISOString() };
        
        updateAppData(ad => ({
            ...ad, 
            global_medicine_definitions: [...ad.global_medicine_definitions, newDef],
            user_medicine_data: {...ad.user_medicine_data, [newId]: newUserData }
        }));
        return newId;
    }, [updateAppData]);

    const updateMedicine = useCallback((med: Medicine) => {
        const { id, name, company, type, tags, ...userData } = med;
        const userUpdate: UserMedicineData = { ...userData, lastUpdated: new Date().toISOString() };
        updateAppData(ad => ({ ...ad, user_medicine_data: { ...ad.user_medicine_data, [id]: { ...(ad.user_medicine_data[id] || {}), ...userUpdate } }}));
    }, [updateAppData]);

    const deleteMedicine = useCallback((medId: string) => {
        addNotification("Deleting from global inventory is not supported in this version.", "info");
    }, [addNotification]);

    const finalizeBill = useCallback((billData: Omit<FinalizedBill, 'billNo' | 'date'>, isEditing: boolean, billNo: number): number | null => {
        const finalBill: FinalizedBill = { ...billData, billNo: billNo, date: new Date().toISOString() };
        updateAppData(ad => ({ ...ad, finalizedBills: isEditing ? ad.finalizedBills.map(b => b.billNo === billNo ? finalBill : b) : [...ad.finalizedBills, finalBill] }));
        return finalBill.billNo;
    }, [updateAppData]);

    const deleteFinalizedBill = useCallback((billNo: number) => {
        updateAppData(ad => ({ ...ad, finalizedBills: ad.finalizedBills.filter(b => b.billNo !== billNo) }));
    }, [updateAppData]);

    const addSupplier = useCallback((supplier: Omit<Supplier, 'id'>) => {
        updateAppData(ad => ({ ...ad, suppliers: [...ad.suppliers, { ...supplier, id: crypto.randomUUID() }] }));
    }, [updateAppData]);

    const updateSupplier = useCallback((supplier: Supplier) => {
        updateAppData(ad => ({ ...ad, suppliers: ad.suppliers.map(s => s.id === supplier.id ? supplier : s) }));
    }, [updateAppData]);

    const deleteSupplier = useCallback((supplierId: string) => {
        updateAppData(ad => ({ ...ad, suppliers: ad.suppliers.filter(s => s.id !== supplierId) }));
    }, [updateAppData]);
    
    const postPurchase = useCallback((purchaseData: Omit<FinalizedPurchase, 'purchaseId' | 'date'>, editingId: number | null) => {
        updateAppData(ad => {
            let finalizedPurchases;
            let purchaseId;
            if (editingId) {
                const updatedPurchase: FinalizedPurchase = { ...purchaseData, purchaseId: editingId, date: new Date().toISOString() };
                finalizedPurchases = ad.finalizedPurchases.map(p => p.purchaseId === editingId ? updatedPurchase : p);
                purchaseId = editingId;
                addNotification(`Purchase #${editingId} updated.`, 'success');
            } else {
                const maxId = ad.finalizedPurchases.reduce((max, p) => Math.max(max, p.purchaseId), 0);
                const newPurchase: FinalizedPurchase = { ...purchaseData, purchaseId: maxId + 1, date: new Date().toISOString() };
                finalizedPurchases = [...ad.finalizedPurchases, newPurchase];
                purchaseId = newPurchase.purchaseId;
                addNotification(`Purchase #${purchaseId} recorded.`, 'success');
            }

            const newUserMedicineData = { ...ad.user_medicine_data };
            purchaseData.items.forEach(item => {
                const currentMedData = newUserMedicineData[item.medicineId];
                const newMedData: UserMedicineData = { 
                    ...currentMedData, 
                    price: item.rate, 
                    discount: item.discount, 
                    batchNo: item.batchNo, 
                    lastUpdated: new Date().toISOString(),
                    saleDiscount: currentMedData?.saleDiscount ?? null,
                };
                newUserMedicineData[item.medicineId] = newMedData;
            });
            return { ...ad, finalizedPurchases, user_medicine_data: newUserMedicineData };
        });
    }, [updateAppData, addNotification]);

    const deleteFinalizedPurchase = useCallback((purchaseId: number) => {
        updateAppData(ad => ({ ...ad, finalizedPurchases: ad.finalizedPurchases.filter(p => p.purchaseId !== purchaseId) }));
        addNotification(`Purchase #${purchaseId} deleted.`, 'info');
    }, [updateAppData, addNotification]);

    const updateBillLayoutSettings = useCallback((newSettings: Partial<BillLayoutSettings>) => {
        updateAppData(ad => ({ ...ad, billLayoutSettings: { ...ad.billLayoutSettings, ...newSettings }}));
    }, [updateAppData]);

    const resetBillingSession = useCallback(() => {
        setCurrentBillingStoreID(null);
        setEditingBillNo(null);
        setCart([]);
    }, []);

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
    }, [medicalStores, addNotification, cart.length, currentBillingStoreID, resetBillingSession, setActiveView]);

    const resetPurchaseSession = useCallback(() => {
        setCurrentPurchaseSupplierID(null);
        setEditingPurchaseId(null);
        setPurchaseCart({});
        setPurchaseCartOrder([]);
    }, []);

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
    }, [suppliers, addNotification, purchaseCartOrder.length, currentPurchaseSupplierID, resetPurchaseSession, setActiveView]);
    
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
    }, [addNotification, setActiveView, purchaseCartOrder, currentPurchaseSupplierID]);
    
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
    }, []);

    const viewPurchaseHistoryForSupplier = useCallback((supplierId: string) => {
        const supplier = suppliers.find(s => s.id === supplierId);
        if (supplier) {
            setCurrentViewingSupplierId(supplier.id);
            setActiveView('purchase-history');
            addNotification(`Viewing purchase history for ${supplier.name}.`, "info");
        }
    }, [suppliers, addNotification, setActiveView]);

    const viewBillsForStore = useCallback((storeId: string) => {
        const store = medicalStores.find(s => s.id === storeId);
        if (store) {
            setBillFilterStoreID(store.id);
            setActiveView('your-bills');
            addNotification(`Viewing bills for ${store.name}.`, "info");
        }
    }, [medicalStores, addNotification, setActiveView]);
    
    const clearBillFilter = useCallback(() => {
        setBillFilterStoreID(null);
        addNotification('Bill filter cleared.', 'info');
    }, [addNotification]);
    
    const value: AppContextType = {
        medicines, medicalStores, finalizedBills, suppliers, finalizedPurchases, billLayoutSettings, salesSettings,
        updateAppData,
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
        isCalculatorOpen, setIsCalculatorOpen,
        addMedicalStore, updateMedicalStore, deleteMedicalStore,
        addMedicine, updateMedicine, deleteMedicine,
        finalizeBill, deleteFinalizedBill,
        addSupplier, updateSupplier, deleteSupplier,
        postPurchase, deleteFinalizedPurchase,
        updateBillLayoutSettings,
        downloadBackup: () => {}, // Provided by App component
        importData: () => {}, // Provided by App component
        clearAllData: () => {}, // Provided by App component
        logout: () => {}, // Provided by App component
        initiateImport: () => {}, // Provided by App component
    };

    return (
        <AppContext.Provider value={{...value, ...useContext(AppContext)}}>
            <div className="flex flex-col h-screen bg-slate-900">
                <Header isAnimatingIn={isLoggedIn} />
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <MainContent isAnimatingIn={isLoggedIn} />
                </div>
            </div>
            <Calculator 
                isOpen={isCalculatorOpen}
                onClose={() => setIsCalculatorOpen(false)}
            />
             <CapsLockModal isOpen={showCapsLockModal} onDismiss={() => {}} />
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
        success: { icon: 'check_circle', color: 'text-emerald-400' },
        error: { icon: 'error', color: 'text-red-500' },
        warning: { icon: 'warning', color: 'text-amber-500' },
        info: { icon: 'info', color: 'text-violet-400' }
    }), []);

    const handleAnimationEnd = () => {
        if (isExiting) onExited();
    };

    return (
        <div onAnimationEnd={handleAnimationEnd} className={`flex items-start w-full max-w-sm p-4 rounded-lg bg-slate-800 shadow-2xl ring-1 ring-slate-700 ${isExiting ? 'animate-notification-out' : 'animate-notification-in'}`}>
            <div className={`mr-3 text-2xl ${config[type].color}`}><Icon name={config[type].icon} /></div>
            <div className="flex-1">
                <p className="font-bold text-slate-100">{title}</p>
                {description && <p className="text-sm text-slate-300 mt-1">{description}</p>}
            </div>
            <button onClick={onClose} className="ml-3 text-slate-400 hover:text-white"><Icon name="close" /></button>
        </div>
    );
};

const Header: React.FC<{ isAnimatingIn: boolean; }> = ({ isAnimatingIn }) => {
  const { 
      activeView, setActiveView, activeSection, navigateToSection, 
      focusedMed, hoveredMed, setIsCalculatorOpen, salesSettings, billLayoutSettings,
      updateAppData, addNotification, updateBillLayoutSettings, downloadBackup, logout
  } = useAppContext();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; }>({ visible: false, x: 0, y: 0 });
  const [isSettingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuTimeoutRef = useRef<number | null>(null);

  const _updateBillLayoutSettings = useCallback((newSettings: Partial<BillLayoutSettings>) => {
        updateBillLayoutSettings(newSettings);
        addNotification("Bill layout settings updated.", "success");
    }, [updateBillLayoutSettings, addNotification]);

    const updateSalesSettings = useCallback((newSettings: Partial<SalesSettings>) => {
        updateAppData(ad => ({ ...ad, salesSettings: { ...ad.salesSettings, ...newSettings }}));
        addNotification("Sales settings updated.", "success");
    }, [updateAppData, addNotification]);

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
      logout();
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
                                <Icon name="sensors" className="w-4 text-center" />
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
        
        const scaleX = firstRect.width / screenW;
        const scaleY = firstRect.height / contentAreaHeight;
        
        const cardCenterX_viewport = firstRect.left + firstRect.width / 2;
        const cardCenterY_viewport = firstRect.top + firstRect.height / 2;
        
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
    const [appData, setAppData] = useState<AppData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notifications, setNotifications] = useState<NotificationState[]>([]);
    
    const [currentUser, setCurrentUser] = useState<any | null>(null);
    const [authExiting, setAuthExiting] = useState(false);

    const [importFileContent, setImportFileContent] = useState<string | null>(null);
    
    const appDataRef = useRef(appData);
    appDataRef.current = appData;
    const debounceTimeout = useRef<number | null>(null);

    // --- Authentication Listener ---
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setCurrentUser(user);
            if (!user) {
                // User is logged out
                setAppData(null);
                setAuthExiting(false);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- Firestore Data Listener ---
    useEffect(() => {
        if (currentUser?.uid) {
            setIsLoading(true);
            const docRef = db.collection('users').doc(currentUser.uid);
            const unsubscribe = docRef.onSnapshot((docSnap) => {
                if (docSnap.exists) {
                    setAppData(docSnap.data() as AppData);
                } else {
                    // This case handles a newly signed-up user where the doc might not exist yet
                    // The handleSignUp function now creates it, so this is a fallback.
                    console.warn("User document not found, creating a new one.");
                    docRef.set(getInitialAppData()).then(() => setAppData(getInitialAppData()));
                }
                setIsLoading(false);
            }, (error) => {
                console.error("Firestore snapshot error:", error);
                addNotification("Could not load data from cloud.", "error");
                setIsLoading(false);
            });
            return () => unsubscribe();
        }
    }, [currentUser?.uid]);

    // Debounced update function to save data to Firestore
    const updateAppData = useCallback((updater: (currentData: AppData) => AppData) => {
        if (!currentUser || !appDataRef.current) return;
    
        const newData = updater(appDataRef.current);
        setAppData(newData); // Optimistic UI update
    
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
    
        debounceTimeout.current = window.setTimeout(() => {
            if (currentUser.uid) {
                const userDocRef = db.collection('users').doc(currentUser.uid);
                userDocRef.set(newData).catch(err => {
                    console.error("Failed to save data:", err);
                    addNotification("Failed to sync data to cloud.", "error");
                });
            }
        }, 1500); // 1.5 second debounce
    }, [currentUser]);


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

    const downloadBackup = useCallback(() => {
        if (!appData || !currentUser) {
            addNotification("No data to create a backup from.", "warning");
            return;
        }
        try {
            const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mughal_os_backup_${currentUser.email}_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            addNotification("Backup data file saved.", "success");
        } catch (error) {
            console.error("Save failed:", error);
            addNotification("Failed to save backup file.", "error");
        }
    }, [appData, addNotification, currentUser]);
    
    const importData = useCallback(async (jsonData: string) => {
        if (!currentUser?.uid) {
            addNotification("No user is logged in to import data for.", "error");
            return;
        }
        try {
            let importedData = JSON.parse(jsonData);
            const defaults = getInitialAppData();
            
            const finalData = { ...defaults, ...importedData };
            
            const userDocRef = db.collection('users').doc(currentUser.uid);
            await userDocRef.set(finalData);
            
            addNotification("Data imported successfully! The app will now use the new data.", "success");
            // No reload needed due to onSnapshot
        } catch (error) {
            console.error("Import failed:", error);
            addNotification("Failed to import data. The file may be corrupted or in the wrong format.", "error");
        }
    }, [currentUser, addNotification]);
    
    const initiateImport = useCallback((file: File | null | undefined) => {
        if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setImportFileContent(event.target?.result as string);
            };
            reader.onerror = () => {
                addNotification("Failed to read file.", "error");
            };
            reader.readAsText(file);
        } else if (file) {
            addNotification("Invalid file type. Please provide a .json backup file.", "warning");
        }
    }, [addNotification]);

    // --- Global Drag & Drop Handler ---
    useEffect(() => {
        const preventDefaults = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
        };

        const handleDrop = (e: DragEvent) => {
            preventDefaults(e);
            if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                initiateImport(e.dataTransfer.files[0]);
            }
        };

        window.addEventListener('dragover', preventDefaults, false);
        window.addEventListener('drop', handleDrop, false);

        return () => {
            window.removeEventListener('dragover', preventDefaults, false);
            window.removeEventListener('drop', handleDrop, false);
        };
    }, [initiateImport]);

    const handleConfirmImport = () => {
        if (importFileContent) {
            importData(importFileContent);
        }
        setImportFileContent(null);
    };

    const clearAllData = useCallback(async () => {
        if (!currentUser?.uid) return;
        try {
            const userDocRef = db.collection('users').doc(currentUser.uid);
            await userDocRef.set(getInitialAppData());
            addNotification(`Data for user "${currentUser.email}" has been reset.`, "success");
        } catch (error) {
            addNotification(`Failed to clear data.`, "error");
        }
    }, [currentUser]);

    const handleLoginSuccess = () => {
        setAuthExiting(true);
    };
    
    const handleLogout = () => {
        auth.signOut();
    };

    const handleSignUp = async (email: string, password: string): Promise<boolean> => {
        try {
            const cred = await auth.createUserWithEmailAndPassword(email, password);
            const user = cred.user;
            // Create the initial Firestore document for the new user
            await db.collection("users").doc(user.uid).set(getInitialAppData());
            return true;
        } catch (error: any) {
            let message = "Sign up failed. Please try again.";
            if (error.code === 'auth/email-already-in-use') {
                message = `An account with email "${email}" already exists.`;
            } else if (error.code === 'auth/invalid-email') {
                message = 'Please use a valid email address.';
            } else if (error.code === 'auth/weak-password') {
                message = 'Password is too weak. Please use at least 6 characters.';
            }
            addNotification(message, 'error');
            return false;
        }
    };

    const isLoggedIn = !!currentUser;

    return (
        <>
            {/* The main application is always rendered in the background to preload components, but remains invisible until login. */}
            <div style={{ visibility: isLoggedIn ? 'visible' : 'hidden' }}>
                { (isLoading || !appData) && isLoggedIn ? (
                    <div className="fixed inset-0 flex items-center justify-center bg-slate-900"><p>Loading App Data...</p></div>
                ) : appData ? (
                    <AppContext.Provider value={{ downloadBackup, importData, initiateImport, clearAllData, logout: handleLogout } as any}>
                         <AppProvider
                            appData={appData}
                            updateAppData={updateAppData as any}
                            addNotification={addNotification}
                            isLoggedIn={isLoggedIn}
                        >
                            <GlobalKeyboardShortcuts />
                        </AppProvider>
                    </AppContext.Provider>
                ) : null }
            </div>

            {/* The authentication screen is only rendered when not logged in. */}
            {!isLoggedIn && !isLoading && (
                <div className={`auth-container ${authExiting ? 'animate-auth-exit' : ''}`}>
                    <Auth 
                        addNotification={addNotification} 
                        onLoginSuccess={handleLoginSuccess}
                        onSignUp={handleSignUp}
                    />
                </div>
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

            <Modal isOpen={!!importFileContent} onClose={() => setImportFileContent(null)} title="Confirm Data Import">
                <div className="text-center">
                    <Icon name="warning" className="text-5xl text-amber-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-100">Overwrite Existing Data?</h3>
                    <p className="text-slate-300 mt-2">
                        Importing this file will completely replace all of your current data, including bills, stores, suppliers, and inventory settings. 
                        This action cannot be undone.
                    </p>
                    <p className="text-slate-300 mt-4">
                        Are you sure you want to proceed?
                    </p>
                </div>
                <div className="flex justify-center gap-4 mt-8">
                    <Button variant="secondary" onClick={() => setImportFileContent(null)} className="w-32">Cancel</Button>
                    <Button variant="danger" onClick={handleConfirmImport} className="w-48" autoFocus>Yes, Import and Overwrite</Button>
                </div>
            </Modal>
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